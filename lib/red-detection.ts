import * as ImageManipulator from "expo-image-manipulator";
import pako from "pako";

/**
 * 이미지에서 빨간색 영역을 적응적으로 감지합니다.
 *
 * 알고리즘:
 * 1. 이미지를 60x60으로 축소
 * 2. PNG → 픽셀 디코딩 (pako)
 * 3. 가장 "빨간" 픽셀을 찾아 기준 색상으로 설정
 * 4. 기준 색상과 유사한 픽셀을 마킹
 * 5. 연결된 컴포넌트(클러스터)로 분리하여 가장 큰 클러스터만 선택
 * 6. 클러스터의 중심/반지름으로 원형에 가까운 다각형 생성
 */
export async function detectRedRegion(
  imageUri: string,
  displayWidth: number,
  displayHeight: number,
): Promise<{ id: string; x: number; y: number }[]> {
  try {
    const SAMPLE_SIZE = 60;

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

    // ── Step 1: 가장 빨간 픽셀 찾기 ──
    let maxRedness = -Infinity;
    let refR = 0,
      refG = 0,
      refB = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i],
        g = data[i + 1],
        b = data[i + 2];
      const redness = r - Math.max(g, b);
      if (redness > maxRedness) {
        maxRedness = redness;
        refR = r;
        refG = g;
        refB = b;
      }
    }

    if (maxRedness < 20) {
      console.log("충분히 빨간 영역을 찾을 수 없습니다.");
      return [];
    }

    // ── Step 2: 기준 색상과 유사한 픽셀 마킹 ──
    const COLOR_THRESHOLD = 20;

    const mask: boolean[][] = [];
    for (let y = 0; y < height; y++) {
      mask[y] = [];
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const r = data[i],
          g = data[i + 1],
          b = data[i + 2];
        const dist = Math.sqrt(
          (r - refR) ** 2 + (g - refG) ** 2 + (b - refB) ** 2,
        );
        mask[y][x] = dist < COLOR_THRESHOLD;
      }
    }

    // ── Step 3: 연결 컴포넌트 분석 (Flood Fill) → 가장 큰 클러스터만 선택 ──
    const largest = findLargestCluster(mask, width, height);
    if (largest.length < 3) return [];

    // ── Step 4: 원형에 가까운 다각형 생성 ──
    // 클러스터의 중심과 평균 반지름을 계산하고,
    // 각 방향(angle)으로 가장 먼 경계 픽셀까지의 거리를 사용하여 다각형 생성
    const polygon = createCircularPolygon(largest, 12);

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

// ─── 연결 컴포넌트 (Flood Fill) ─────────────────────

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

      // BFS flood fill
      const cluster: { x: number; y: number }[] = [];
      const queue: { x: number; y: number }[] = [{ x, y }];
      visited[y][x] = true;

      while (queue.length > 0) {
        const curr = queue.shift()!;
        cluster.push(curr);

        // 4방향 인접 탐색
        const neighbors = [
          { x: curr.x - 1, y: curr.y },
          { x: curr.x + 1, y: curr.y },
          { x: curr.x, y: curr.y - 1 },
          { x: curr.x, y: curr.y + 1 },
        ];

        for (const n of neighbors) {
          if (
            n.x >= 0 &&
            n.x < width &&
            n.y >= 0 &&
            n.y < height &&
            mask[n.y][n.x] &&
            !visited[n.y][n.x]
          ) {
            visited[n.y][n.x] = true;
            queue.push(n);
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

// ─── 원형에 가까운 다각형 생성 ──────────────────────

function createCircularPolygon(
  clusterPixels: { x: number; y: number }[],
  numVertices: number,
): { x: number; y: number }[] {
  // 중심 계산
  let cx = 0,
    cy = 0;
  for (const p of clusterPixels) {
    cx += p.x;
    cy += p.y;
  }
  cx /= clusterPixels.length;
  cy /= clusterPixels.length;

  // 각 방향(angle)별로 중심에서 가장 먼 픽셀까지의 거리를 측정
  // → 원형에 가까운 자연스러운 형태를 만들면서도 실제 형태를 반영
  const angleStep = (2 * Math.PI) / numVertices;
  const vertices: { x: number; y: number }[] = [];

  for (let i = 0; i < numVertices; i++) {
    const angle = angleStep * i;

    // 이 각도 방향에서 가장 먼 점 찾기 (±angleStep/2 범위)
    let maxDist = 0;
    let bestX = cx + Math.cos(angle) * 5; // 기본값: 반지름 5
    let bestY = cy + Math.sin(angle) * 5;

    for (const p of clusterPixels) {
      const dx = p.x - cx;
      const dy = p.y - cy;
      const pAngle = Math.atan2(dy, dx);

      // 각도 차이 계산 (순환 고려)
      let angleDiff = Math.abs(pAngle - angle);
      if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

      // 이 섹터에 속하는 픽셀만 고려
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

  // 원형에 가깝도록 보정: 평균 반지름 계산 후,
  // 너무 튀는 점(평균의 1.5배 초과)은 평균 반지름으로 클램핑
  const distances = vertices.map((v) =>
    Math.sqrt((v.x - cx) ** 2 + (v.y - cy) ** 2),
  );
  const avgDist = distances.reduce((s, d) => s + d, 0) / distances.length;

  return vertices.map((v, i) => {
    const d = distances[i];
    if (d > avgDist * 1.4) {
      // 너무 먼 점은 평균 반지름 * 1.2로 클램핑
      const angle = Math.atan2(v.y - cy, v.x - cx);
      return {
        x: cx + Math.cos(angle) * avgDist * 1.2,
        y: cy + Math.sin(angle) * avgDist * 1.2,
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
