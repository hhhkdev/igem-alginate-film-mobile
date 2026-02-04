import { useLocalSearchParams, router } from "expo-router";
import {
  View,
  Image,
  Text,
  TextInput,
  Dimensions,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { ResizableCircle } from "../../components/ResizableCircle";
import { ArrowLeft, CheckCircle, AlertCircle } from "lucide-react-native";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;

export default function AnalysisScreen() {
  const { imageUri } = useLocalSearchParams();
  const [filmDiameter, setFilmDiameter] = useState("25"); // Default 25mm?

  // State for circles
  // Ref Circle (Blue) - Matches the full film
  const [refCircle, setRefCircle] = useState({
    x: SCREEN_WIDTH / 2,
    y: SCREEN_HEIGHT / 3,
    radius: 100,
  });

  // Target Circle (Red) - Matches the inner spot
  const [targetCircle, setTargetCircle] = useState({
    x: SCREEN_WIDTH / 2,
    y: SCREEN_HEIGHT / 3,
    radius: 40,
  });

  const calculateResult = () => {
    const realDiameter = parseFloat(filmDiameter);
    if (isNaN(realDiameter) || realDiameter <= 0) return 0;

    // Pixel ratio
    const pixelToMm = realDiameter / (refCircle.radius * 2);
    const targetDiameterMm = targetCircle.radius * 2 * pixelToMm;

    return targetDiameterMm;
  };

  const resultMm = calculateResult();
  const isHeavyMetalDetected = resultMm > 0; // Placeholder logic.
  // TODO: Add specific threshold logic if user provided it.
  // "특정 수식을 대입하여 중금속이 검출되었는가를 알아내는 것이 주 목적" - The user mentioned a formula.
  // For now, I'll calculate just the diameter.
  // I will assume for now that simply *measuring* is the first step.
  // But the prompt says "specific formula". Since I don't have the formula, I will display the raw diameter and a placeholder status.

  return (
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
        {/* Reference Circle (Film) */}
        <ResizableCircle
          color="#3b82f6" // blue-500
          initialX={refCircle.x}
          initialY={refCircle.y}
          initialRadius={refCircle.radius}
          onUpdate={(x, y, radius) => setRefCircle({ x, y, radius })}
        />

        {/* Target Circle (Spot) */}
        <ResizableCircle
          color="#ef4444" // red-500
          initialX={targetCircle.x}
          initialY={targetCircle.y}
          initialRadius={targetCircle.radius}
          onUpdate={(x, y, radius) => setTargetCircle({ x, y, radius })}
        />
      </View>

      {/* UI Controls */}
      <SafeAreaView className="absolute top-0 left-0 w-full" edges={["top"]}>
        <View className="flex-row items-center p-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 rounded-full bg-black/50"
          >
            <ArrowLeft color="white" size={24} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Bottom Sheet Results */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="absolute bottom-0 w-full bg-background rounded-t-3xl p-6 shadow-2xl"
      >
        <SafeAreaView edges={["bottom"]}>
          <View className="space-y-4">
            {/* Header */}
            <View className="flex-row justify-between items-center">
              <Text className="text-xl font-bold text-foreground">
                Analysis Result
              </Text>
              {/* Visual Legend */}
              <View className="flex-row space-x-4">
                <View className="flex-row items-center space-x-1">
                  <View className="w-3 h-3 rounded-full bg-blue-500" />
                  <Text className="text-xs text-muted-foreground">Film</Text>
                </View>
                <View className="flex-row items-center space-x-1">
                  <View className="w-3 h-3 rounded-full bg-red-500" />
                  <Text className="text-xs text-muted-foreground">Spot</Text>
                </View>
              </View>
            </View>

            <View className="h-px bg-border my-2" />

            {/* Input Section */}
            <View className="flex-row items-center justify-between">
              <Text className="text-muted-foreground font-medium">
                Film Diameter
              </Text>
              <View className="flex-row items-center bg-secondary rounded-lg px-3 py-2 w-32">
                <TextInput
                  className="flex-1 text-right font-semibold text-foreground mr-1"
                  keyboardType="numeric"
                  value={filmDiameter}
                  onChangeText={setFilmDiameter}
                  placeholder="25"
                />
                <Text className="text-muted-foreground text-sm">mm</Text>
              </View>
            </View>

            {/* Result Section - Highlighted like Toss */}
            <View className="bg-primary/10 rounded-2xl p-4 mt-2">
              <Text className="text-primary text-sm font-semibold mb-1">
                Measured Spot Diameter
              </Text>
              <Text className="text-3xl font-bold text-primary">
                {resultMm.toFixed(2)}
                <Text className="text-lg font-medium text-primary/70"> mm</Text>
              </Text>

              {/* Placeholder for Heavy Metal Detection Status */}
              {/* Assuming larger spot = reaction? Or specific size? */}
              {/* For now, just showing the measurement is the key requested feature "직경을 알아내고자 해" */}
            </View>

            <TouchableOpacity
              className="w-full bg-primary p-4 rounded-xl items-center active:opacity-90 mt-2"
              onPress={() => {
                // Navigate to a dedicated result page or just log it?
                // User asked for "Result Screen" in step 3 of my plan ("app/result/index.tsx").
                // So I should pass this data to a result screen.
                router.push({
                  pathname: "/result",
                  params: {
                    result: resultMm.toFixed(2),
                    imageUri: imageUri as string,
                  },
                });
              }}
            >
              <Text className="text-primary-foreground font-semibold text-lg">
                Save & detailed View
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}
