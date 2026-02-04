import { View, Text, Pressable } from "react-native";
import { Link, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Scan, ArrowRight } from "lucide-react-native";

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-secondary justify-center items-center p-6">
      <View className="bg-background w-full max-w-sm p-8 rounded-3xl shadow-lg items-center space-y-8">
        <View className="bg-primary/10 p-6 rounded-full">
          <Scan
            size={48}
            className="text-primary"
            strokeWidth={1.5}
            color="#3b82f6"
          />
        </View>

        <View className="items-center space-y-3">
          <Text className="text-3xl font-bold text-foreground text-center tracking-tight">
            Alginate Film
            {"\n"}Analysis
          </Text>
          <Text className="text-muted-foreground text-center text-lg leading-6">
            Detect heavy metals precisely
            {"\n"}using mobile colorimetry.
          </Text>
        </View>

        <View className="w-full pt-4">
          <Pressable
            className="w-full bg-primary h-14 rounded-2xl flex-row justify-center items-center space-x-2 active:opacity-90 active:scale-95 transition-all"
            onPress={() => router.push("/camera")}
          >
            <Text className="text-primary-foreground font-bold text-lg">
              Start Analysis
            </Text>
            <ArrowRight
              size={20}
              className="text-primary-foreground"
              color="white"
            />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
