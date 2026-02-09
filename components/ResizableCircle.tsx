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

  // context for gestures
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startRadius = useSharedValue(0);

  const onDrag = Gesture.Pan()
    .onStart(() => {
      startX.value = x.value;
      startY.value = y.value;
    })
    .onUpdate((event) => {
      x.value = startX.value + event.translationX;
      y.value = startY.value + event.translationY;
      runOnJS(onUpdate)(x.value, y.value, radius.value);
    });

  const onResize = Gesture.Pan()
    .onStart(() => {
      startRadius.value = radius.value;
    })
    .onUpdate((event) => {
      // Resize based on horizontal drag of the handle
      // Adding translationX to radius. We limit min radius to 10.
      const newRadius = startRadius.value + event.translationX;
      radius.value = Math.max(10, newRadius);
      runOnJS(onUpdate)(x.value, y.value, radius.value);
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: x.value }, { translateY: y.value }],
    } as any;
  });

  const circleStyle = useAnimatedStyle(() => {
    return {
      width: radius.value * 2,
      height: radius.value * 2,
      borderRadius: radius.value,
      marginLeft: -radius.value,
      marginTop: -radius.value,
      borderColor: color,
    };
  });

  const handleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: radius.value }, { translateY: 0 }], // Position handle at the right edge
    } as any;
  });

  return (
    <GestureDetector gesture={onDrag}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <Animated.View style={[styles.circle, circleStyle]} />
        {/* Center Point */}
        <View style={[styles.center, { backgroundColor: color }]} />

        {/* Resize Handle */}
        <GestureDetector gesture={onResize}>
          <Animated.View style={[styles.handleContainer, handleStyle]}>
            <View style={[styles.handle, { backgroundColor: color }]} />
          </Animated.View>
        </GestureDetector>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  circle: {
    borderWidth: 2,
    position: "absolute",
  },
  center: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  handleContainer: {
    position: "absolute",
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    left: 0,
    top: 0,
  },
  handle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "white",
  },
});
