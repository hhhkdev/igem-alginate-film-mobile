import React, { useRef } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Svg, { Ellipse } from "react-native-svg";
import { Move } from "lucide-react-native";

interface ResizableEllipseProps {
  x: number;
  y: number;
  rx: number;
  ry: number;
  color?: string;
  onUpdate: (x: number, y: number, rx: number, ry: number) => void;
  containerWidth: number;
  containerHeight: number;
}

export const ResizableEllipse = ({
  x,
  y,
  rx,
  ry,
  color = "#ef4444",
  onUpdate,
  containerWidth,
  containerHeight
}: ResizableEllipseProps) => {
  
  const panCenterInitial = useRef({ x: 0, y: 0 });
  const centerPan = Gesture.Pan()
    .runOnJS(true)
    .onStart(() => {
      panCenterInitial.current = { x, y };
    })
    .onUpdate((e) => {
      onUpdate(panCenterInitial.current.x + e.translationX, panCenterInitial.current.y + e.translationY, rx, ry);
    });

  const panRxInitial = useRef(0);
  const rxPan = Gesture.Pan()
    .runOnJS(true)
    .onStart(() => {
      panRxInitial.current = rx;
    })
    .onUpdate((e) => {
      onUpdate(x, y, Math.max(10, panRxInitial.current + e.translationX), ry);
    });

  const panRyInitial = useRef(0);
  const ryPan = Gesture.Pan()
    .runOnJS(true)
    .onStart(() => {
      panRyInitial.current = ry;
    })
    .onUpdate((e) => {
      onUpdate(x, y, rx, Math.max(10, panRyInitial.current + e.translationY));
    });

  return (
    <View style={{ position: "absolute", width: containerWidth, height: containerHeight }}>
      <Svg style={StyleSheet.absoluteFill} width={containerWidth} height={containerHeight}>
        <Ellipse
          cx={x}
          cy={y}
          rx={Math.max(10, rx)}
          ry={Math.max(10, ry)}
          fill="rgba(239, 68, 68, 0.3)"
          stroke={color}
          strokeWidth="2"
        />
      </Svg>

      <GestureDetector gesture={centerPan}>
        <View style={[styles.handle, styles.centerHandle, { left: x - 22, top: y - 22 }]}>
          <Move size={20} color={color} />
        </View>
      </GestureDetector>

      <GestureDetector gesture={rxPan}>
        <View style={[styles.handle, styles.edgeHandle, { left: x + Math.max(10, rx) - 12, top: y - 12, backgroundColor: color }]} />
      </GestureDetector>

      <GestureDetector gesture={ryPan}>
        <View style={[styles.handle, styles.edgeHandle, { left: x - 12, top: y + Math.max(10, ry) - 12, backgroundColor: color }]} />
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  handle: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  centerHandle: {
    width: 44,
    height: 44,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 22,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  edgeHandle: {
    width: 24,
    height: 24,
    backgroundColor: "#ef4444",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "white",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  }
});
