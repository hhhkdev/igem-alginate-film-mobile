import React, { useRef } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Svg, { Polygon, Polyline, Circle } from "react-native-svg";
import { Move } from "lucide-react-native";

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
  const initialPointsRef = useRef<Point[]>([]);

  // Centroid computation
  let cx = 0, cy = 0;
  if (isClosed && points.length >= 3) {
    let sumX = 0, sumY = 0;
    for (const p of points) {
      sumX += p.x;
      sumY += p.y;
    }
    cx = sumX / points.length;
    cy = sumY / points.length;
  }

  const initialBBoxRef = useRef({ cx: 0, cy: 0, width: 1, height: 1 });

  const recordInitialState = () => {
    initialPointsRef.current = [...points];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    initialBBoxRef.current = {
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY),
    };
  };

  // 1. 전체 이동(Drag)
  const centerPan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(1)
    .onStart(recordInitialState)
    .onUpdate((e) => {
      const newPoints = initialPointsRef.current.map(p => ({
        ...p,
        x: p.x + e.translationX,
        y: p.y + e.translationY,
      }));
      onPointsUpdate(newPoints);
    });

  // 2. 가로 늘리기 (Scale X) - 우측 핸들
  const scaleXPan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(1)
    .onStart(recordInitialState)
    .onUpdate((e) => {
      const { cx, width } = initialBBoxRef.current;
      // 드래그한 만큼 가로 전체 폭이 늘어나도록 비율 계산 (중앙 고정)
      const newWidth = Math.max(10, width + e.translationX * 2);
      const scaleX = newWidth / width;
      const newPoints = initialPointsRef.current.map(p => ({
        ...p,
        x: cx + (p.x - cx) * scaleX,
        y: p.y,
      }));
      onPointsUpdate(newPoints);
    });

  // 3. 세로 늘리기 (Scale Y) - 하단 핸들
  const scaleYPan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(1)
    .onStart(recordInitialState)
    .onUpdate((e) => {
      const { cy, height } = initialBBoxRef.current;
      const newHeight = Math.max(10, height + e.translationY * 2);
      const scaleY = newHeight / height;
      const newPoints = initialPointsRef.current.map(p => ({
        ...p,
        x: p.x,
        y: cy + (p.y - cy) * scaleY,
      }));
      onPointsUpdate(newPoints);
    });

  // 4. 모서리 잡고 전체 비례 축소/확대 (일정 비율)
  const scaleUniformPan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(1)
    .onStart(recordInitialState)
    .onUpdate((e) => {
      const { cx, cy, width, height } = initialBBoxRef.current;
      // 대각선 드래그 시 가장 큰 변화량을 적용
      const scaleChange = Math.max(e.translationX / width, e.translationY / height) * 2;
      const scale = Math.max(0.1, 1 + scaleChange);
      
      const newPoints = initialPointsRef.current.map(p => ({
        ...p,
        x: cx + (p.x - cx) * scale,
        y: cy + (p.y - cy) * scale,
      }));
      onPointsUpdate(newPoints);
    });

  // Bounding Box (렌더링 용)
  let bbox = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
  if (isClosed && points.length >= 3) {
    for (const p of points) {
      if (p.x < bbox.minX) bbox.minX = p.x;
      if (p.x > bbox.maxX) bbox.maxX = p.x;
      if (p.y < bbox.minY) bbox.minY = p.y;
      if (p.y > bbox.maxY) bbox.maxY = p.y;
    }
  }

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

        {/* 전체 다각형 이동 및 스케일링 핸들들 */}
        {isClosed && points.length >= 3 && (
          <>
            {/* 가이드 바운딩 박스 (점선 렌더링) */}
            <View
              style={{
                position: 'absolute',
                left: bbox.minX,
                top: bbox.minY,
                width: bbox.maxX - bbox.minX,
                height: bbox.maxY - bbox.minY,
                borderWidth: 1,
                borderColor: 'rgba(239, 68, 68, 0.3)',
                borderStyle: 'dashed',
                pointerEvents: 'none',
              }}
            />

            {/* 정중앙 이동(Move) 핸들 */}
            <GestureDetector gesture={centerPan}>
              <View
                style={[
                  styles.handle,
                  {
                    width: 44,
                    height: 44,
                    left: cx - 22,
                    top: cy - 22,
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    borderRadius: 22,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 3.84,
                    elevation: 5,
                    zIndex: 10,
                  }
                ]}
              >
                <Move size={20} color="#ef4444" />
              </View>
            </GestureDetector>

            {/* 우측 늘리기 핸들 (Scale X) */}
            <GestureDetector gesture={scaleXPan}>
              <View style={[styles.handle, styles.scaleEdgeHandle, { left: bbox.maxX - 12, top: cy - 12 }]} />
            </GestureDetector>

            {/* 하단 늘리기 핸들 (Scale Y) */}
            <GestureDetector gesture={scaleYPan}>
              <View style={[styles.handle, styles.scaleEdgeHandle, { left: cx - 12, top: bbox.maxY - 12 }]} />
            </GestureDetector>

            {/* 우측 하단 대각선 축소/확대 핸들 (Scale Uniform) */}
            <GestureDetector gesture={scaleUniformPan}>
              <View style={[styles.handle, styles.scaleCornerHandle, { left: bbox.maxX - 16, top: bbox.maxY - 16 }]} />
            </GestureDetector>
          </>
        )}

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
    .minDistance(1)
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
    elevation: 4,
  },
  closeHandle: {
    transform: [{ scale: 1.3 }],
  },
  scaleEdgeHandle: {
    width: 24,
    height: 24,
    backgroundColor: "rgba(239, 68, 68, 0.8)",
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "white",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 5,
  },
  scaleCornerHandle: {
    width: 32,
    height: 32,
    backgroundColor: "#ef4444",
    borderRadius: 16,
    borderWidth: 3,
    borderColor: "white",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 6,
  }
});
