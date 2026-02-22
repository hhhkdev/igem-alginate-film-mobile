import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, LogBox, Platform, Text, TextInput } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ToastProvider } from "../components/ToastProvider";
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from "react-native-reanimated";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

// 글로벌 폰트 설정 패치 (React Native 0.73 이상에서도 일부 작동)
interface TextWithDefaultProps extends React.FunctionComponent<any> {
  defaultProps?: { style?: any };
}
(Text as unknown as TextWithDefaultProps).defaultProps =
  (Text as unknown as TextWithDefaultProps).defaultProps || {};
(Text as unknown as TextWithDefaultProps).defaultProps!.style = {
  fontFamily: "Pretendard-Regular",
};

(TextInput as unknown as TextWithDefaultProps).defaultProps =
  (TextInput as unknown as TextWithDefaultProps).defaultProps || {};
(TextInput as unknown as TextWithDefaultProps).defaultProps!.style = {
  fontFamily: "Pretendard-Regular",
};

SplashScreen.preventAutoHideAsync();

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
  const [loaded, error] = useFonts({
    "Pretendard-Black": require("../assets/fonts/Pretendard-Black.otf"),
    "Pretendard-Bold": require("../assets/fonts/Pretendard-Bold.otf"),
    "Pretendard-ExtraBold": require("../assets/fonts/Pretendard-ExtraBold.otf"),
    "Pretendard-ExtraLight": require("../assets/fonts/Pretendard-ExtraLight.otf"),
    "Pretendard-Light": require("../assets/fonts/Pretendard-Light.otf"),
    "Pretendard-Medium": require("../assets/fonts/Pretendard-Medium.otf"),
    "Pretendard-Regular": require("../assets/fonts/Pretendard-Regular.otf"),
    "Pretendard-SemiBold": require("../assets/fonts/Pretendard-SemiBold.otf"),
    "Pretendard-Thin": require("../assets/fonts/Pretendard-Thin.otf"),
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

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
