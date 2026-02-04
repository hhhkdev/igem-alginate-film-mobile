import { View, Text, Pressable } from "react-native";
import { Link, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background justify-center items-center p-4">
      <View className="max-w-md w-full space-y-8">
        <View className="items-center space-y-2">
          <Text className="text-4xl font-bold text-foreground text-center">
            Alginate Analysis
          </Text>
          <Text className="text-muted-foreground text-center text-lg">
            Detect heavy metals with precision.
          </Text>
        </View>

        <View className="space-y-4">
          <Pressable
            className="w-full bg-primary p-4 rounded-xl items-center active:opacity-90 transition-opacity"
            onPress={() => router.push("/camera")}
          >
            <Text className="text-primary-foreground font-semibold text-lg">
              Start Analysis
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
