import React from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
} from "react-native-reanimated";

interface ResizableCircleProps {
  initialX: number;
  initialY: number;
  initialRadius: number;
  color: string;
  onUpdate: (x: number, y: number, radius: number) => void;
  label?: string;
}

export const ResizableCircle = ({
  initialX,
  initialY,
  initialRadius,
  color,
  onUpdate,
}: ResizableCircleProps) => {
  const x = useSharedValue(initialX);
  const y = useSharedValue(initialY);
  const radius = useSharedValue(initialRadius);

  // 제스처 컨텍스트 (드래그/리사이즈 시작 시 값 저장용)
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startRadius = useSharedValue(0);

  // 원 이동(Drag) 제스처 핸들러
  const onDrag = Gesture.Pan()
    .onStart(() => {
      startX.value = x.value;
      startY.value = y.value;
    })
    .onUpdate((event) => {
      // 드래그 거리만큼 x, y 좌표 업데이트
      x.value = startX.value + event.translationX;
      y.value = startY.value + event.translationY;
      // 부모 컴포넌트에 변경 사항 알림 (JS 스레드에서 실행)
      runOnJS(onUpdate)(x.value, y.value, radius.value);
    });

  // 원 크기 조절(Resize) 제스처 핸들러
  const onResize = Gesture.Pan()
    .onStart(() => {
      startRadius.value = radius.value;
    })
    .onUpdate((event) => {
      // 핸들의 가로 이동 거리에 따라 반지름 조절
      // 최소 반지름을 10으로 제한
      const newRadius = startRadius.value + event.translationX;
      radius.value = Math.max(10, newRadius);
      // 부모 컴포넌트에 변경 사항 알림 (JS 스레드에서 실행)
      runOnJS(onUpdate)(x.value, y.value, radius.value);
    });

  // 원의 위치를 업데이트하는 애니메이션 스타일
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: x.value }, { translateY: y.value }],
    } as any;
  });

  // 원의 모양(크기)을 업데이트하는 애니메이션 스타일
  const circleStyle = useAnimatedStyle(() => {
    return {
      width: radius.value * 2,
      height: radius.value * 2,
      borderRadius: radius.value,
      marginLeft: -radius.value, // 중심점을 기준으로 배치하기 위해 마진 조정
      marginTop: -radius.value,
      borderColor: color,
    };
  });

  // 리사이즈 핸들의 위치를 업데이트하는 애니메이션 스타일
  const handleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: radius.value }, { translateY: 0 }], // 원의 오른쪽 가장자리에 핸들 배치
    } as any;
  });

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <GestureDetector gesture={onDrag}>
        <Animated.View style={[styles.circle, circleStyle]}>
          {/* Hit Slop for easier grabbing if needed, but circle is usually big enough */}
        </Animated.View>
      </GestureDetector>

      {/* Center Point - Non-interactive visual */}
      <View style={[styles.center, { backgroundColor: color }]} />

      {/* Resize Handle */}
      <GestureDetector gesture={onResize}>
        <Animated.View style={[styles.handleContainer, handleStyle]}>
          <View style={[styles.handle, { backgroundColor: color }]} />
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    // width/height removed to let it be 0x0 and move via transform
    // overflow visible allows children to be seen
  },
  circle: {
    borderWidth: 2,
    position: "absolute",
    // circleStyle sets width/height/borderRadius/margins
  },
  center: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: "absolute",
    left: 0,
    top: 0,
    marginLeft: -3,
    marginTop: -3,
    pointerEvents: "none", // Don't block touches
  },
  handleContainer: {
    position: "absolute",
    width: 40, // Increased touch area
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    left: 0,
    top: 0,
    marginLeft: -20, // Center the handle container
    marginTop: -20,
  },
  handle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
});
