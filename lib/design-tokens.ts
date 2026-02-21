/**
 * 디자인 토큰 — 앱 전체에서 일관된 스타일을 유지합니다.
 *
 * Usage:
 *   import { tokens } from "../lib/design-tokens";
 *   borderRadius: tokens.radius.card,
 *   ...tokens.shadow.card,
 */

import { Platform } from "react-native";

// ─── Border Radius ────────────────────────────────────

const radius = {
  /** 카드, 입력필드 등 대부분의 박스 (16) */
  card: 16,
  /** 탭/토글 컨테이너 (14) */
  toggleContainer: 14,
  /** 탭/토글 내부 버튼 (10) */
  toggleInner: 10,
  /** CTA(주요 액션) 버튼 (16) */
  button: 16,
  /** 필(pill) 형태 — 뱃지, 뒤로가기 버튼, 오버레이 칩 */
  pill: 999,
  /** 썸네일, 아이콘 박스, 스펙 카드 (12) */
  thumbnail: 12,
  /** 알림/인스트럭션 박스 (12) */
  notice: 12,
};

// ─── Shadow ───────────────────────────────────────────

const shadow = {
  /** 카드에 사용되는 미세한 그림자 */
  card: {
    ...Platform.select({
      web: { boxShadow: "0px 1px 3px rgba(0, 0, 0, 0.04)" as any },
      default: {
        shadowColor: "#000" as const,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
    }),
    elevation: 1,
  },
  /** CTA 버튼의 파란 강조 그림자 */
  cta: {
    ...Platform.select({
      web: { boxShadow: "0px 4px 8px rgba(59, 130, 246, 0.25)" as any },
      default: {
        shadowColor: "#3b82f6" as const,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
    }),
    elevation: 3,
  },
  /** 탭/토글 내 활성 버튼 */
  toggleActive: {
    ...Platform.select({
      web: { boxShadow: "0px 1px 2px rgba(0, 0, 0, 0.06)" as any },
      default: {
        shadowColor: "#000" as const,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 2,
      },
    }),
    elevation: 1,
  },
  /** 다크 배경 위 CTA 버튼 */
  ctaDark: {
    ...Platform.select({
      web: { boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.08)" as any },
      default: {
        shadowColor: "#000" as const,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
    }),
    elevation: 2,
  },
};

// ─── Spacing ──────────────────────────────────────────

const spacing = {
  /** 화면 좌우 패딩 (24) */
  screenPadding: 24,
  /** 카드 내부 패딩 (16) */
  cardPadding: 16,
  /** 뒤로가기 버튼 아래 여백 (24) */
  backButtonMargin: 24,
};

// ─── Button Sizing ────────────────────────────────────

const button = {
  /** CTA 버튼 높이 (56) */
  ctaHeight: 56,
  /** 뒤로가기 버튼 크기 (40) */
  backSize: 40,
};

// ─── Border ───────────────────────────────────────────

const border = {
  /** 카드 테두리 */
  card: {
    borderWidth: 1 as const,
    borderColor: "#f1f5f9",
  },
};

// ─── Colors ───────────────────────────────────────────

const color = {
  // Backgrounds
  /** 화면 배경 — 메인 (white) */
  bgScreen: "#f9fafb",
  /** 카드/요소 배경 (white) */
  bgPrimary: "#ffffff",
  /** 입력 필드 배경 */
  bgSecondary: "#f9fafb",
  /** 밝은 카드 내부 배경 */
  bgTertiary: "#f8fafc",
  /** 토글 컨테이너, 뒤로가기 버튼 배경 */
  bgMuted: "#f3f4f6",
  /** 아이콘 서클, 연한 태그 */
  bgLight: "#f1f5f9",

  // Text
  /** 제목, 강조 텍스트 */
  textPrimary: "#0f172a",
  /** 본문, 보조 설명 */
  textSecondary: "#475569",
  /** 라벨, 캡션 */
  textMuted: "#64748b",
  /** placeholder, 비활성 요소 */
  textPlaceholder: "#94a3b8",
  /** 아이콘 기본색 */
  iconDefault: "#334155",

  // Accent
  accentBlue: "#2563eb",
  accentBlueBg: "#eff6ff",
  accentBlueLight: "rgba(37, 99, 235, 0.1)",
  accentRed: "#ef4444",
  accentRedDark: "#dc2626",
  accentRedBg: "#fef2f2",

  // Borders
  borderDefault: "#e2e8f0",
  borderLight: "#f1f5f9",

  // Disabled
  disabledBg: "#e5e7eb",
  disabledText: "#9ca3af",
};

// ─── Typography ───────────────────────────────────────

const font = {
  /** 화면 제목 */
  title: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: color.textPrimary,
    letterSpacing: -0.3,
  },
  /** 화면 부제목 / 설명 */
  subtitle: {
    fontSize: 16,
    fontWeight: "500" as const,
    color: color.textMuted,
    lineHeight: 24,
  },
  /** CTA 버튼 텍스트 */
  ctaText: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: color.bgPrimary,
  },
  /** 섹션/카테고리 헤더 라벨 */
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: color.textPlaceholder,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
  },
  /** 카드 내 주요 숫자/값 */
  cardValue: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: color.textPrimary,
  },
  /** 카드 내 보조 텍스트 */
  cardCaption: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: color.textSecondary,
  },
  /** 작은 보조 텍스트 (날짜, 단위) */
  small: {
    fontSize: 12,
    color: color.textPlaceholder,
  },
};

// ─── Common Component Styles ──────────────────────────

const component = {
  /** 뒤로가기 버튼 공통 스타일 */
  backButton: {
    width: button.backSize,
    height: button.backSize,
    backgroundColor: color.bgMuted,
    borderRadius: button.backSize / 2,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: spacing.backButtonMargin,
  },
};

export const tokens = {
  radius,
  shadow,
  spacing,
  button,
  border,
  color,
  font,
  component,
};
