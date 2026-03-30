import React, { useCallback, useRef, useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent, PanResponder } from 'react-native';
import Svg, { G } from 'react-native-svg';
import { FlowProps, Node, Edge } from '../types';
import { FlowContext } from '../store/FlowStore';
import { useFlow } from '../hooks/useFlow';
import { FlowNode } from './FlowNode';
import { FlowEdge, EdgeLabel } from './FlowEdge';
import { MiniMap } from './MiniMap';
import { Controls } from './Controls';
import { clamp } from '../utils/geometry';

interface FlowCanvasProps extends FlowProps {
  showMiniMap?: boolean;
  showControls?: boolean;
}

export const FlowCanvas: React.FC<FlowCanvasProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onEdgePress,
  onPanePress,
  nodeTypes,
  defaultViewport,
  minZoom = 0.1,
  maxZoom = 4,
  snapToGrid: enableSnap = false,
  snapGrid = [15, 15],
  panOnDrag = true,
  zoomOnPinch = true,
  style,
  children,
  showMiniMap = true,
  showControls = true,
}) => {
  const { state, actions, viewport, setViewport, fitView } = useFlow({
    nodes,
    edges,
    defaultViewport,
    onNodesChange,
    onEdgesChange,
    onConnect,
    minZoom,
    maxZoom,
  });

  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Store measured node dimensions (actual rendered sizes)
  const [measuredSizes, setMeasuredSizes] = useState<Map<string, { width: number; height: number }>>(new Map());

  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;
  const setViewportRef = useRef(setViewport);
  setViewportRef.current = setViewport;

  const lastPinchDistance = useRef<number | null>(null);
  const lastPanPosition = useRef<{ x: number; y: number } | null>(null);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setCanvasSize({ width, height });
  }, []);

  const handleNodeMeasured = useCallback((id: string, width: number, height: number) => {
    setMeasuredSizes((prev) => {
      const next = new Map(prev);
      next.set(id, { width, height });
      return next;
    });
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        return Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4;
      },
      onMoveShouldSetPanResponderCapture: (evt) => {
        return evt.nativeEvent.touches.length >= 2;
      },
      onPanResponderGrant: (evt) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length >= 2) {
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          lastPinchDistance.current = Math.sqrt(dx * dx + dy * dy);
          lastPanPosition.current = null;
        } else if (panOnDrag) {
          lastPanPosition.current = {
            x: touches[0].pageX,
            y: touches[0].pageY,
          };
          lastPinchDistance.current = null;
        }
      },
      onPanResponderMove: (evt) => {
        const touches = evt.nativeEvent.touches;

        if (touches.length >= 2 && zoomOnPinch) {
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (lastPinchDistance.current !== null) {
            const scale = dist / lastPinchDistance.current;
            const midX = (touches[0].pageX + touches[1].pageX) / 2;
            const midY = (touches[0].pageY + touches[1].pageY) / 2;

            const prev = viewportRef.current;
            const newZoom = clamp(prev.zoom * scale, minZoom, maxZoom);
            const zoomRatio = newZoom / prev.zoom;
            setViewportRef.current({
              x: midX - (midX - prev.x) * zoomRatio,
              y: midY - (midY - prev.y) * zoomRatio,
              zoom: newZoom,
            });
          }
          lastPinchDistance.current = dist;
          lastPanPosition.current = null;
        } else if (touches.length === 1 && panOnDrag) {
          const currentPos = { x: touches[0].pageX, y: touches[0].pageY };
          if (lastPanPosition.current) {
            const ddx = currentPos.x - lastPanPosition.current.x;
            const ddy = currentPos.y - lastPanPosition.current.y;
            const prev = viewportRef.current;
            setViewportRef.current({
              x: prev.x + ddx,
              y: prev.y + ddy,
              zoom: prev.zoom,
            });
          }
          lastPanPosition.current = currentPos;
        }
      },
      onPanResponderRelease: () => {
        lastPinchDistance.current = null;
        lastPanPosition.current = null;
      },
    })
  ).current;

  const handlePanePress = useCallback(() => {
    actions.clearSelection();
    onPanePress?.();
  }, [actions, onPanePress]);

  const handleEdgePress = useCallback(
    (edge: Edge) => {
      actions.selectEdge(edge.id);
      onEdgePress?.(edge);
    },
    [actions, onEdgePress]
  );

  const handleFitView = useCallback(() => {
    fitView(canvasSize.width, canvasSize.height);
  }, [fitView, canvasSize]);

  // Build node lookup using measured sizes (fall back to node.width/height)
  const getNodeWithSize = (node: Node): Node => {
    const measured = measuredSizes.get(node.id);
    if (measured) {
      return { ...node, width: measured.width, height: measured.height };
    }
    return node;
  };

  const sizedNodes = nodes.map(getNodeWithSize);
  const nodeMap = new Map<string, Node>();
  sizedNodes.forEach((n) => nodeMap.set(n.id, n));

  return (
    <FlowContext.Provider value={{ state, actions }}>
      <View style={[styles.container, style]} onLayout={onLayout}>
        {/* Pan/Zoom layer */}
        <View style={styles.canvas} {...panResponder.panHandlers}>
          {/* Background touch area */}
          <View
            style={StyleSheet.absoluteFill}
            onTouchEnd={handlePanePress}
          />

          {/* SVG edges layer */}
          <Svg style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <G transform={`translate(${viewport.x}, ${viewport.y}) scale(${viewport.zoom})`}>
              {edges
                .filter((e) => !e.hidden)
                .map((edge) => {
                  const sourceNode = nodeMap.get(edge.source);
                  const targetNode = nodeMap.get(edge.target);
                  if (!sourceNode || !targetNode) return null;

                  return (
                    <FlowEdge
                      key={edge.id}
                      edge={edge}
                      sourceNode={sourceNode}
                      targetNode={targetNode}
                      onPress={handleEdgePress}
                    />
                  );
                })}
            </G>
          </Svg>

          {/* Edge labels */}
          {edges
            .filter((e) => e.label && !e.hidden)
            .map((edge) => {
              const sourceNode = nodeMap.get(edge.source);
              const targetNode = nodeMap.get(edge.target);
              if (!sourceNode || !targetNode) return null;

              const flowCenterX =
                (sourceNode.position.x + (sourceNode.width ?? 150) / 2 +
                  targetNode.position.x + (targetNode.width ?? 150) / 2) /
                2;
              const flowCenterY =
                (sourceNode.position.y + (sourceNode.height ?? 40) +
                  targetNode.position.y) /
                2;

              return (
                <EdgeLabel
                  key={`label-${edge.id}`}
                  label={edge.label!}
                  x={flowCenterX}
                  y={flowCenterY}
                  selected={edge.selected}
                  viewport={viewport}
                />
              );
            })}

          {/* Nodes layer */}
          {nodes.map((node) => (
            <FlowNode
              key={node.id}
              node={node}
              nodeTypes={nodeTypes}
              snapGrid={snapGrid}
              enableSnap={enableSnap}
              onMeasured={handleNodeMeasured}
            />
          ))}
        </View>

        {/* Overlays */}
        {showMiniMap && (
          <MiniMap
            nodes={sizedNodes}
            viewport={viewport}
            canvasWidth={canvasSize.width}
            canvasHeight={canvasSize.height}
          />
        )}
        {showControls && (
          <Controls
            onZoomIn={() =>
              setViewport({ ...viewport, zoom: Math.min(viewport.zoom * 1.2, maxZoom) })
            }
            onZoomOut={() =>
              setViewport({ ...viewport, zoom: Math.max(viewport.zoom / 1.2, minZoom) })
            }
            onFitView={handleFitView}
          />
        )}

        {children}
      </View>
    </FlowContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
    overflow: 'hidden',
  },
  canvas: {
    flex: 1,
  },
});
