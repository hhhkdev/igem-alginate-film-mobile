import { router } from "expo-router";

/**
 * 안전한 뒤로가기: 이전 화면이 있으면 뒤로 가고, 없으면 홈(/)으로 이동합니다.
 */
export function safeGoBack() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace("/");
  }
}
