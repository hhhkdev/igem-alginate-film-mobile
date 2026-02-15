import React from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
} from "react-native-reanimated";

interface ResizableLineProps {
  initialStart: { x: number; y: number };
  initialEnd: { x: number; y: number };
  color: string;
  onUpdate: (
    start: { x: number; y: number },
    end: { x: number; y: number },
  ) => void;
}

export const ResizableLine = ({
  initialStart,
  initialEnd,
  color,
  onUpdate,
}: ResizableLineProps) => {
  const startX = useSharedValue(initialStart.x);
  const startY = useSharedValue(initialStart.y);
  const endX = useSharedValue(initialEnd.x);
  const endY = useSharedValue(initialEnd.y);

  // 제스처 컨텍스트 (드래그 시작 위치 저장용)
  const contextStartX = useSharedValue(0);
  const contextStartY = useSharedValue(0);
  const contextEndX = useSharedValue(0);
  const contextEndY = useSharedValue(0);

  // 부모 컴포넌트에 업데이트된 좌표를 전달하는 함수
  const updateParent = () => {
    onUpdate(
      { x: startX.value, y: startY.value },
      { x: endX.value, y: endY.value },
    );
  };

  // 시작점 핸들 드래그 제스처 정의
  const dragStart = Gesture.Pan()
    .onStart(() => {
      // 드래그 시작 시 현재 위치를 컨텍스트에 저장
      contextStartX.value = startX.value;
      contextStartY.value = startY.value;
    })
    .onUpdate((event) => {
      // 드래그 이동 거리를 더해 새로운 위치 계산
      startX.value = contextStartX.value + event.translationX;
      startY.value = contextStartY.value + event.translationY;
      // JS 스레드에서 콜백 실행하여 부모 상태 업데이트
      runOnJS(updateParent)();
    });

  // 끝점 핸들 드래그 제스처 정의
  const dragEnd = Gesture.Pan()
    .onStart(() => {
      contextEndX.value = endX.value;
      contextEndY.value = endY.value;
    })
    .onUpdate((event) => {
      endX.value = contextEndX.value + event.translationX;
      endY.value = contextEndY.value + event.translationY;
      runOnJS(updateParent)();
    });

  // 핸들의 애니메이션 스타일 정의
  const startHandleStyle = useAnimatedStyle(
    () =>
      ({
        transform: [{ translateX: startX.value }, { translateY: startY.value }],
      }) as any,
  );

  const endHandleStyle = useAnimatedStyle(
    () =>
      ({
        transform: [{ translateX: endX.value }, { translateY: endY.value }],
      }) as any,
  );

  // SVG Line의 애니메이션 props 정의
  // Reanimated는 Animated 컴포넌트와 가장 잘 동작합니다.
  // SVG 라인 props를 직접 애니메이션화하기 어렵기 때문에
  // View를 절대 위치로 배치하고 너비와 회전을 통해 라인을 시각적으로 표현하는 방식을 사용합니다.

  // 양 끝점 위치를 기반으로 라인의 정확한 위치와 회전을 계산하는 Animated Style
  // 시작점(startX, startY)과 끝점(endX, endY) 사이의 거리(length)와 각도(angle)를 계산하여
  // 라인을 그려주는 View의 스타일을 동적으로 업데이트합니다.

  const betterLineStyle = useAnimatedStyle(() => {
    const dx = endX.value - startX.value; // x축 거리 차이
    const dy = endY.value - startY.value; // y축 거리 차이
    const length = Math.sqrt(dx * dx + dy * dy); // 피타고라스 정리를 이용한 선의 길이 계산
    const angle = Math.atan2(dy, dx); // 아크탄젠트를 이용한 선의 각도 계산 (라디안)
    const midX = (startX.value + endX.value) / 2; // 선의 중심 x 좌표
    const midY = (startY.value + endY.value) / 2; // 선의 중심 y 좌표

    return {
      width: length, // 선의 길이를 너비로 설정
      height: 2, // 선의 두께
      backgroundColor: color, // 선의 색상
      position: "absolute", // 절대 위치 사용
      top: 0,
      left: 0,
      transform: [
        { translateX: midX - length / 2 }, // 중심점으로 이동 후 길이의 절반만큼 왼쪽으로 이동하여 중앙 정렬
        { translateY: midY - 1 }, // 중심점 y좌표로 이동 (두께의 절반만큼 보정)
        { rotate: `${angle}rad` }, // 계산된 각도만큼 회전
      ],
    } as any;
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Visual Line */}
      <Animated.View style={betterLineStyle} />

      {/* Start Handle */}
      <GestureDetector gesture={dragStart}>
        <Animated.View style={[styles.handleContainer, startHandleStyle]}>
          <View style={[styles.handle, { backgroundColor: color }]} />
        </Animated.View>
      </GestureDetector>

      {/* End Handle */}
      <GestureDetector gesture={dragEnd}>
        <Animated.View style={[styles.handleContainer, endHandleStyle]}>
          <View style={[styles.handle, { backgroundColor: color }]} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  handleContainer: {
    position: "absolute",
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: -20, // Center the touch area
    marginTop: -20,
  },
  handle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "white",
    elevation: 4,
  },
});
