import React, { useRef, useState } from 'react';
import { View, PanResponder, StyleSheet } from 'react-native';
import { Node, NodeTypes } from '../types';
import { useFlowContext } from '../store/FlowStore';
import { DefaultNode, InputNode, OutputNode } from './DefaultNode';
import { snapToGrid } from '../utils/geometry';

const builtInNodeTypes: NodeTypes = {
  default: DefaultNode as any,
  input: InputNode as any,
  output: OutputNode as any,
};

const LONG_PRESS_DURATION = 200; // ms before drag activates

interface FlowNodeProps {
  node: Node;
  nodeTypes?: NodeTypes;
  snapGrid?: [number, number];
  enableSnap?: boolean;
}

export const FlowNode: React.FC<FlowNodeProps> = ({
  node,
  nodeTypes,
  snapGrid = [15, 15],
  enableSnap = false,
}) => {
  const { state, actions } = useFlowContext();
  const { viewport } = state;
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

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => nodeRef.current.draggable !== false,
      onMoveShouldSetPanResponder: () => isDraggingRef.current,
      onStartShouldSetPanResponderCapture: () => nodeRef.current.draggable !== false,
      onMoveShouldSetPanResponderCapture: () => false,
      // Once long-press drag is active, don't let canvas steal the gesture
      onPanResponderTerminationRequest: () => !isDraggingRef.current,
      onPanResponderGrant: () => {
        actionsRef.current.selectNode(nodeRef.current.id);
        dragStartPos.current = {
          x: nodeRef.current.position.x,
          y: nodeRef.current.position.y,
        };
        // Start long-press timer
        longPressTimer.current = setTimeout(() => {
          isDraggingRef.current = true;
          setIsDragging(true);
        }, LONG_PRESS_DURATION);
      },
      onPanResponderMove: (_evt, gestureState) => {
        // If finger moved too far before long-press, cancel it
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

  const screenX = node.position.x * viewport.zoom + viewport.x;
  const screenY = node.position.y * viewport.zoom + viewport.y;

  return (
    <View
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
};

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
