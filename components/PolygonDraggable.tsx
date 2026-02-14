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
  onOpen: () => void;
  onAddPoint: (x: number, y: number) => void;
  containerWidth: number;
  containerHeight: number;
}

// 점과 선분 사이의 최소 거리를 계산
function distToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax,
    dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);

  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = ax + t * dx;
  const projY = ay + t * dy;
  return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
}

export const PolygonDraggable = ({
  points,
  isClosed,
  onPointsUpdate,
  onClose,
  onOpen,
  onAddPoint,
  containerWidth,
  containerHeight,
}: PolygonDraggableProps) => {
  // 배경을 탭하여 점 추가 (Tap Gesture)
  const tapGesture = Gesture.Tap()
    .runOnJS(true)
    .onStart((e) => {
      if (!isClosed) {
        // 폴리곤이 열려있으면 끝에 점 추가
        onAddPoint(e.x, e.y);
      } else if (points.length >= 3) {
        // 닫힌 다각형: 가장 가까운 변(edge)을 찾아 그 사이에 점 삽입
        const TAP_THRESHOLD = 30; // 30px 이내의 탭만 인식
        let minDist = Infinity;
        let insertIndex = -1;

        for (let i = 0; i < points.length; i++) {
          const a = points[i];
          const b = points[(i + 1) % points.length];
          const dist = distToSegment(e.x, e.y, a.x, a.y, b.x, b.y);

          if (dist < minDist) {
            minDist = dist;
            insertIndex = i + 1;
          }
        }

        if (minDist < TAP_THRESHOLD && insertIndex >= 0) {
          const newPoint: Point = {
            id: `edge_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            x: e.x,
            y: e.y,
          };
          const newPoints = [...points];
          newPoints.splice(insertIndex, 0, newPoint);
          onPointsUpdate(newPoints);
        }
      }
    });

  const updatePoint = (id: string, x: number, y: number) => {
    const newPoints = points.map((p) => (p.id === id ? { ...p, x, y } : p));
    onPointsUpdate(newPoints);
  };

  const pointsString = points.map((p) => `${p.x},${p.y}`).join(" ");

  const handleDeletePoint = (id: string) => {
    const newPoints = points.filter((p) => p.id !== id);
    onPointsUpdate(newPoints);

    // 삭제 후 3개 미만이면 폴리곤 열기
    if (isClosed && newPoints.length < 3) {
      onOpen();
    }
  };

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
              fill="rgba(239, 68, 68, 0.3)"
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
            onDelete={handleDeletePoint}
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
  onDelete: (id: string) => void;
}

const DraggablePoint = ({
  point,
  index,
  onUpdate,
  isFirst,
  canClose,
  onClose,
  onDelete,
}: DraggablePointProps) => {
  const initialPos = useRef({ x: 0, y: 0 });

  // 점 이동(Drag) 제스처 핸들러
  const pan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(8)
    .onStart(() => {
      initialPos.current = { x: point.x, y: point.y };
    })
    .onUpdate((e) => {
      onUpdate(
        point.id,
        initialPos.current.x + e.translationX,
        initialPos.current.y + e.translationY,
      );
    });

  // 점 탭(Tap) 제스처 핸들러 (첫 번째 점: 닫기 / 그 외: 삭제)
  const tap = Gesture.Tap()
    .runOnJS(true)
    .maxDuration(250)
    .onEnd(() => {
      if (isFirst && canClose) {
        onClose();
      } else {
        onDelete(point.id);
      }
    });

  const gesture = Gesture.Race(pan, tap);

  const HANDLE_SIZE = 24; // 터치 영역
  const DOT_SIZE = 8; // 시각적 점 크기

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={[
          styles.handle,
          {
            width: HANDLE_SIZE,
            height: HANDLE_SIZE,
            left: point.x - HANDLE_SIZE / 2,
            top: point.y - HANDLE_SIZE / 2,
          },
          isFirst && canClose ? styles.closeHandle : null,
        ]}
      >
        <View
          style={[
            styles.dot,
            {
              width: DOT_SIZE,
              height: DOT_SIZE,
              borderRadius: DOT_SIZE / 2,
            },
          ]}
        />
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  handle: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  dot: {
    backgroundColor: "#ef4444",
    borderWidth: 1.5,
    borderColor: "white",
  },
  closeHandle: {
    transform: [{ scale: 1.3 }],
  },
});
