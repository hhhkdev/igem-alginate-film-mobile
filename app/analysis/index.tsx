import { useLocalSearchParams, router } from "expo-router";
import { safeGoBack } from "../../lib/navigation";
import {
  View,
  Image,
  Text,
  TextInput,
  Dimensions,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useMemo } from "react";
import { ResizableCircle } from "../../components/ResizableCircle";
import { ResizableLine } from "../../components/ResizableLine";
import { PolygonDraggable } from "../../components/PolygonDraggable";
import {
  ArrowLeft,
  Trash2,
  CheckCircle2,
  Lock,
  Unlock,
  Scan,
} from "lucide-react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { saveResult } from "../../lib/history";
import { getAnalysisImage } from "../../lib/temp-storage";
import { detectRedRegion } from "../../lib/red-detection";
import { analyzeConcentration } from "../../lib/calculations";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;

export default function AnalysisScreen() {
  const { imageUri, method, filmDiameter, refDimension } =
    useLocalSearchParams();

  // Retrieve image from params (if small) or temp storage (if large/web)
  const currentImageUri = (imageUri as string) || getAnalysisImage();

  // Params parsing
  const referenceMethod = (method as "petri" | "ruler") || "petri";
  const refValueMm =
    parseFloat(refDimension as string) ||
    (referenceMethod === "petri" ? 150 : 50);
  const filmDiameterMm = parseFloat(filmDiameter as string) || 25;

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

  // 잠금 상태 관리
  const [isRefLocked, setIsRefLocked] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);

  // 계산 로직 관련 상수 및 함수
  const getScale = () => {
    // 픽셀 당 실제 길이(mm) 비율 반환 (mm/px)
    if (referenceMethod === "petri") {
      // 페트리 디쉬 모드: 원의 지름(px)과 실제 지름(mm) 비율 사용
      const diameterPx = refCircle.radius * 2;
      return refValueMm / diameterPx;
    } else {
      // 자(Ruler) 모드: 선의 길이(px)와 실제 길이(mm) 비율 사용
      const dx = refLine.end.x - refLine.start.x;
      const dy = refLine.end.y - refLine.start.y;
      const lengthPx = Math.sqrt(dx * dx + dy * dy);
      return refValueMm / lengthPx;
    }
  };

  const calculatePolygonAreaPx = (points: { x: number; y: number }[]) => {
    // 신발끈 공식(Shoelace Formula)을 사용하여 다각형의 면적(px²) 계산
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
    const scale = getScale(); // mm/px 비율
    const areaPx = calculatePolygonAreaPx(polygonPoints); // 픽셀 단위 면적
    const areaMm = areaPx * scale * scale; // mm² 단위 면적

    // CuSO₄ 농도 계산 (실제 공식)
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
      }
    } catch (error) {
      console.error("Auto detection failed:", error);
    } finally {
      setIsDetecting(false);
    }
  };

  // Layout state for dynamic measurement
  const [layout, setLayout] = useState({ width: 0, height: 0 });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <View className="flex-1 bg-black w-full h-full flex-col">
          {/* Upper Section: Image & Tools */}
          <View
            className="w-full bg-black relative overflow-hidden"
            style={{ height: SCREEN_WIDTH }} // Enforce 1:1 Aspect Ratio
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
              <View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor: "rgba(0,0,0,0.5)",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 20,
                  },
                ]}
              >
                <ActivityIndicator size="large" color="#ffffff" />
                <Text className="text-white text-sm mt-3 font-medium">
                  빨간 영역 감지 중...
                </Text>
              </View>
            )}

            {/* Interactive Layer - Only render if layout is measured */}
            {layout.width > 0 && (
              <View style={StyleSheet.absoluteFill}>
                {/* Polygon Tool */}
                <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
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

                {/* Reference Tool */}
                <View
                  style={StyleSheet.absoluteFill}
                  pointerEvents={isRefLocked ? "none" : "box-none"}
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
              </View>
            )}

            {/* Overlay UI: Back Button & Tooltip (Inside Image Area) */}
            <View
              style={{
                position: "absolute",
                top: 16,
                left: 16,
                right: 16,
                zIndex: 10,
              }}
              pointerEvents="box-none"
              className="flex-row justify-between items-start"
            >
              <TouchableOpacity
                onPress={() => safeGoBack()}
                className="p-2 rounded-full bg-black/60 active:bg-black/80 backdrop-blur-sm"
              >
                <ArrowLeft color="white" size={24} />
              </TouchableOpacity>

              <View className="bg-black/60 px-4 py-2 rounded-full backdrop-blur-sm">
                <Text className="text-white text-xs font-medium">
                  {referenceMethod === "petri"
                    ? "파란색 원을 페트리 접시에 맞추세요"
                    : "파란색 선을 기준 물체에 맞추세요"}
                </Text>
              </View>

              <View className="flex-row gap-x-2">
                <TouchableOpacity
                  onPress={handleAutoDetect}
                  disabled={isDetecting}
                  className={`p-2 rounded-full backdrop-blur-sm ${isDetecting ? "bg-green-400/80" : "bg-green-500/80 active:bg-green-600/90"}`}
                >
                  <Scan color="white" size={20} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleClearPolygon}
                  className="p-2 rounded-full bg-red-500/80 active:bg-red-600/90 backdrop-blur-sm"
                >
                  <Trash2 color="white" size={20} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Lower Section: Results Panel (Fill Remaining Space) */}
          <View className="flex-1 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-lg z-50">
            <View className="p-5 pb-2 gap-y-5">
              {/* Header with Legends & Locks */}
              <View className="flex-row justify-between items-center">
                <Text className="text-lg font-bold text-slate-800 dark:text-white">
                  분석 결과
                </Text>

                {/* Reference Lock Toggle - Enhanced Design */}
                <TouchableOpacity
                  className={`flex-row items-center gap-x-2 px-3 py-1.5 rounded-full border ${
                    isRefLocked
                      ? "bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-600"
                      : "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
                  }`}
                  onPress={() => setIsRefLocked(!isRefLocked)}
                >
                  <View
                    className={`w-2 h-2 rounded-full ${isRefLocked ? "bg-slate-400" : "bg-blue-500"}`}
                  />
                  <Text
                    className={`text-xs font-medium ${isRefLocked ? "text-slate-500" : "text-blue-600 dark:text-blue-400"}`}
                  >
                    {isRefLocked ? "기준 잠김" : "기준 이동"}
                  </Text>
                  {isRefLocked ? (
                    <Lock size={14} className="text-slate-400" />
                  ) : (
                    <Unlock size={14} className="text-blue-500" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Instructions - Always visible to prevent layout shift */}
              <View className="bg-yellow-50 dark:bg-yellow-900/10 px-3 py-2 rounded-md flex-row items-start gap-x-2 border border-yellow-200 dark:border-yellow-900/30">
                <View className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1.5" />
                <Text className="flex-1 text-yellow-700 dark:text-yellow-500 text-xs leading-4">
                  {isPolygonClosed
                    ? "영역이 설정되었습니다.\n수정하려면 점을 탭하여 삭제하거나 드래그하세요."
                    : "붉은색 반응 영역을 탭하여 점을 찍으세요.\n첫 번째 점을 다시 누르면 닫힙니다."}
                </Text>
              </View>

              {/* Specs Grid */}
              <View className="flex-row gap-x-4">
                <View className="flex-1 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                  <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    {referenceMethod === "petri" ? "페트리 지름" : "자 길이"}
                  </Text>
                  <View className="flex-row items-baseline gap-x-1">
                    <Text className="text-base font-semibold text-slate-900 dark:text-white">
                      {refValueMm}
                    </Text>
                    <Text className="text-xs text-slate-500">mm</Text>
                  </View>
                </View>
                <View className="flex-1 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                  <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    필름 지름
                  </Text>
                  <View className="flex-row items-baseline gap-x-1">
                    <Text className="text-base font-semibold text-slate-900 dark:text-white">
                      {filmDiameterMm}
                    </Text>
                    <Text className="text-xs text-slate-500">mm</Text>
                  </View>
                </View>
              </View>

              {/* Main Result Card */}
              <View
                className={`rounded-2xl p-4 shadow-sm ${isDetected ? "bg-red-600 dark:bg-red-700" : "bg-blue-600 dark:bg-blue-700"}`}
              >
                <View className="flex-row justify-between items-end mb-2">
                  <Text className="text-white/80 text-xs font-bold uppercase tracking-wider">
                    CuSO₄ 추정 농도
                  </Text>
                  <Text className="text-white/60 text-[10px] font-mono">
                    T = 1.0mm
                  </Text>
                </View>
                <View className="flex-row items-baseline gap-x-2">
                  <Text className="text-3xl font-extrabold text-white tracking-tight">
                    {concentration > 0.0001 ? concentration.toFixed(4) : "0"}
                  </Text>
                  <Text className="text-white/80 font-medium text-lg">%</Text>
                </View>
                <View className="mt-3 pt-3 border-t border-white/20 gap-y-1">
                  <View className="flex-row justify-between items-center">
                    <Text className="text-white/70 text-xs">면적 증가율</Text>
                    <Text className="text-white font-medium">
                      {areaIncreasePercent.toFixed(2)} %
                    </Text>
                  </View>
                  <View className="flex-row justify-between items-center">
                    <Text className="text-white/70 text-xs">반응 면적</Text>
                    <Text className="text-white font-medium">
                      {areaMm.toFixed(2)} mm²
                    </Text>
                  </View>
                </View>
              </View>

              {/* Action Button */}
              <TouchableOpacity
                className="w-full bg-slate-900 dark:bg-white p-4 rounded-xl items-center active:opacity-90 shadow-sm mb-2"
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
                <Text className="text-white dark:text-slate-900 font-bold text-base">
                  결과 저장하기
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
