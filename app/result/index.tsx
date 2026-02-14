import { useLocalSearchParams, router } from "expo-router";
import { View, Text, Image, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  CheckCircle,
  AlertTriangle,
  Home,
  AlertOctagon,
} from "lucide-react-native";
import { analyzeHeavyMetal } from "../../lib/calculations";
import { cn } from "../../lib/utils"; // Make sure this path is correct

export default function ResultScreen() {
  const { area, concentration } = useLocalSearchParams();

  const resultArea = parseFloat(area as string) || 0;
  const resultConcentration = parseFloat(concentration as string) || 0;

  // Simple threshold logic for display
  const isDetected = resultConcentration > 0;

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-900">
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24 }}>
        <View className="flex-1 items-center justify-center space-y-8">
          {/* Header Status Icon */}
          <View
            className={cn(
              "w-24 h-24 rounded-full items-center justify-center mb-4",
              isDetected
                ? "bg-red-100 dark:bg-red-900/30"
                : "bg-blue-100 dark:bg-blue-900/30",
            )}
          >
            {isDetected ? (
              <AlertTriangle
                size={48}
                className="text-red-500 dark:text-red-400"
                strokeWidth={2.5}
              />
            ) : (
              <CheckCircle
                size={48}
                className="text-blue-500 dark:text-blue-400"
                strokeWidth={2.5}
              />
            )}
          </View>

          {/* Main Result Text */}
          <View className="items-center space-y-2">
            <Text className="text-3xl font-bold text-slate-900 dark:text-white text-center">
              {isDetected ? "중금속 검출 의심" : "분석 완료"}
            </Text>
            <Text className="text-slate-500 dark:text-slate-400 text-center text-base px-4">
              {isDetected
                ? "반응 영역이 감지되었습니다.\n상세 수치를 확인해 주세요."
                : "특이한 반응 영역이 감지되지 않았습니다.\n안전한 상태로 판단됩니다."}
            </Text>
          </View>

          {/* Detailed Stats Card */}
          <View className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 space-y-4 border border-slate-100 dark:border-slate-700/50">
            <Text className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">
              분석 상세 결과
            </Text>

            <View className="flex-row justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
              <Text className="text-slate-600 dark:text-slate-300 font-medium">
                측정 날짜
              </Text>
              <Text className="text-slate-900 dark:text-white font-medium">
                {new Date().toLocaleDateString()}
              </Text>
            </View>

            <View className="flex-row justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
              <Text className="text-slate-600 dark:text-slate-300 font-medium">
                반응 면적
              </Text>
              <View className="flex-row items-baseline gap-x-1">
                <Text className="text-xl font-bold text-slate-900 dark:text-white">
                  {resultArea}
                </Text>
                <Text className="text-sm text-slate-500">mm²</Text>
              </View>
            </View>

            <View className="flex-row justify-between items-center py-2">
              <Text className="text-slate-600 dark:text-slate-300 font-medium">
                CuSO₄ 추정 농도
              </Text>
              <View className="flex-row items-baseline gap-x-1">
                <Text
                  className={cn(
                    "text-xl font-bold",
                    isDetected
                      ? "text-red-500 dark:text-red-400"
                      : "text-slate-900 dark:text-white",
                  )}
                >
                  {resultConcentration > 0.0001
                    ? resultConcentration.toFixed(4)
                    : "0"}
                </Text>
                <Text className="text-sm text-slate-500">%</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="w-full pt-8 pb-4">
          <TouchableOpacity
            className="w-full bg-slate-900 dark:bg-white p-4 rounded-xl items-center flex-row justify-center space-x-2 active:opacity-90 shadow-sm"
            onPress={() => {
              // Reset navigation stack to home
              router.dismissAll();
              router.replace("/");
            }}
          >
            <Home className="text-white dark:text-slate-900" size={20} />
            <Text className="text-white dark:text-slate-900 font-bold text-lg ml-2">
              홈으로 돌아가기
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
