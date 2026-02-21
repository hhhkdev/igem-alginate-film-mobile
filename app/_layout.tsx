import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, LogBox, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ToastProvider } from "../components/ToastProvider";
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from "react-native-reanimated";

if (Platform.OS === "web") {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("props.pointerEvents is deprecated")
    ) {
      return;
    }
    originalWarn(...args);
  };

  const originalError = console.error;
  console.error = (...args) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("The action 'GO_BACK' was not handled by any navigator")
    ) {
      return;
    }
    originalError(...args);
  };
}

// Disable strict mode to silence "Reading from value during render" warnings
// preventing them from obscuring real errors or causing render issues
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

LogBox.ignoreLogs([
  "SafeAreaView has been deprecated",
  "[Reanimated] Reading from `value` during component render",
  "props.pointerEvents is deprecated",
  "The action 'GO_BACK' was not handled by any navigator.",
]);

export default function RootLayout() {
  return (
    <ToastProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }} />
        </View>
      </GestureHandlerRootView>
    </ToastProvider>
  );
}
