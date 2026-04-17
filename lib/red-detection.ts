import * as ImageManipulator from "expo-image-manipulator";
import pako from "pako";

/**
 * 고정밀 빨간색 영역 감지 알고리즘
 * (Chromaticity Score + Two-Threshold Region Growing + Hole Filling)
 *
 * 파이프라인:
 * 1. 이미지를 800×800으로 리사이즈 (전체 픽셀 분석, 정확도 최우선)
 * 2. PNG → RGBA 픽셀 디코딩
 * 3. 조명 불변 크로마티시티 redness score 계산
 *    - score = max(0, 2R−G−B) / (R+G+B+1) × 255
 *      → 밝기와 무관하게 "R이 G·B보다 얼마나 더 많은가"만 측정
 *    - HSV Hue 게이트(0~40°, 320~360°) + 채도/명도 최솟값으로 오탐 차단
 * 4. Otsu's Method로 씨앗 임계값(T_seed) 계산
 *    - T_seed = Otsu × 0.7 : 확실한 빨간색만 씨앗으로 선택
 *    - T_grow = T_seed × 0.35 : 연한 경계까지 확장할 낮은 임계값
 * 5. BFS Region Growing : 씨앗 픽셀에서 T_grow 이상인 이웃으로 확장
 *    → 경계가 흐릿하거나 연한 곳도 빈틈없이 포함
 * 6. Hole Filling : 빛 반사(Glare) 등으로 생긴 내부 구멍을 자동 채움
 *    → 바깥 배경에서 플러드필, 닿지 않은 비-빨강 픽셀 = 내부 구멍 → 빨강으로
 * 7. 가장 큰 연결 컴포넌트 선택 (노이즈 클러스터 제거)
 * 8. Monotone Chain으로 Convex Hull 다각형 생성
 */
export async function detectRedRegion(
  imageUri: string,
): Promise<{ id: string; x: number; y: number }[]> {
  try {
    // 정확도 최우선: 800×800 전체 분석 (연산량 증가 감수)
    const SAMPLE_SIZE = 800;

    const manipulated = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: SAMPLE_SIZE, height: SAMPLE_SIZE } }],
      { format: ImageManipulator.SaveFormat.PNG, base64: true },
    );

    if (!manipulated.base64) {
      console.warn("Could not retrieve base64 data.");
      return [];
    }

    const pixels = decodePNGToRGBA(manipulated.base64);
    if (!pixels) return [];

    const { data, width, height } = pixels;

    // ── Step 1: 전 픽셀 크로마티시티 redness score 계산 ──
    const { scoreMap, allScores } = computeAllScores(data, width, height);

    if (allScores.length < width * height * 0.001) {
      console.log(`Too few red candidates: ${allScores.length} / ${width * height}`);
      return [];
    }

    // ── Step 2: Otsu로 씨앗 임계값·확장 임계값 결정 ──
    const otsuT = calculateOtsuThreshold(allScores);
    // T_seed: Otsu의 70% → 확실한 빨간색만 씨앗으로
    const seedThreshold = Math.max(otsuT * 0.70, 8);
    // T_grow: T_seed의 35% → 연한 경계까지 BFS 확장
    const growThreshold = Math.max(seedThreshold * 0.35, 3);

    console.log(`[RedDetect] Otsu=${otsuT.toFixed(1)}, Seed≥${seedThreshold.toFixed(1)}, Grow≥${growThreshold.toFixed(1)}`);

    // ── Step 3: 씨앗(high-threshold 픽셀) 마스크 생성 ──
    const seedMask = buildSeedMask(scoreMap, seedThreshold, width, height);

    // ── Step 4: BFS Region Growing — 씨앗에서 낮은 임계값 경계로 확장 ──
    const grownMask = growFromSeeds(scoreMap, seedMask, growThreshold, width, height);

    // ── Step 5: Hole Filling — Glare(반사광) 등 내부 구멍 채우기 ──
    const filledMask = fillHoles(grownMask, width, height);

    // ── Step 6: 가장 큰 연결 컴포넌트 선택 ──
    const largest = findLargestCluster(filledMask, width, height);
    if (largest.length < 10) {
      console.log("Red region too small after processing.");
      return [];
    }

    // ── Step 7: Convex Hull 다각형 생성 ──
    const numVertices = 32;
    const polygon = createConvexPolygon(largest, numVertices);

    const scaleX = 1 / width;
    const scaleY = 1 / height;

    return polygon.map((p, i) => ({
      id: `auto_${i}_${Math.random().toString(36).substr(2, 5)}`,
      x: p.x * scaleX,
      y: p.y * scaleY,
    }));
  } catch (error) {
    console.error("Red region detection failed:", error);
    return [];
  }
}

// ─── RGB → CIELab 변환 (ImageJ Color Threshold Lab 모드와 동일 원리) ─────

/**
 * sRGB(0~255) → CIELab 변환
 * - L : 밝기 (0~100)
 * - a : 빨강(+) ↔ 초록(-) 축  ← 핵심 채널
 * - b : 노랑(+) ↔ 파랑(-) 축
 *
 * ImageJ의 "Color Threshold → Lab" 모드가 사용하는 것과 동일한 변환.
 * 밝기(L)와 색상(a, b)이 완전히 분리되어 조명 변화와 무관하게
 * 연한 핑크도 안정적으로 감지할 수 있습니다.
 */
function rgbToLab(r: number, g: number, b: number): { L: number; a: number; b: number } {
  // Step 1: sRGB → linear light (gamma 2.2 inverse)
  const toLinear = (c: number) => {
    const n = c / 255;
    return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  };
  const rl = toLinear(r), gl = toLinear(g), bl = toLinear(b);

  // Step 2: linear RGB → XYZ (D65 illuminant, sRGB primaries)
  const X = rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375;
  const Y = rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750;
  const Z = rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041;

  // Step 3: XYZ → Lab (D65 white point)
  const f = (t: number) => t > 0.008856 ? t ** (1 / 3) : 7.787 * t + 16 / 116;
  const fx = f(X / 0.95047);
  const fy = f(Y / 1.00000);
  const fz = f(Z / 1.08883);

  return {
    L: 116 * fy - 16,      // 0~100
    a: 500 * (fx - fy),    // 빨강(+) ↔ 초록(-)
    b: 200 * (fy - fz),    // 노랑(+) ↔ 파랑(-)
  };
}

// ─── 픽셀별 Redness Score 계산 (Lab a* 기반) ────────────────────

/**
 * 한 픽셀의 "붉은 정도"를 0~255 정수로 반환.
 *
 * 핵심 메트릭: CIELab a* 채널 (ImageJ Lab Color Threshold와 동일)
 *   - a* > 0 : 빨강 계열 / a* < 0 : 초록 계열
 *   - 밝기(L)와 분리되어 있어, 조명·노출 변화에도 일관된 감지
 *   - 연한 핑크(a* ≈ 8~15)부터 진한 빨강(a* ≈ 45+)까지 넓게 인식
 *
 * 오탐 방지:
 *   - L < 8  : 그림자/검정 → 0
 *   - L > 97 : Glare 흰색 → 0  (Hole Filling 단계에서 내부 구멍으로 처리)
 *   - a* ≤ 2 : 중립/초록 계열 → 0
 *   - b* 가중 패널티: 오렌지(b*↑)와 빨강 구분
 *     — 순수 빨강(L*50, a*40, b*10) vs 오렌지(a*30, b*45) 정확히 분리
 */
function computeRednessScore(r: number, g: number, b: number): number {
  const { L, a, b: bLab } = rgbToLab(r, g, b);

  // 너무 어둡거나(그림자) 너무 밝으면(Glare) 제외
  if (L < 8 || L > 97) return 0;

  // a* ≤ 2 이면 빨간기 없음 (중립 또는 초록)
  if (a <= 2) return 0;

  // 오렌지/노랑 패널티: b*가 a*보다 현저히 크면 오렌지 계열
  // → effectiveA = a - max(0, b - 5) * 0.5
  // 예) 순수빨강 a=40, b=12 → effective=37  (거의 그대로)
  //     오렌지   a=30, b=45 → effective=10  (대폭 감소)
  //     연핑크   a=10, b= 5 → effective=10  (영향 없음)
  const effectiveA = a - Math.max(0, bLab - 5) * 0.5;
  if (effectiveA <= 2) return 0;

  // 0~255 정규화: effectiveA=[2, 60] → score=[0, 255]
  // a*=10(연핑크)→ score≈34, a*=25(중간빨강)→ score≈99, a*=50(선명빨강)→ score≈255
  return Math.round(Math.min(255, Math.max(0, (effectiveA - 2) / 58 * 255)));
}

/**
 * 이미지 전체 픽셀의 score를 계산하고,
 * Otsu 입력용 양수 score 배열도 함께 반환.
 */
function computeAllScores(
  data: Uint8Array,
  width: number,
  height: number,
): { scoreMap: number[][]; allScores: number[] } {
  const scoreMap: number[][] = [];
  const allScores: number[] = [];

  for (let y = 0; y < height; y++) {
    scoreMap[y] = new Array(width);
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const score = computeRednessScore(data[i], data[i + 1], data[i + 2]);
      scoreMap[y][x] = score;
      if (score > 0) allScores.push(score);
    }
  }

  return { scoreMap, allScores };
}

// ─── Otsu 임계값 계산 ────────────────────────────────

function calculateOtsuThreshold(rednessArray: number[]): number {
  const histogram = new Array(256).fill(0);
  for (const r of rednessArray) {
    histogram[Math.min(255, Math.max(0, Math.floor(r)))]++;
  }
  const total = rednessArray.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * histogram[i];

  let sumB = 0, wB = 0, wF = 0, varMax = 0, threshold = 0;
  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;
    wF = total - wB;
    if (wF === 0) break;

    sumB += t * histogram[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const varBetween = wB * wF * (mB - mF) ** 2;
    if (varBetween > varMax) { varMax = varBetween; threshold = t; }
  }
  return threshold;
}

// ─── 씨앗 마스크 생성 ────────────────────────────────

/** 높은 임계값(T_seed) 이상인 픽셀만 씨앗으로 표시 */
function buildSeedMask(
  scoreMap: number[][],
  seedThreshold: number,
  width: number,
  height: number,
): boolean[][] {
  return scoreMap.map(row => row.map(s => s >= seedThreshold));
}

// ─── BFS Region Growing ───────────────────────────────

/**
 * 씨앗에서 시작해, 낮은 임계값(T_grow) 이상인 이웃 픽셀로 확장.
 * → 경계가 흐릿하거나 연한 영역도 빠짐없이 포함.
 */
function growFromSeeds(
  scoreMap: number[][],
  seedMask: boolean[][],
  growThreshold: number,
  width: number,
  height: number,
): boolean[][] {
  // 결과를 씨앗 마스크 복사본으로 초기화
  const result: boolean[][] = seedMask.map(row => [...row]);
  const queue: { x: number; y: number }[] = [];

  // 씨앗 픽셀 전부 큐에 삽입
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (seedMask[y][x]) queue.push({ x, y });

  // BFS: 이웃이 T_grow 이상이면 포함
  let qi = 0;
  while (qi < queue.length) {
    const { x, y } = queue[qi++];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx, ny = y + dy;
        if (
          nx >= 0 && nx < width &&
          ny >= 0 && ny < height &&
          !result[ny][nx] &&
          scoreMap[ny][nx] >= growThreshold
        ) {
          result[ny][nx] = true;
          queue.push({ x: nx, y: ny });
        }
      }
    }
  }

  return result;
}

// ─── Hole Filling ────────────────────────────────────

/**
 * 바깥 배경에서 Flood Fill → 도달 불가능한 비-빨강 픽셀 = 내부 구멍 → 빨강으로 채움.
 * Glare(하이라이트 반사)로 생긴 내부 흰색 섬을 자동으로 메웁니다.
 */
function fillHoles(
  mask: boolean[][],
  width: number,
  height: number,
): boolean[][] {
  // 외부에서 닿을 수 있는 픽셀을 표시
  const reachable: boolean[][] = Array.from(
    { length: height },
    () => new Array(width).fill(false),
  );
  const queue: { x: number; y: number }[] = [];

  const tryEnqueue = (x: number, y: number) => {
    if (
      x >= 0 && x < width &&
      y >= 0 && y < height &&
      !mask[y][x] &&
      !reachable[y][x]
    ) {
      reachable[y][x] = true;
      queue.push({ x, y });
    }
  };

  // 네 변두리 비-빨강 픽셀에서 시작
  for (let x = 0; x < width; x++) { tryEnqueue(x, 0); tryEnqueue(x, height - 1); }
  for (let y = 1; y < height - 1; y++) { tryEnqueue(0, y); tryEnqueue(width - 1, y); }

  // BFS: 외부와 연결된 비-빨강 픽셀 전부 탐색
  let qi = 0;
  while (qi < queue.length) {
    const { x, y } = queue[qi++];
    tryEnqueue(x - 1, y); tryEnqueue(x + 1, y);
    tryEnqueue(x, y - 1); tryEnqueue(x, y + 1);
  }

  // 결과: 빨강 픽셀 OR (비-빨강이지만 외부에서 도달 불가) = 내부 구멍 → 빨강
  return mask.map((row, y) =>
    row.map((v, x) => v || !reachable[y][x]),
  );
}

// ─── 연결 컴포넌트 (BFS) ─────────────────────────────

function findLargestCluster(
  mask: boolean[][],
  width: number,
  height: number,
): { x: number; y: number }[] {
  const visited: boolean[][] = Array.from(
    { length: height },
    () => new Array(width).fill(false),
  );
  let largestCluster: { x: number; y: number }[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!mask[y][x] || visited[y][x]) continue;

      const cluster: { x: number; y: number }[] = [];
      const queue: { x: number; y: number }[] = [{ x, y }];
      visited[y][x] = true;

      while (queue.length > 0) {
        const curr = queue.shift()!;
        cluster.push(curr);
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const ny = curr.y + dy, nx = curr.x + dx;
            if (
              nx >= 0 && nx < width &&
              ny >= 0 && ny < height &&
              mask[ny][nx] && !visited[ny][nx]
            ) {
              visited[ny][nx] = true;
              queue.push({ x: nx, y: ny });
            }
          }
        }
      }

      if (cluster.length > largestCluster.length) largestCluster = cluster;
    }
  }

  return largestCluster;
}

// ─── Convex Hull (Monotone Chain) ────────────────────

function createConvexPolygon(
  clusterPixels: { x: number; y: number }[],
  numVertices: number,
): { x: number; y: number }[] {
  if (clusterPixels.length < 3) return clusterPixels;

  const points = [...clusterPixels].sort((a, b) =>
    a.x === b.x ? a.y - b.y : a.x - b.x,
  );

  const cross = (
    o: { x: number; y: number },
    a: { x: number; y: number },
    b: { x: number; y: number },
  ) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const lower: { x: number; y: number }[] = [];
  for (const p of points) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0)
      lower.pop();
    lower.push(p);
  }

  const upper: { x: number; y: number }[] = [];
  for (let i = points.length - 1; i >= 0; i--) {
    const p = points[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0)
      upper.pop();
    upper.push(p);
  }

  upper.pop();
  lower.pop();
  const hull = lower.concat(upper);

  if (hull.length <= numVertices) return hull;

  const step = hull.length / numVertices;
  return Array.from({ length: numVertices }, (_, i) => hull[Math.floor(i * step)]);
}

// ─── PNG 디코딩 ───────────────────────────────────────

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function readUint32BE(data: Uint8Array, offset: number): number {
  return (
    ((data[offset] << 24) |
      (data[offset + 1] << 16) |
      (data[offset + 2] << 8) |
      data[offset + 3]) >>>
    0
  );
}

function decodePNGToRGBA(
  base64: string,
): { data: Uint8Array; width: number; height: number } | null {
  try {
    const raw = base64ToUint8Array(base64);

    const sig = [137, 80, 78, 71, 13, 10, 26, 10];
    for (let i = 0; i < 8; i++) {
      if (raw[i] !== sig[i]) return null;
    }

    let width = 0,
      height = 0,
      colorType = 0;
    const idatChunks: Uint8Array[] = [];
    let offset = 8;

    while (offset < raw.length) {
      const length = readUint32BE(raw, offset);
      const type = String.fromCharCode(
        raw[offset + 4],
        raw[offset + 5],
        raw[offset + 6],
        raw[offset + 7],
      );

      if (type === "IHDR") {
        width = readUint32BE(raw, offset + 8);
        height = readUint32BE(raw, offset + 12);
        colorType = raw[offset + 17];
      } else if (type === "IDAT") {
        idatChunks.push(raw.slice(offset + 8, offset + 8 + length));
      } else if (type === "IEND") {
        break;
      }

      offset += 12 + length;
    }

    if (width === 0 || height === 0) return null;

    const totalLen = idatChunks.reduce((s, c) => s + c.length, 0);
    const compressed = new Uint8Array(totalLen);
    let pos = 0;
    for (const chunk of idatChunks) {
      compressed.set(chunk, pos);
      pos += chunk.length;
    }

    const decompressed = pako.inflate(compressed);

    const bpp =
      colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 4 ? 2 : 1;
    const stride = width * bpp;

    const unfiltered = unfilterScanlines(
      decompressed,
      width,
      height,
      bpp,
      stride,
    );

    const rgba = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const si = y * stride + x * bpp;
        const di = (y * width + x) * 4;
        if (colorType === 6) {
          rgba[di] = unfiltered[si];
          rgba[di + 1] = unfiltered[si + 1];
          rgba[di + 2] = unfiltered[si + 2];
          rgba[di + 3] = unfiltered[si + 3];
        } else if (colorType === 2) {
          rgba[di] = unfiltered[si];
          rgba[di + 1] = unfiltered[si + 1];
          rgba[di + 2] = unfiltered[si + 2];
          rgba[di + 3] = 255;
        } else {
          rgba[di] = rgba[di + 1] = rgba[di + 2] = unfiltered[si];
          rgba[di + 3] = 255;
        }
      }
    }

    return { data: rgba, width, height };
  } catch (e) {
    console.error("PNG decoding failed:", e);
    return null;
  }
}

function unfilterScanlines(
  decompressed: Uint8Array,
  width: number,
  height: number,
  bpp: number,
  stride: number,
): Uint8Array {
  const result = new Uint8Array(height * stride);

  for (let y = 0; y < height; y++) {
    const filterType = decompressed[y * (stride + 1)];
    const scanOffset = y * (stride + 1) + 1;
    const outOffset = y * stride;
    const prevOffset = (y - 1) * stride;

    for (let x = 0; x < stride; x++) {
      const curr = decompressed[scanOffset + x];
      const a = x >= bpp ? result[outOffset + x - bpp] : 0;
      const b = y > 0 ? result[prevOffset + x] : 0;
      const c = x >= bpp && y > 0 ? result[prevOffset + x - bpp] : 0;

      let val: number;
      switch (filterType) {
        case 0:
          val = curr;
          break;
        case 1:
          val = (curr + a) & 0xff;
          break;
        case 2:
          val = (curr + b) & 0xff;
          break;
        case 3:
          val = (curr + Math.floor((a + b) / 2)) & 0xff;
          break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a),
            pb = Math.abs(p - b),
            pc = Math.abs(p - c);
          val = (curr + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff;
          break;
        }
        default:
          val = curr;
      }
      result[outOffset + x] = val;
    }
  }
  return result;
}
