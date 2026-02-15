import { useLocalSearchParams, router } from "expo-router";
import { safeGoBack } from "../../lib/navigation";
import {
  View,
  Image,
  Text,
  Dimensions,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { ResizableCircle } from "../../components/ResizableCircle";
import { ResizableLine } from "../../components/ResizableLine";
import { PolygonDraggable } from "../../components/PolygonDraggable";
import { ArrowLeft, Trash2, Scan, Move, Crosshair } from "lucide-react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { saveResult } from "../../lib/history";
import { getAnalysisImage } from "../../lib/temp-storage";
import { tokens } from "../../lib/design-tokens";
import { detectRedRegion } from "../../lib/red-detection";
import { analyzeConcentration } from "../../lib/calculations";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;
const IMAGE_AREA_HEIGHT = Math.round(SCREEN_HEIGHT * 0.65);

export default function AnalysisScreen() {
  const { imageUri, method, filmDiameter, refDimension } =
    useLocalSearchParams();

  const currentImageUri = (imageUri as string) || getAnalysisImage();

  const referenceMethod = (method as "petri" | "ruler") || "petri";
  const refValueMm =
    parseFloat(refDimension as string) ||
    (referenceMethod === "petri" ? 150 : 50);
  const filmDiameterMm = parseFloat(filmDiameter as string) || 25;

  // Edit mode: "reference" = adjust blue circle/line, "polygon" = adjust red polygon
  const [editMode, setEditMode] = useState<"reference" | "polygon">(
    "reference",
  );

  // 참조 도구(원/선)의 상태 관리
  const [refCircle, setRefCircle] = useState({
    x: SCREEN_WIDTH / 2,
    y: SCREEN_HEIGHT / 3,
    radius: 100,
  });

  const [refLine, setRefLine] = useState({
    start: { x: SCREEN_WIDTH / 2 - 100, y: SCREEN_HEIGHT / 3 },
    end: { x: SCREEN_WIDTH / 2 + 100, y: SCREEN_HEIGHT / 3 },
  });

  // 다각형(Polygon) 점들의 상태 관리
  const [polygonPoints, setPolygonPoints] = useState<
    { id: string; x: number; y: number }[]
  >([]);
  const [isPolygonClosed, setIsPolygonClosed] = useState(false);

  const [isDetecting, setIsDetecting] = useState(false);

  // 계산 로직
  const getScale = () => {
    if (referenceMethod === "petri") {
      const diameterPx = refCircle.radius * 2;
      return refValueMm / diameterPx;
    } else {
      const dx = refLine.end.x - refLine.start.x;
      const dy = refLine.end.y - refLine.start.y;
      const lengthPx = Math.sqrt(dx * dx + dy * dy);
      return refValueMm / lengthPx;
    }
  };

  const calculatePolygonAreaPx = (points: { x: number; y: number }[]) => {
    if (points.length < 3) return 0;
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    return Math.abs(area) / 2;
  };

  const calculateResult = () => {
    // Only calculate when polygon is closed
    if (!isPolygonClosed || polygonPoints.length < 3) {
      return {
        areaMm: 0,
        concentration: 0,
        areaIncreasePercent: 0,
        isDetected: false,
        scale: 0,
      };
    }

    const scale = getScale();
    const areaPx = calculatePolygonAreaPx(polygonPoints);
    const areaMm = areaPx * scale * scale;

    const analysis = analyzeConcentration({
      redAreaMm2: areaMm,
      filmDiameterMm: filmDiameterMm,
    });

    return {
      areaMm,
      concentration: analysis.concentrationPercent,
      areaIncreasePercent: analysis.areaIncreasePercent,
      isDetected: analysis.isDetected,
      scale,
    };
  };

  const { areaMm, concentration, areaIncreasePercent, isDetected } =
    calculateResult();

  const handleAddPoint = (x: number, y: number) => {
    if (isPolygonClosed) return;
    const newPoint = {
      id: Math.random().toString(36).substr(2, 9),
      x,
      y,
    };
    setPolygonPoints([...polygonPoints, newPoint]);
  };

  const handleClearPolygon = () => {
    setPolygonPoints([]);
    setIsPolygonClosed(false);
  };

  const handleAutoDetect = async () => {
    if (!currentImageUri || isDetecting) return;
    setIsDetecting(true);
    try {
      const detectedPoints = await detectRedRegion(
        currentImageUri as string,
        layout.width || SCREEN_WIDTH,
        layout.height || SCREEN_WIDTH,
      );
      if (detectedPoints.length >= 3) {
        setPolygonPoints(detectedPoints);
        setIsPolygonClosed(true);
        // Auto-switch to polygon mode after detection
        setEditMode("polygon");
      }
    } catch (error) {
      console.error("Auto detection failed:", error);
    } finally {
      setIsDetecting(false);
    }
  };

  const [layout, setLayout] = useState({ width: 0, height: 0 });

  const isRefMode = editMode === "reference";
  const isPolyMode = editMode === "polygon";

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <View style={s.root}>
          {/* Upper Section: Image & Tools */}
          <View
            style={s.imageContainer}
            onLayout={(event) => {
              const { width, height } = event.nativeEvent.layout;
              setLayout({ width, height });
            }}
          >
            {/* Image Layer */}
            <Image
              source={{ uri: currentImageUri as string }}
              style={[StyleSheet.absoluteFill]}
              resizeMode="cover"
            />

            {/* Loading Overlay */}
            {isDetecting && (
              <View style={s.loadingOverlay}>
                <ActivityIndicator size="large" color="#ffffff" />
                <Text style={s.loadingText}>빨간 영역 감지 중...</Text>
              </View>
            )}

            {/* Interactive Layer */}
            {layout.width > 0 && (
              <View style={StyleSheet.absoluteFill}>
                {/* Reference Tool — only interactive in reference mode */}
                <View
                  style={StyleSheet.absoluteFill}
                  pointerEvents={isRefMode ? "box-none" : "none"}
                >
                  {referenceMethod === "petri" ? (
                    <ResizableCircle
                      color="#3b82f6"
                      initialX={layout.width / 2}
                      initialY={layout.height / 2}
                      initialRadius={100}
                      onUpdate={(x, y, radius) =>
                        setRefCircle({ x, y, radius })
                      }
                    />
                  ) : (
                    <ResizableLine
                      color="#3b82f6"
                      initialStart={{
                        x: layout.width / 2 - 100,
                        y: layout.height / 2,
                      }}
                      initialEnd={{
                        x: layout.width / 2 + 100,
                        y: layout.height / 2,
                      }}
                      onUpdate={(start, end) => setRefLine({ start, end })}
                    />
                  )}
                </View>

                {/* Polygon Tool — only interactive in polygon mode */}
                <View
                  style={StyleSheet.absoluteFill}
                  pointerEvents={isPolyMode ? "box-none" : "none"}
                >
                  <PolygonDraggable
                    points={polygonPoints}
                    isClosed={isPolygonClosed}
                    onPointsUpdate={setPolygonPoints}
                    onClose={() => setIsPolygonClosed(true)}
                    onOpen={() => setIsPolygonClosed(false)}
                    onAddPoint={handleAddPoint}
                    containerWidth={layout.width}
                    containerHeight={layout.height}
                  />
                </View>
              </View>
            )}

            {/* Overlay UI */}
            <View style={s.overlayHeader} pointerEvents="box-none">
              <TouchableOpacity
                onPress={() => safeGoBack()}
                style={s.overlayButton}
              >
                <ArrowLeft color="white" size={24} />
              </TouchableOpacity>

              <View style={s.tooltipBadge}>
                <Text style={s.tooltipText}>
                  {isRefMode
                    ? referenceMethod === "petri"
                      ? "파란색 원을 페트리 접시에 맞추세요"
                      : "파란색 선을 기준 물체에 맞추세요"
                    : isPolygonClosed
                      ? "점을 드래그하여 영역을 조정하세요"
                      : "탭하여 빨간 영역의 점을 찍으세요"}
                </Text>
              </View>

              <View style={s.overlayActions}>
                <TouchableOpacity
                  onPress={handleAutoDetect}
                  disabled={isDetecting}
                  style={[
                    s.overlayButton,
                    { backgroundColor: "rgba(34,197,94,0.8)" },
                  ]}
                >
                  <Scan color="white" size={20} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleClearPolygon}
                  style={[
                    s.overlayButton,
                    { backgroundColor: "rgba(239,68,68,0.8)" },
                  ]}
                >
                  <Trash2 color="white" size={20} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Lower Section: Results Panel */}
          <View style={s.resultsPanel}>
            <ScrollView contentContainerStyle={s.resultsPanelContent}>
              {/* Mode Toggle */}
              <View style={s.modeToggleContainer}>
                <TouchableOpacity
                  onPress={() => setEditMode("reference")}
                  style={[
                    s.modeToggleButton,
                    isRefMode && s.modeToggleButtonActive,
                  ]}
                >
                  <Move size={16} color={isRefMode ? "#2563eb" : "#94a3b8"} />
                  <Text
                    style={[
                      s.modeToggleText,
                      isRefMode && s.modeToggleTextActive,
                    ]}
                  >
                    기준 조정
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setEditMode("polygon")}
                  style={[
                    s.modeToggleButton,
                    isPolyMode && s.modeToggleButtonActive,
                  ]}
                >
                  <Crosshair
                    size={16}
                    color={isPolyMode ? "#ef4444" : "#94a3b8"}
                  />
                  <Text
                    style={[
                      s.modeToggleText,
                      isPolyMode && s.modeToggleTextActive,
                    ]}
                  >
                    영역 지정
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Instructions */}
              <View style={s.instructionBox}>
                <View style={s.instructionDot} />
                <Text style={s.instructionText}>
                  {isRefMode
                    ? "파란색 기준 도구를 이미지 위에서 조정하세요.\n완료 후 '영역 지정' 모드로 전환하세요."
                    : isPolygonClosed
                      ? "영역이 설정되었습니다.\n점을 드래그하거나 탭하여 삭제하세요."
                      : "빨간색 반응 영역을 탭하여 점을 찍으세요.\n첫 번째 점을 다시 누르면 닫힙니다."}
                </Text>
              </View>

              {/* Specs Grid */}
              <View style={s.specsRow}>
                <View style={s.specCard}>
                  <Text style={s.specLabel}>
                    {referenceMethod === "petri" ? "페트리 지름" : "자 길이"}
                  </Text>
                  <View style={s.specValueRow}>
                    <Text style={s.specValue}>{refValueMm}</Text>
                    <Text style={s.specUnit}>mm</Text>
                  </View>
                </View>
                <View style={s.specCard}>
                  <Text style={s.specLabel}>필름 지름</Text>
                  <View style={s.specValueRow}>
                    <Text style={s.specValue}>{filmDiameterMm}</Text>
                    <Text style={s.specUnit}>mm</Text>
                  </View>
                </View>
              </View>

              {/* Main Result Card — only shown after polygon is closed */}
              {isPolygonClosed && polygonPoints.length >= 3 ? (
                <View
                  style={[
                    s.resultCard,
                    isDetected ? s.resultCardRed : s.resultCardBlue,
                  ]}
                >
                  <View style={s.resultCardHeader}>
                    <Text style={s.resultCardLabel}>CuSO₄ 추정 농도</Text>
                    <Text style={s.resultCardMeta}>T = 1.0mm</Text>
                  </View>
                  <View style={s.resultCardMainRow}>
                    <Text style={s.resultCardValue}>
                      {concentration > 0.0001 ? concentration.toFixed(4) : "0"}
                    </Text>
                    <Text style={s.resultCardUnit}>%</Text>
                  </View>
                  <View style={s.resultCardDetails}>
                    <View style={s.resultDetailRow}>
                      <Text style={s.resultDetailLabel}>면적 증가율</Text>
                      <Text style={s.resultDetailValue}>
                        {areaIncreasePercent.toFixed(2)} %
                      </Text>
                    </View>
                    <View style={s.resultDetailRow}>
                      <Text style={s.resultDetailLabel}>반응 면적</Text>
                      <Text style={s.resultDetailValue}>
                        {areaMm.toFixed(2)} mm²
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={s.resultPlaceholder}>
                  <Crosshair size={24} color="#94a3b8" />
                  <Text style={s.resultPlaceholderText}>
                    빨간 영역을 지정하면 결과가 표시됩니다
                  </Text>
                </View>
              )}

              {/* Action Button */}
              <TouchableOpacity
                style={[
                  s.saveButton,
                  !(isPolygonClosed && polygonPoints.length >= 3) &&
                    s.saveButtonDisabled,
                ]}
                disabled={!(isPolygonClosed && polygonPoints.length >= 3)}
                onPress={async () => {
                  await saveResult({
                    date: new Date().toISOString(),
                    concentration: concentration,
                    area: areaMm,
                    imageUri: currentImageUri as string,
                  });

                  router.push({
                    pathname: "/result",
                    params: {
                      area: areaMm.toFixed(2),
                      concentration: concentration.toFixed(2),
                      imageUri: currentImageUri as string,
                    },
                  });
                }}
              >
                <Text
                  style={[
                    s.saveButtonText,
                    !(isPolygonClosed && polygonPoints.length >= 3) &&
                      s.saveButtonTextDisabled,
                  ]}
                >
                  결과 저장하기
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
    width: "100%",
    height: "100%",
  },
  imageContainer: {
    width: "100%",
    backgroundColor: "#000",
    position: "relative",
    overflow: "hidden",
    height: IMAGE_AREA_HEIGHT,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
  loadingText: {
    color: "white",
    fontSize: 14,
    marginTop: 12,
    fontWeight: "500",
  },
  overlayHeader: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  overlayButton: {
    padding: 8,
    borderRadius: tokens.radius.pill,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  tooltipBadge: {
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: tokens.radius.pill,
    flex: 1,
    marginHorizontal: 8,
  },
  tooltipText: {
    color: "white",
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  overlayActions: {
    flexDirection: "row",
    gap: 8,
  },
  resultsPanel: {
    flex: 1,
    backgroundColor: tokens.color.bgPrimary,
    borderTopWidth: 1,
    borderTopColor: tokens.color.borderDefault,
    zIndex: 50,
  },
  resultsPanelContent: {
    padding: 20,
    paddingBottom: 40,
  },
  // Mode Toggle
  modeToggleContainer: {
    flexDirection: "row",
    backgroundColor: tokens.color.bgMuted,
    padding: 4,
    borderRadius: tokens.radius.toggleContainer,
    marginBottom: 16,
  },
  modeToggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: tokens.radius.toggleInner,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  modeToggleButtonActive: {
    backgroundColor: tokens.color.bgPrimary,
    ...tokens.shadow.toggleActive,
  },
  modeToggleText: {
    fontWeight: "600",
    fontSize: 13,
    color: tokens.color.textPlaceholder,
  },
  modeToggleTextActive: {
    color: tokens.color.textPrimary,
  },
  // Instructions
  instructionBox: {
    backgroundColor: "#fefce8",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: tokens.radius.notice,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderWidth: 1,
    borderColor: "#fef08a",
    marginBottom: 16,
  },
  instructionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#eab308",
    marginTop: 5,
  },
  instructionText: {
    flex: 1,
    color: "#a16207",
    fontSize: 12,
    lineHeight: 18,
  },
  // Specs
  specsRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  specCard: {
    flex: 1,
    backgroundColor: tokens.color.bgTertiary,
    padding: 12,
    borderRadius: tokens.radius.thumbnail,
    ...tokens.border.card,
  },
  specLabel: {
    ...tokens.font.sectionLabel,
    fontSize: 10,
    marginBottom: 4,
  },
  specValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  specValue: {
    fontSize: 16,
    fontWeight: "600",
    color: tokens.color.textPrimary,
  },
  specUnit: {
    fontSize: 12,
    color: tokens.color.textMuted,
  },
  // Result card
  resultCard: {
    borderRadius: tokens.radius.card,
    padding: tokens.spacing.cardPadding,
    marginBottom: 16,
  },
  resultCardRed: {
    backgroundColor: tokens.color.accentRedDark,
  },
  resultCardBlue: {
    backgroundColor: tokens.color.accentBlue,
  },
  resultCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 8,
  },
  resultCardLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  resultCardMeta: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 10,
  },
  resultCardMainRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  resultCardValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "white",
    letterSpacing: -0.5,
  },
  resultCardUnit: {
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
    fontSize: 18,
  },
  resultCardDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
    gap: 4,
  },
  resultDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resultDetailLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
  },
  resultDetailValue: {
    color: "white",
    fontWeight: "500",
  },
  // Placeholder
  resultPlaceholder: {
    backgroundColor: tokens.color.bgTertiary,
    borderRadius: tokens.radius.card,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: tokens.color.borderDefault,
    borderStyle: "dashed",
    marginBottom: 16,
  },
  resultPlaceholderText: {
    color: tokens.color.textPlaceholder,
    fontSize: 14,
    textAlign: "center",
  },
  // Save button
  saveButton: {
    width: "100%",
    backgroundColor: tokens.color.textPrimary,
    height: tokens.button.ctaHeight,
    borderRadius: tokens.radius.button,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    ...tokens.shadow.ctaDark,
  },
  saveButtonDisabled: {
    backgroundColor: tokens.color.disabledBg,
  },
  saveButtonText: {
    ...tokens.font.ctaText,
  },
  saveButtonTextDisabled: {
    color: tokens.color.disabledText,
  },
});
