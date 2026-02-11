import { useLocalSearchParams, router } from "expo-router";
import { View, Text, Image, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  CheckCircle,
  AlertTriangle,
  Home,
  Share2,
  AlertOctagon,
} from "lucide-react-native";
import { analyzeHeavyMetal } from "../../lib/calculations";
import { cn } from "../../lib/utils"; // Make sure this path is correct

export default function ResultScreen() {
  const { result, imageUri } = useLocalSearchParams();
  const spotDiameter = parseFloat(result as string);

  const analysis = analyzeHeavyMetal(spotDiameter);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header Image Summary */}
        <View className="w-full h-64 bg-secondary relative mb-6">
          <Image
            source={{ uri: imageUri as string }}
            className="w-full h-full opacity-80"
            resizeMode="cover"
          />
          <View className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
          <View className="absolute bottom-4 left-6">
            <Text className="text-3xl font-bold text-foreground">
              분석 완료
            </Text>
            <Text className="text-muted-foreground">
              {new Date().toLocaleDateString()}
            </Text>
          </View>
        </View>

        <View className="px-6 space-y-6">
          {/* Status Card */}
          <View
            className={cn(
              "w-full rounded-2xl p-6 items-center shadow-lg border-2",
              analysis.isDetected
                ? "bg-red-50 border-destructive/20"
                : "bg-green-50 border-green-500/20",
            )}
          >
            {analysis.isDetected ? (
              <AlertOctagon
                size={48}
                className="text-destructive mb-4"
                color="#ef4444"
              />
            ) : (
              <CheckCircle
                size={48}
                className="text-green-500 mb-4"
                color="#22c55e"
              />
            )}

            <Text className="text-2xl font-bold text-foreground text-center mb-1">
              {analysis.message}
            </Text>
            <Text className="text-muted-foreground text-center">
              반응 영역 측정 기준
            </Text>
          </View>

          {/* Detailed Stats */}
          <View className="bg-card rounded-2xl p-6 border border-border shadow-sm space-y-4">
            <Text className="text-lg font-semibold text-foreground mb-2">
              상세 결과
            </Text>

            <View className="flex-row justify-between items-center py-2 border-b border-border">
              <Text className="text-muted-foreground">측정 면적</Text>
              <Text className="font-mono font-bold text-foreground">
                {result} mm²
              </Text>
            </View>
            <View className="flex-row justify-between items-center py-2 border-b border-border">
              <Text className="text-muted-foreground">추정 농도</Text>
              <Text className="font-mono font-bold text-foreground">
                {analysis.concentration}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="space-y-3 pt-4">
            <TouchableOpacity
              className="w-full bg-primary p-4 rounded-xl items-center flex-row justify-center space-x-2 active:opacity-90"
              onPress={() => router.dismissAll()}
            >
              <Home color="white" size={20} />
              <Text className="text-primary-foreground font-semibold text-lg ml-2">
                홈으로 돌아가기
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="w-full bg-secondary p-4 rounded-xl items-center flex-row justify-center space-x-2 active:opacity-90"
              onPress={() => {
                // Logic to share result
              }}
            >
              <Share2 color="black" size={20} />
              <Text className="text-secondary-foreground font-semibold text-lg ml-2">
                결과 공유하기
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
