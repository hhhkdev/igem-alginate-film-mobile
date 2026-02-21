import { router } from "expo-router";
import { Platform } from "react-native";

/**
 * Safe go back: Go back to the previous screen if possible, otherwise navigate to home (/).
 */
export function safeGoBack() {
  webBlur();
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace("/");
  }
}

/**
 * Removes focus from the currently active element on Web to prevent 'aria-hidden' warnings
 * when navigating away from a screen with a focused element (like a button).
 */
export function webBlur() {
  if (Platform.OS === "web" && typeof document !== "undefined") {
    (document.activeElement as HTMLElement)?.blur?.();
  }
}
