import * as ImageManipulator from "expo-image-manipulator";
import pako from "pako";

/**
 * 최적화된 빨간색 영역 감지 알고리즘 (Otsu + Convex Hull)
 *
 * 개선된 알고리즘:
 * 1. 이미지를 적절한 크기로 축소 (100x100)
 * 2. PNG → 픽셀 디코딩 (pako)
 * 3. RGB 데이터로부터 강력한 Redness 수치 도출: max(0, R - max(G, B))
 * 4. Otsu's Method를 사용해 주변 조명에 구애받지 않는 가변 임계값(Threshold) 자동 도출 및 마스킹
 * 5. Morphological 연산 (침식 -> 팽창)으로 노이즈 제거
 * 6. 연결 컴포넌트(BFS)로 주요 필름(가장 큰 클러스터) 영역 확정
 * 7. Monotone Chain 알고리즘으로 깔끔하고 완벽한 볼록 다각형(Convex Polygon) 생성
 */
export async function detectRedRegion(
  imageUri: string,
): Promise<{ id: string; x: number; y: number }[]> {
  try {
    // ── 해상도 대폭 상향: 정확도 최대로 끌어올리기 (연산량 감수) ──
    // 더 촘촘한 픽셀 지점을 분석하여, 급격한 Edge의 모서리 곡률까지 빈틈없이 잡아냅니다.
    const SAMPLE_SIZE = 400; 

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

    // ── Step 1: Adaptive Redness Oust Thresholding ──
    const redMask = createAdaptiveRedMask(data, width, height);

    // ── Step 2: Morphological 연산 (침식 -> 팽창) ──
    // 얇은 잡음을 제거하고 메인 영역만 남김
    const erodedMask = morphErode(redMask, width, height);
    const cleanMask = morphDilate(erodedMask, width, height);

    // ── Step 3: 가장 큰 연결 컴포넌트(주요 필름 영역) 선택 ──
    const largest = findLargestCluster(cleanMask, width, height);
    if (largest.length < 5) {
      console.log("Could not find a large enough red region.");
      return [];
    }

    // ── Step 4: 원형 가정이 아닌, 곡률이 변할 수 있는 실제 볼록 다각형성(Convex Hull) 생성 ──
    const numVertices = 32;
    // 급격하게 변하는 실제 마스킹 경계를 그대로 살리도록 Convex Polygon을 생성합니다.
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

// ─── Adaptive Otsu 기반 빨간색 마스크 생성 ──────────────────────

function calculateOtsuThreshold(rednessArray: number[]): number {
  const histogram = new Array(256).fill(0);
  for (const r of rednessArray) {
    histogram[Math.min(255, Math.max(0, Math.floor(r)))]++;
  }
  const total = rednessArray.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * histogram[i];

  let sumB = 0;
  let wB = 0;
  let wF = 0;
  let varMax = 0;
  let threshold = 0;

  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;
    wF = total - wB;
    if (wF === 0) break;

    sumB += t * histogram[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;

    const varBetween = wB * wF * (mB - mF) ** 2;
    if (varBetween > varMax) {
      varMax = varBetween;
      threshold = t;
    }
  }
  return threshold;
}

function createAdaptiveRedMask(
  data: Uint8Array,
  width: number,
  height: number,
): boolean[][] {
  const mask: boolean[][] = [];
  const rednessArr: number[] = [];
  const rednessMap: number[][] = [];

  for (let y = 0; y < height; y++) {
    rednessMap[y] = [];
    mask[y] = [];
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i],
        g = data[i + 1],
        b = data[i + 2];

      const redness = Math.max(0, r - Math.max(g, b));
      rednessMap[y][x] = redness;

      // 완전 노이즈 혹은 배경을 제외한 유의미한 빨간색 분포만 모음
      if (redness > 10) {
        rednessArr.push(redness);
      }
    }
  }

  // 붉은 영역이 거의 없다면 모두 실패처리
  if (rednessArr.length < width * height * 0.005) {
    return mask;
  }

  let threshold = calculateOtsuThreshold(rednessArr);
  // 알고리즘 정확도 강도를 최대로 끌어올립니다. 
  // 진짜 색상이 급격히 단절되는 엣지를 찾기 위해 원본 Otsu의 임계값을 거의 그대로(0.85배) 신뢰합니다.
  threshold = Math.max(threshold * 0.85, 20);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      mask[y][x] = rednessMap[y][x] >= threshold;
    }
  }

  return mask;
}

// ─── Morphological 연산 ──────────────────────────────

function morphErode(
  mask: boolean[][],
  width: number,
  height: number,
): boolean[][] {
  const result: boolean[][] = [];
  for (let y = 0; y < height; y++) {
    result[y] = [];
    for (let x = 0; x < width; x++) {
      if (!mask[y][x]) {
        result[y][x] = false;
        continue;
      }
      let allTrue = true;
      for (let dy = -1; dy <= 1 && allTrue; dy++) {
        for (let dx = -1; dx <= 1 && allTrue; dx++) {
          const ny = y + dy,
            nx = x + dx;
          if (
            ny < 0 ||
            ny >= height ||
            nx < 0 ||
            nx >= width ||
            !mask[ny][nx]
          ) {
            allTrue = false;
          }
        }
      }
      result[y][x] = allTrue;
    }
  }
  return result;
}

function morphDilate(
  mask: boolean[][],
  width: number,
  height: number,
): boolean[][] {
  const result: boolean[][] = [];
  for (let y = 0; y < height; y++) {
    result[y] = [];
    for (let x = 0; x < width; x++) {
      if (mask[y][x]) {
        result[y][x] = true;
        continue;
      }
      let anyTrue = false;
      for (let dy = -1; dy <= 1 && !anyTrue; dy++) {
        for (let dx = -1; dx <= 1 && !anyTrue; dx++) {
          const ny = y + dy,
            nx = x + dx;
          if (ny >= 0 && ny < height && nx >= 0 && nx < width && mask[ny][nx]) {
            anyTrue = true;
          }
        }
      }
      result[y][x] = anyTrue;
    }
  }
  return result;
}

// ─── 연결 컴포넌트 (Flood Fill / BFS) ─────────────────

function findLargestCluster(
  mask: boolean[][],
  width: number,
  height: number,
): { x: number; y: number }[] {
  const visited: boolean[][] = [];
  for (let y = 0; y < height; y++) {
    visited[y] = new Array(width).fill(false);
  }

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
            const ny = curr.y + dy,
              nx = curr.x + dx;
            if (
              nx >= 0 &&
              nx < width &&
              ny >= 0 &&
              ny < height &&
              mask[ny][nx] &&
              !visited[ny][nx]
            ) {
              visited[ny][nx] = true;
              queue.push({ x: nx, y: ny });
            }
          }
        }
      }

      if (cluster.length > largestCluster.length) {
        largestCluster = cluster;
      }
    }
  }

  return largestCluster;
}

// ─── 볼록 껍질 기반 다각형 생성 (Monotone Chain) ───────────────

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
  for (let i = 0; i < points.length; i++) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], points[i]) <= 0
    ) {
      lower.pop();
    }
    lower.push(points[i]);
  }

  const upper: { x: number; y: number }[] = [];
  for (let i = points.length - 1; i >= 0; i--) {
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], points[i]) <= 0
    ) {
      upper.pop();
    }
    upper.push(points[i]);
  }

  upper.pop();
  lower.pop();
  const hull = lower.concat(upper);

  if (hull.length <= numVertices) return hull;

  // 원하는 꼭짓점 개수에 가깝게 단순화 (Decimation)
  const step = hull.length / numVertices;
  const decimated: { x: number; y: number }[] = [];
  for (let i = 0; i < numVertices; i++) {
    decimated.push(hull[Math.floor(i * step)]);
  }

  return decimated;
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
