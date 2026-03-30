import React, { useCallback, useRef, useState } from 'react';
import { View, PanResponder, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Node, NodeTypes, Viewport } from '../types';
import { FlowActions } from '../store/FlowStore';
import { DefaultNode, InputNode, OutputNode } from './DefaultNode';
import { snapToGrid } from '../utils/geometry';

const builtInNodeTypes: NodeTypes = {
  default: DefaultNode as any,
  input: InputNode as any,
  output: OutputNode as any,
};

const LONG_PRESS_DURATION = 200;

interface FlowNodeProps {
  node: Node;
  screenX: number;
  screenY: number;
  viewport: Viewport;
  actions: FlowActions;
  nodeTypes?: NodeTypes;
  snapGrid?: [number, number];
  enableSnap?: boolean;
  onMeasured?: (id: string, width: number, height: number) => void;
}

export const FlowNode = React.memo<FlowNodeProps>(({
  node,
  screenX,
  screenY,
  viewport,
  actions,
  nodeTypes,
  snapGrid = [15, 15],
  enableSnap = false,
  onMeasured,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  // Refs so PanResponder closures always see latest values
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;
  const nodeRef = useRef(node);
  nodeRef.current = node;
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  const dragStartPos = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const measuredRef = useRef(false);

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      if (!measuredRef.current && onMeasured) {
        measuredRef.current = true;
        onMeasured(node.id, width, height);
      }
    },
    [node.id, onMeasured]
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => nodeRef.current.draggable !== false,
      onMoveShouldSetPanResponder: () => isDraggingRef.current,
      onStartShouldSetPanResponderCapture: () => nodeRef.current.draggable !== false,
      onMoveShouldSetPanResponderCapture: () => false,
      onPanResponderTerminationRequest: () => !isDraggingRef.current,
      onPanResponderGrant: () => {
        actionsRef.current.selectNode(nodeRef.current.id);
        dragStartPos.current = {
          x: nodeRef.current.position.x,
          y: nodeRef.current.position.y,
        };
        longPressTimer.current = setTimeout(() => {
          isDraggingRef.current = true;
          setIsDragging(true);
        }, LONG_PRESS_DURATION);
      },
      onPanResponderMove: (_evt, gestureState) => {
        if (!isDraggingRef.current) {
          if (Math.abs(gestureState.dx) > 8 || Math.abs(gestureState.dy) > 8) {
            if (longPressTimer.current) {
              clearTimeout(longPressTimer.current);
              longPressTimer.current = null;
            }
          }
          return;
        }

        const zoom = viewportRef.current.zoom;
        const dx = gestureState.dx / zoom;
        const dy = gestureState.dy / zoom;

        let newPos = {
          x: dragStartPos.current.x + dx,
          y: dragStartPos.current.y + dy,
        };

        if (enableSnap) {
          newPos = snapToGrid(newPos, snapGrid);
        }

        actionsRef.current.updateNodePosition(nodeRef.current.id, newPos);
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }

        if (isDraggingRef.current) {
          const zoom = viewportRef.current.zoom;
          const dx = gestureState.dx / zoom;
          const dy = gestureState.dy / zoom;

          let newPos = {
            x: dragStartPos.current.x + dx,
            y: dragStartPos.current.y + dy,
          };

          if (enableSnap) {
            newPos = snapToGrid(newPos, snapGrid);
          }

          actionsRef.current.updateNodePosition(nodeRef.current.id, newPos);
        }

        isDraggingRef.current = false;
        setIsDragging(false);
      },
      onPanResponderTerminate: () => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
        isDraggingRef.current = false;
        setIsDragging(false);
      },
    })
  ).current;

  const resolvedTypes = { ...builtInNodeTypes, ...nodeTypes };
  const NodeComponent = resolvedTypes[node.type ?? 'default'] ?? resolvedTypes.default;

  if (node.hidden) return null;

  return (
    <View
      onLayout={handleLayout}
      style={[
        styles.nodeWrapper,
        {
          left: screenX,
          top: screenY,
          transform: [{ scale: viewport.zoom }],
          transformOrigin: 'top left',
        },
        isDragging && styles.dragging,
        node.style,
      ]}
      {...panResponder.panHandlers}
    >
      <NodeComponent
        id={node.id}
        data={node.data}
        selected={node.selected ?? false}
        type={node.type ?? 'default'}
      />
    </View>
  );
}, (prev, next) => {
  // Custom comparator: only re-render when visual output changes
  return (
    prev.node === next.node &&
    prev.screenX === next.screenX &&
    prev.screenY === next.screenY &&
    prev.viewport.zoom === next.viewport.zoom &&
    prev.nodeTypes === next.nodeTypes &&
    prev.enableSnap === next.enableSnap
  );
});

const styles = StyleSheet.create({
  nodeWrapper: {
    position: 'absolute',
  },
  dragging: {
    opacity: 0.9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 999,
  },
});
