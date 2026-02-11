import { useLocalSearchParams, router } from "expo-router";
import {
  View,
  Image,
  Text,
  TextInput,
  Dimensions,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useMemo } from "react";
import { ResizableCircle } from "../../components/ResizableCircle";
import { ResizableLine } from "../../components/ResizableLine";
import { PolygonDraggable } from "../../components/PolygonDraggable";
import { ArrowLeft, Trash2, CheckCircle2 } from "lucide-react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;

export default function AnalysisScreen() {
  const { imageUri, method, filmDiameter, refDimension } =
    useLocalSearchParams();

  // Params parsing
  const referenceMethod = (method as "petri" | "ruler") || "petri";
  const refValueMm =
    parseFloat(refDimension as string) ||
    (referenceMethod === "petri" ? 150 : 100);
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
    const areaMm = areaPx * scale * scale; // mm² 단위 면적 (비율의 제곱을 곱함)

    // 중금속 농도 계산을 위한 임시 공식
    // 실제 공식: 농도 = (반응 면적 / 전체 필름 면적) * 상수 ???
    // 현재는 예시로 면적 * 0.5를 사용합니다.
    // 추후 실제 과학적 공식으로 대체해야 합니다.
    const concentration = areaMm * 0.5;

    return {
      areaMm,
      concentration,
      scale,
    };
  };

  const { areaMm, concentration } = calculateResult();

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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="flex-1 bg-black">
        {/* Image Layer */}
        <Image
          source={{ uri: imageUri as string }}
          className="flex-1 w-full h-full"
          resizeMode="contain"
        />

        {/* Interactive Layer */}
        <View
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        >
          {/* Reference Tool */}
          {referenceMethod === "petri" ? (
            <ResizableCircle
              color="#3b82f6"
              initialX={refCircle.x}
              initialY={refCircle.y}
              initialRadius={refCircle.radius}
              onUpdate={(x, y, radius) => setRefCircle({ x, y, radius })}
            />
          ) : (
            <ResizableLine
              color="#3b82f6"
              initialStart={refLine.start}
              initialEnd={refLine.end}
              onUpdate={(start, end) => setRefLine({ start, end })}
            />
          )}

          {/* Polygon Tool */}
          <PolygonDraggable
            points={polygonPoints}
            isClosed={isPolygonClosed}
            onPointsUpdate={setPolygonPoints}
            onClose={() => setIsPolygonClosed(true)}
            onAddPoint={handleAddPoint}
            containerWidth={SCREEN_WIDTH}
            containerHeight={SCREEN_HEIGHT}
          />
        </View>

        {/* UI Controls */}
        <SafeAreaView className="absolute top-0 left-0 w-full" edges={["top"]}>
          <View className="flex-row items-center justify-between p-4">
            <TouchableOpacity
              onPress={() => router.back()}
              className="p-2 rounded-full bg-black/50"
            >
              <ArrowLeft color="white" size={24} />
            </TouchableOpacity>

            <View className="bg-black/50 px-4 py-2 rounded-full">
              <Text className="text-white font-medium">
                {referenceMethod === "petri"
                  ? "파란색 원을 조절하세요"
                  : "파란색 선을 조절하세요"}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleClearPolygon}
              className="p-2 rounded-full bg-red-500/80"
            >
              <Trash2 color="white" size={24} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* Bottom Sheet Results */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="absolute bottom-0 w-full bg-white dark:bg-slate-900 rounded-t-3xl p-6 shadow-2xl"
        >
          <SafeAreaView edges={["bottom"]}>
            <View className="gap-y-4">
              {/* Header */}
              <View className="flex-row justify-between items-center">
                <Text className="text-xl font-bold text-slate-900 dark:text-white">
                  분석 결과
                </Text>
                <View className="flex-row gap-x-4">
                  <View className="flex-row items-center gap-x-2">
                    <View className="w-3 h-3 rounded-full bg-blue-500" />
                    <Text className="text-slate-500 text-xs">기준(참조)</Text>
                  </View>
                  <View className="flex-row items-center gap-x-2">
                    <View className="w-3 h-3 rounded-full bg-red-500" />
                    <Text className="text-slate-500 text-xs">반응 영역</Text>
                  </View>
                </View>
              </View>

              {/* Instructions if polygon empty */}
              {polygonPoints.length < 3 && (
                <View className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg flex-row items-center gap-x-2">
                  <View className="w-2 h-2 rounded-full bg-yellow-500" />
                  <Text className="text-yellow-700 dark:text-yellow-400 text-sm">
                    붉은색 반응 영역을 탭하여 점을 찍으세요. 첫 번째 점을 다시
                    누르면 영역이 닫힙니다.
                  </Text>
                </View>
              )}

              {/* Result Params */}
              <View className="flex-row justify-between bg-gray-50 dark:bg-slate-800 p-4 rounded-xl">
                <View>
                  <Text className="text-slate-500 text-xs uppercase font-bold">
                    필름 지름
                  </Text>
                  <Text className="text-slate-900 dark:text-white text-lg font-semibold">
                    {filmDiameterMm} mm
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-slate-500 text-xs uppercase font-bold">
                    {referenceMethod === "petri"
                      ? "페트리 접시 지름"
                      : "자(Ruler) 길이"}
                  </Text>
                  <Text className="text-slate-900 dark:text-white text-lg font-semibold">
                    {refValueMm} mm
                  </Text>
                </View>
              </View>

              {/* Calculated Area */}
              <View className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4">
                <Text className="text-blue-600 dark:text-blue-400 text-sm font-bold uppercase mb-1">
                  반응 면적
                </Text>
                <View className="flex-row items-baseline gap-x-2">
                  <Text className="text-4xl font-extrabold text-slate-900 dark:text-white">
                    {areaMm.toFixed(2)}
                  </Text>
                  <Text className="text-slate-500 font-medium text-lg">
                    mm²
                  </Text>
                </View>

                {/* Formula Display */}
                <View className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                  <Text className="text-slate-500 text-xs font-mono">
                    공식: 면적 * 0.5 = 중금속 농도
                  </Text>
                  <View className="flex-row justify-between items-center mt-1">
                    <Text className="text-slate-700 dark:text-slate-300 font-medium">
                      결과 (농도)
                    </Text>
                    <Text className="text-slate-900 dark:text-white font-bold text-lg">
                      {concentration.toFixed(2)} units
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                className="w-full bg-blue-600 p-4 rounded-xl items-center active:opacity-90 mt-2"
                onPress={() => {
                  router.push({
                    pathname: "/result",
                    params: {
                      area: areaMm.toFixed(2),
                      concentration: concentration.toFixed(2),
                      imageUri: imageUri as string,
                    },
                  });
                }}
              >
                <Text className="text-white font-semibold text-lg">
                  결과 저장
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </GestureHandlerRootView>
  );
}
