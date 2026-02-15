import * as ImageManipulator from "expo-image-manipulator";
import pako from "pako";

/**
 * ImageJ 스타일의 빨간색 영역 감지 알고리즘
 *
 * 개선된 알고리즘:
 * 1. 이미지를 적절한 크기로 축소 (100x100)
 * 2. PNG → 픽셀 디코딩 (pako)
 * 3. RGB → HSV 변환하여 색상(Hue) 기반으로 빨간 영역 1차 마스킹
 * 4. Sobel 그래디언트 기반 경계 강화 — 색상 경계가 뚜렷한 지점까지만 포함
 * 5. Morphological 연산 (침식 → 팽창)으로 노이즈 제거
 * 6. 연결 컴포넌트(BFS)로 가장 큰 클러스터 선택
 * 7. 클러스터의 Convex Hull로 다각형 생성
 */
export async function detectRedRegion(
  imageUri: string,
  displayWidth: number,
  displayHeight: number,
): Promise<{ id: string; x: number; y: number }[]> {
  try {
    const SAMPLE_SIZE = 100;

    const manipulated = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: SAMPLE_SIZE, height: SAMPLE_SIZE } }],
      { format: ImageManipulator.SaveFormat.PNG, base64: true },
    );

    if (!manipulated.base64) {
      console.warn("base64 데이터를 가져올 수 없습니다.");
      return [];
    }

    const pixels = decodePNGToRGBA(manipulated.base64);
    if (!pixels) return [];

    const { data, width, height } = pixels;

    // ── Step 1: RGB → HSV 변환 및 빨간색 마스크 생성 ──
    // ImageJ와 유사하게 HSV 색상 공간에서 빨간색을 검출
    // 빨간색의 Hue는 0° 근처 또는 360° 근처 (래핑)
    const hsvMask = createHSVRedMask(data, width, height);

    // ── Step 2: Sobel 그래디언트로 경계 강화 ──
    // 색상 경계가 뚜렷한 지점을 검출하여 마스크 경계를 정밀하게 잘라냄
    const edgeRefinedMask = refineWithGradient(data, width, height, hsvMask);

    // ── Step 3: Morphological 연산 (침식 → 팽창) ──
    // 작은 노이즈 제거 및 매끄러운 경계 생성
    const erodedMask = morphErode(edgeRefinedMask, width, height);
    const cleanMask = morphDilate(erodedMask, width, height);

    // ── Step 4: 가장 큰 연결 컴포넌트 선택 ──
    const largest = findLargestCluster(cleanMask, width, height);
    if (largest.length < 5) {
      console.log("충분히 큰 빨간 영역을 찾을 수 없습니다.");
      return [];
    }

    // ── Step 5: 경계 점들로 다각형 생성 ──
    // 클러스터의 외곽 경계(contour)만 추출하여 다각형 꼭짓점 생성
    const polygon = createBoundaryPolygon(
      largest,
      cleanMask,
      width,
      height,
      16,
    );

    const scaleX = displayWidth / width;
    const scaleY = displayHeight / height;

    return polygon.map((p, i) => ({
      id: `auto_${i}_${Math.random().toString(36).substr(2, 5)}`,
      x: p.x * scaleX,
      y: p.y * scaleY,
    }));
  } catch (error) {
    console.error("빨간 영역 감지 실패:", error);
    return [];
  }
}

// ─── RGB → HSV 변환 ──────────────────────────────────

function rgbToHsv(
  r: number,
  g: number,
  b: number,
): { h: number; s: number; v: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) {
      h = ((g - b) / delta) % 6;
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else {
      h = (r - g) / delta + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : delta / max;
  const v = max;

  return { h, s, v };
}

// ─── HSV 기반 빨간색 마스크 생성 ──────────────────────

function createHSVRedMask(
  data: Uint8Array,
  width: number,
  height: number,
): boolean[][] {
  const mask: boolean[][] = [];

  // 1단계: 모든 픽셀의 HSV 값으로 빨간 후보 마스킹
  // 빨간색: H < 15° 또는 H > 340°, S > 0.2, V > 0.15
  const candidates: { h: number; s: number; v: number; idx: number }[] = [];

  for (let y = 0; y < height; y++) {
    mask[y] = [];
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i],
        g = data[i + 1],
        b = data[i + 2];
      const hsv = rgbToHsv(r, g, b);

      // ImageJ 스타일: 빨간 범위에 있고, 충분한 채도와 밝기
      const isRedHue = hsv.h < 20 || hsv.h > 335;
      const hasSaturation = hsv.s > 0.2;
      const hasBrightness = hsv.v > 0.15;

      // 추가 조건: R 채널이 G, B보다 확실히 높을 것
      const rDominant = r > g * 1.2 && r > b * 1.2;

      mask[y][x] = isRedHue && hasSaturation && hasBrightness && rDominant;

      if (mask[y][x]) {
        candidates.push({ ...hsv, idx: y * width + x });
      }
    }
  }

  // 2단계: 적이성(adaptiveness) — 빨간 후보가 너무 적으면 임계값 완화
  if (candidates.length < width * height * 0.005) {
    // 전체의 0.5% 미만이면 기준 완화
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (mask[y][x]) continue;
        const i = (y * width + x) * 4;
        const r = data[i],
          g = data[i + 1],
          b = data[i + 2];
        const hsv = rgbToHsv(r, g, b);

        const isRedHue = hsv.h < 30 || hsv.h > 320;
        const hasSaturation = hsv.s > 0.15;
        const hasBrightness = hsv.v > 0.1;
        const rDominant = r > g && r > b;

        mask[y][x] = isRedHue && hasSaturation && hasBrightness && rDominant;
      }
    }
  }

  return mask;
}

// ─── Sobel 그래디언트 기반 경계 정밀화 ──────────────────

function refineWithGradient(
  data: Uint8Array,
  width: number,
  height: number,
  mask: boolean[][],
): boolean[][] {
  // Sobel 커널로 색상 그래디언트 크기 계산
  // 그래디언트가 강한 곳 = 색상 경계 → 마스크 경계를 여기까지만 허용
  const gradient: number[][] = [];

  for (let y = 0; y < height; y++) {
    gradient[y] = [];
    for (let x = 0; x < width; x++) {
      if (y === 0 || y === height - 1 || x === 0 || x === width - 1) {
        gradient[y][x] = 0;
        continue;
      }

      // 각 픽셀 주변의 R 채도 차이를 사용 (색상 경계 감지)
      // Sobel X
      const gxR =
        -getR(data, width, x - 1, y - 1) +
        getR(data, width, x + 1, y - 1) +
        -2 * getR(data, width, x - 1, y) +
        2 * getR(data, width, x + 1, y) +
        -getR(data, width, x - 1, y + 1) +
        getR(data, width, x + 1, y + 1);

      // Sobel Y
      const gyR =
        -getR(data, width, x - 1, y - 1) +
        -2 * getR(data, width, x, y - 1) +
        -getR(data, width, x + 1, y - 1) +
        getR(data, width, x - 1, y + 1) +
        2 * getR(data, width, x, y + 1) +
        getR(data, width, x + 1, y + 1);

      gradient[y][x] = Math.sqrt(gxR * gxR + gyR * gyR);
    }
  }

  // 그래디언트 임계값: 경계 내부의 픽셀만 유지
  // 마스크 경계 부근에서 그래디언트가 높은 곳을 경계로 사용
  const refinedMask: boolean[][] = [];
  const GRADIENT_THRESHOLD = 30; // 뚜렷한 색상 변화의 기준

  for (let y = 0; y < height; y++) {
    refinedMask[y] = [];
    for (let x = 0; x < width; x++) {
      if (!mask[y][x]) {
        refinedMask[y][x] = false;
        continue;
      }

      // 해당 점이 마스크 내부인데, 근처(3x3)에 마스크 외부가 있으면 경계 근처
      let nearEdge = false;
      for (let dy = -1; dy <= 1 && !nearEdge; dy++) {
        for (let dx = -1; dx <= 1 && !nearEdge; dx++) {
          const ny = y + dy,
            nx = x + dx;
          if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
            if (!mask[ny][nx]) nearEdge = true;
          }
        }
      }

      if (nearEdge) {
        // 경계 근처 픽셀: 그래디언트가 충분하면 유지 (뚜렷한 경계)
        // 그래디언트가 약하면 제거 (점진적 변화 = 경계 아님)
        refinedMask[y][x] = gradient[y][x] >= GRADIENT_THRESHOLD;
      } else {
        // 내부 픽셀: 유지
        refinedMask[y][x] = true;
      }
    }
  }

  return refinedMask;
}

function getR(data: Uint8Array, width: number, x: number, y: number): number {
  return data[(y * width + x) * 4]; // R channel
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
      // 3x3 커널: 모든 이웃이 true여야 유지
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
      // 3x3 커널: 하나라도 이웃이 true면 true
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

        // 8방향 인접 탐색 (대각선 포함)
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

// ─── 경계 기반 다각형 생성 ──────────────────────────────

function createBoundaryPolygon(
  clusterPixels: { x: number; y: number }[],
  mask: boolean[][],
  width: number,
  height: number,
  numVertices: number,
): { x: number; y: number }[] {
  // 클러스터 내의 경계 픽셀만 추출
  // (경계 = 4방향 중 하나라도 마스크 외부인 픽셀)
  const boundaryPixels: { x: number; y: number }[] = [];
  const pixelSet = new Set(clusterPixels.map((p) => `${p.x},${p.y}`));

  for (const p of clusterPixels) {
    const neighbors = [
      { x: p.x - 1, y: p.y },
      { x: p.x + 1, y: p.y },
      { x: p.x, y: p.y - 1 },
      { x: p.x, y: p.y + 1 },
    ];

    for (const n of neighbors) {
      if (
        n.x < 0 ||
        n.x >= width ||
        n.y < 0 ||
        n.y >= height ||
        !mask[n.y]?.[n.x]
      ) {
        boundaryPixels.push(p);
        break;
      }
    }
  }

  if (boundaryPixels.length < 3) {
    return clusterPixels.slice(0, numVertices);
  }

  // 중심 계산
  let cx = 0,
    cy = 0;
  for (const p of clusterPixels) {
    cx += p.x;
    cy += p.y;
  }
  cx /= clusterPixels.length;
  cy /= clusterPixels.length;

  // 각도별 섹터에서 가장 먼 경계 픽셀을 선택하여 다각형 꼭짓점 생성
  const angleStep = (2 * Math.PI) / numVertices;
  const vertices: { x: number; y: number }[] = [];

  for (let i = 0; i < numVertices; i++) {
    const angle = angleStep * i;

    let maxDist = 0;
    let bestX = cx + Math.cos(angle) * 3;
    let bestY = cy + Math.sin(angle) * 3;

    for (const p of boundaryPixels) {
      const dx = p.x - cx;
      const dy = p.y - cy;
      const pAngle = Math.atan2(dy, dx);

      let angleDiff = Math.abs(pAngle - angle);
      if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

      if (angleDiff <= angleStep / 2) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > maxDist) {
          maxDist = dist;
          bestX = p.x;
          bestY = p.y;
        }
      }
    }

    vertices.push({ x: bestX, y: bestY });
  }

  // 극단적 이상치 보정 (평균 반지름의 1.8배 초과 시 클램핑)
  const distances = vertices.map((v) =>
    Math.sqrt((v.x - cx) ** 2 + (v.y - cy) ** 2),
  );
  const avgDist = distances.reduce((s, d) => s + d, 0) / distances.length;

  return vertices.map((v, i) => {
    const d = distances[i];
    if (d > avgDist * 1.8) {
      const angle = Math.atan2(v.y - cy, v.x - cx);
      return {
        x: cx + Math.cos(angle) * avgDist * 1.3,
        y: cy + Math.sin(angle) * avgDist * 1.3,
      };
    }
    return v;
  });
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
    console.error("PNG 디코딩 실패:", e);
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
