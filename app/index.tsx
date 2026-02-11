import { View, Text, Pressable } from "react-native";
import { Link, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Scan, ArrowRight } from "lucide-react-native";

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-900 justify-center items-center p-6">
      <View className="w-full max-w-sm space-y-10">
        {/* Header Section */}
        <View className="items-center space-y-4">
          <View className="bg-blue-500/10 p-7 rounded-full mb-2 ring-1 ring-blue-500/20">
            <Scan
              size={52}
              className="text-blue-600 dark:text-blue-400"
              strokeWidth={1.8}
            />
          </View>
          <Text className="text-4xl font-extrabold text-slate-900 dark:text-white text-center tracking-tight">
            알지네이트 모델
          </Text>
          <Text className="text-slate-500 dark:text-slate-400 text-center text-lg leading-7 px-4 font-medium">
            <Text className="text-blue-600 dark:text-blue-400 font-semibold">
              비색법(Colorimetry)
            </Text>
            을 기반으로 한{"\n"}
            정밀 중금속 검출
          </Text>
        </View>

        {/* Action Section */}
        <View className="space-y-4 pt-4">
          <Pressable
            className="w-full bg-blue-600 hover:bg-blue-700 h-16 rounded-3xl flex-row justify-center items-center space-x-3 active:scale-[0.98] transition-transform shadow-lg shadow-blue-500/30"
            onPress={() => router.push("/input-details")}
          >
            <Text className="text-white font-bold text-xl">분석 시작하기</Text>
            <ArrowRight size={22} color="white" strokeWidth={2.5} />
          </Pressable>

          <Text className="text-center text-slate-400 text-sm">
            v1.0.0 • 오프라인 사용 가능
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
