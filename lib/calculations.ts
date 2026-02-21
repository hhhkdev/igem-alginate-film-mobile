/**
 * CuSO₄ 중금속 농도 계산 모듈
 *
 * 공식: Area increase (%) = a(C)T² + b(C)T + c(C)
 *
 * CuSO₄ 계수:
 *   a(C) = 35190·ln(C) − 96479
 *   b(C) = 2037.8·ln(C) + 5645.6
 *   c(C) = −31.43·ln(C) − 86.72
 *
 * 여기서:
 *   C = 농도 (%)
 *   T = 필름 두께 (mm) — 상수로 취급
 *   Area increase (%) = (반응 면적 / 원래 필름 면적) × 100
 */

// ─── 상수 ────────────────────────────────────────────

/** 필름 두께 (mm) — 일정하다고 가정 */
const FILM_THICKNESS_MM = 1.0;

/** CuSO₄ 계수 */
const CUSO4 = {
  a: { coeff: 35190, constant: -96479 }, // a(C) = 35190·ln(C) − 96479
  b: { coeff: 2037.8, constant: 5645.6 }, // b(C) = 2037.8·ln(C) + 5645.6
  c: { coeff: -31.43, constant: -86.72 }, // c(C) = −31.43·ln(C) − 86.72
};

// ─── 핵심 계산 함수 ──────────────────────────────────

/**
 * 면적 증가율(%)과 필름 두께(T)로부터 CuSO₄ 농도(C, %)를 역산합니다.
 *
 * 공식 전개:
 *   AreaInc = (35190·ln(C) − 96479)·T² + (2037.8·ln(C) + 5645.6)·T + (−31.43·ln(C) − 86.72)
 *   AreaInc = ln(C)·(35190·T² + 2037.8·T − 31.43) + (−96479·T² + 5645.6·T − 86.72)
 *
 *   ln(C) = (AreaInc − (−96479·T² + 5645.6·T − 86.72)) / (35190·T² + 2037.8·T − 31.43)
 *   ln(C) = (AreaInc + 96479·T² − 5645.6·T + 86.72) / (35190·T² + 2037.8·T − 31.43)
 *   C = e^(ln(C))
 */
export function solveConcentration(
  areaIncreasePercent: number,
  T: number = FILM_THICKNESS_MM,
): number {
  const { a, b, c } = CUSO4;

  // 분자: AreaInc − (상수항들의 합)
  const constantSum = a.constant * T * T + b.constant * T + c.constant;
  const numerator = areaIncreasePercent - constantSum;

  // 분모: ln(C) 계수들의 합
  const denominator = a.coeff * T * T + b.coeff * T + c.coeff;

  // 0으로 나누기 방지
  if (Math.abs(denominator) < 1e-10) {
    return 0;
  }

  const lnC = numerator / denominator;
  const C = Math.exp(lnC);

  // 농도는 양수여야 하고, 비현실적으로 높은 값은 클램핑
  if (C <= 0 || !isFinite(C)) return 0;
  if (C > 100) return 100; // 최대 100%

  return C;
}

// ─── 통합 분석 함수 ──────────────────────────────────

export interface AnalysisInput {
  /** 빨간 반응 영역 면적 (mm²) */
  redAreaMm2: number;
  /** 원래 필름 지름 (mm) */
  filmDiameterMm: number;
  /** 필름 두께 (mm) — 기본값 사용 가능 */
  filmThicknessMm?: number;
}

export interface AnalysisResult {
  /** 면적 증가율 (%) */
  areaIncreasePercent: number;
  /** 추정 CuSO₄ 농도 (%) */
  concentrationPercent: number;
  /** 원래 필름 면적 (mm²) */
  filmAreaMm2: number;
  /** 반응 면적 (mm²) */
  redAreaMm2: number;
  /** 검출 여부 */
  isDetected: boolean;
  /** 상태 메시지 */
  message: string;
}

/**
 * 주어진 반응 면적과 필름 정보로 CuSO₄ 농도를 계산합니다.
 */
export function analyzeConcentration(input: AnalysisInput): AnalysisResult {
  const {
    redAreaMm2,
    filmDiameterMm,
    filmThicknessMm = FILM_THICKNESS_MM,
  } = input;

  // 원래 필름 면적 (원형)
  const filmRadius = filmDiameterMm / 2;
  const filmAreaMm2 = Math.PI * filmRadius * filmRadius;

  // 면적 증가율 (%)
  // 반응 면적이 필름 면적 대비 얼마나 되는지
  const areaIncreasePercent =
    filmAreaMm2 > 0 ? (redAreaMm2 / filmAreaMm2) * 100 : 0;

  // CuSO₄ 농도 역산
  const concentrationPercent = solveConcentration(
    areaIncreasePercent,
    filmThicknessMm,
  );

  // 검출 판정 (농도 > 0.001% 이상이면 검출)
  const isDetected = concentrationPercent > 0.001;

  return {
    areaIncreasePercent,
    concentrationPercent,
    filmAreaMm2,
    redAreaMm2,
    isDetected,
    message: isDetected
      ? `CuSO₄ Detected: ${concentrationPercent.toFixed(4)}%`
      : "Not Detected",
  };
}

// ─── 레거시 호환 함수 (기존 코드 호환) ──────────────

/**
 * @deprecated analyzeConcentration() 사용을 권장합니다.
 */
export function analyzeHeavyMetal(spotDiameterMm: number) {
  const isDetected = spotDiameterMm > 0.5;
  const concentration = isDetected
    ? (spotDiameterMm * 1.5).toFixed(2) + " ppm"
    : "0 ppm";

  return {
    isDetected,
    concentration,
    message: isDetected ? "Heavy Metal Detected" : "Safe / Not Detected",
  };
}
