import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="flex-1 bg-background md:bg-neutral-100 md:items-center md:justify-center">
        <View className="flex-1 w-full md:max-w-md md:h-[90vh] md:max-h-[900px] md:bg-background md:shadow-2xl md:rounded-3xl md:overflow-hidden md:border md:border-border/50">
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }} />
        </View>
      </View>
    </GestureHandlerRootView>
  );
}
