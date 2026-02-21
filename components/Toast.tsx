import React, { useEffect } from "react";
import { Text, StyleSheet, SafeAreaView, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
} from "react-native-reanimated";
import { Info, CheckCircle, AlertCircle } from "lucide-react-native";
import { tokens } from "../lib/design-tokens";

interface ToastProps {
  visible: boolean;
  message: string;
  type?: "info" | "success" | "error";
  onHide?: () => void;
}

export function Toast({ visible, message, type = "info", onHide }: ToastProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 300 });
      translateY.value = withTiming(0, { duration: 300 });
    } else {
      opacity.value = withTiming(0, { duration: 300 });
      translateY.value = withTiming(20, { duration: 300 });
    }
  }, [visible, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });

  // Don't render anything if completely invisible to prevent touch blocking
  if (!visible && opacity.value === 0) return null;

  let Icon;
  let color;
  let bgColor;

  switch (type) {
    case "success":
      Icon = CheckCircle;
      color = "#15803d"; // bg-green-700
      bgColor = "#f0fdf4"; // bg-green-50
      break;
    case "error":
      Icon = AlertCircle;
      color = tokens.color.accentRedDark;
      bgColor = tokens.color.accentRedBg;
      break;
    case "info":
    default:
      Icon = Info;
      color = tokens.color.textSecondary;
      bgColor = tokens.color.bgPrimary;
      break;
  }

  return (
    <SafeAreaView style={styles.container} pointerEvents="none">
      <Animated.View
        style={[styles.toast, { backgroundColor: bgColor }, animatedStyle]}
      >
        <Icon size={20} color={color} />
        <Text style={[styles.message, { color }]}>{message}</Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 24, // Positioned near bottom
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 9999,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: tokens.radius.pill,
    gap: 8,
    ...tokens.shadow.ctaDark,
    marginHorizontal: 24,
  },
  message: {
    ...tokens.font.subtitle,
    fontSize: 14,
    fontWeight: "600",
  },
});
