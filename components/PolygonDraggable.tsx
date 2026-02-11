import React, { useRef } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Svg, { Polygon, Polyline, Circle } from "react-native-svg";

interface Point {
  x: number;
  y: number;
  id: string;
}

interface PolygonDraggableProps {
  points: Point[];
  isClosed: boolean;
  onPointsUpdate: (points: Point[]) => void;
  onClose: () => void;
  onAddPoint: (x: number, y: number) => void;
  containerWidth: number;
  containerHeight: number;
}

export const PolygonDraggable = ({
  points,
  isClosed,
  onPointsUpdate,
  onClose,
  onAddPoint,
  containerWidth,
  containerHeight,
}: PolygonDraggableProps) => {
  // 배경을 탭하여 점 추가 (Tap Gesture)
  const tapGesture = Gesture.Tap()
    .runOnJS(true)
    .onStart((e) => {
      // 폴리곤이 닫히지 않은 상태일 때만 새로운 점 추가 가능
      if (!isClosed) {
        onAddPoint(e.x, e.y);
      }
    });

  const updatePoint = (id: string, x: number, y: number) => {
    const newPoints = points.map((p) => (p.id === id ? { ...p, x, y } : p));
    onPointsUpdate(newPoints);
  };

  const pointsString = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <GestureDetector gesture={tapGesture}>
      <View
        style={{
          width: containerWidth,
          height: containerHeight,
          position: "absolute",
        }}
      >
        <Svg
          height={containerHeight}
          width={containerWidth}
          style={StyleSheet.absoluteFill}
        >
          {isClosed ? (
            <Polygon
              points={pointsString}
              fill="rgba(239, 68, 68, 0.3)" // red-500 with opacity
              stroke="#ef4444"
              strokeWidth="2"
            />
          ) : (
            <Polyline
              points={pointsString}
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
            />
          )}
          {/* Render draggable handles for each point if needed */}
          {/* Note: Svg doesn't support Gesture Handlers inside easily without referencing. 
              We should render Views on top of SVG for handles. */}
        </Svg>

        {points.map((p, index) => (
          <DraggablePoint
            key={p.id}
            point={p}
            index={index}
            onUpdate={updatePoint}
            isFirst={index === 0}
            canClose={points.length > 2 && !isClosed}
            onClose={onClose}
          />
        ))}
      </View>
    </GestureDetector>
  );
};

interface DraggablePointProps {
  point: Point;
  index: number;
  onUpdate: (id: string, x: number, y: number) => void;
  isFirst: boolean;
  canClose: boolean;
  onClose: () => void;
}

const DraggablePoint = ({
  point,
  index,
  onUpdate,
  isFirst,
  canClose,
  onClose,
}: DraggablePointProps) => {
  const initialPos = useRef({ x: 0, y: 0 });

  // 점 이동(Drag) 제스처 핸들러
  const pan = Gesture.Pan()
    .runOnJS(true)
    .onStart(() => {
      // 드래그 시작 시 현재 점의 위치 저장
      initialPos.current = { x: point.x, y: point.y };
    })
    .onUpdate((e) => {
      // 드래그 거리만큼 위치 업데이트하여 부모에게 알림
      onUpdate(
        point.id,
        initialPos.current.x + e.translationX,
        initialPos.current.y + e.translationY,
      );
    });

  // 점 탭(Tap) 제스처 핸들러 (첫 번째 점을 눌러 폴리곤 닫기용)
  const tap = Gesture.Tap()
    .runOnJS(true)
    .onEnd(() => {
      if (isFirst && canClose) {
        onClose();
      }
    });

  // 제스처 구성:
  // 첫 번째 점이면서 폴리곤을 닫을 수 있는 상태(점 3개 이상)라면
  // 드래그(Pan)와 탭(Tap)을 동시에 인식하도록 설정 (Simultaneous)
  // 그렇지 않으면 드래그(Pan)만 인식

  const gesture = isFirst && canClose ? Gesture.Simultaneous(pan, tap) : pan;

  // 참고:
  // Pan과 Tap을 동시에 사용할 때, 드래그 의도와 탭 의도를 구분하는 것이 중요합니다.
  // Simultaneous를 사용하면 두 제스처가 모두 활성화될 수 있습니다.
  // 여기서는 탭 동작이 "종료(onEnd)"에 트리거되므로, 드래그 없이 눌렀다 떼면 탭으로 인식되고,
  // 움직이면 Pan이 업데이트를 발생시킵니다.

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={[
          styles.handle,
          {
            left: point.x - 15, // Center the 30x30 touch area
            top: point.y - 15,
          },
          isFirst && !canClose ? styles.firstHandle : null,
          isFirst && canClose ? styles.closeHandle : null,
        ]}
      >
        <View style={styles.dot} />
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  handle: {
    position: "absolute",
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    // backgroundColor: 'rgba(255,255,255,0.3)', // debug touch area
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#ef4444",
    borderWidth: 2,
    borderColor: "white",
  },
  firstHandle: {
    // maybe different style?
  },
  closeHandle: {
    // Indicate clickable to close
    transform: [{ scale: 1.2 }],
    // Maybe invalid style prop for View, but simple scale is fine if animated,
    // here static style.
  },
});
