import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { LogBox } from "react-native";
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from "react-native-reanimated";

// Disable strict mode to silence "Reading from value during render" warnings
// preventing them from obscuring real errors or causing render issues
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

LogBox.ignoreLogs([
  "SafeAreaView has been deprecated",
  "[Reanimated] Reading from `value` during component render",
]);

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }} />
      </View>
    </GestureHandlerRootView>
  );
}
