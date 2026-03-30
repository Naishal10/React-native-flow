import React, { useMemo } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { Path, Defs, Marker, Polygon } from 'react-native-svg';
import { Edge, Node, HandlePosition, Viewport } from '../types';
import { getHandlePosition } from '../utils/geometry';
import { getBezierPath, getStraightPath, getSmoothStepPath } from '../utils/edge-path';

interface FlowEdgeProps {
  edge: Edge;
  sourceNode: Node;
  targetNode: Node;
  onPress?: (edge: Edge) => void;
}

export const FlowEdge = React.memo<FlowEdgeProps>(({
  edge,
  sourceNode,
  targetNode,
  onPress,
}) => {
  const sourceHandlePos: HandlePosition = 'bottom';
  const targetHandlePos: HandlePosition = 'top';

  const pathData = useMemo(() => {
    const sourcePos = getHandlePosition(
      sourceHandlePos,
      sourceNode.position,
      sourceNode.width,
      sourceNode.height
    );
    const targetPos = getHandlePosition(
      targetHandlePos,
      targetNode.position,
      targetNode.width,
      targetNode.height
    );

    const params = {
      sourceX: sourcePos.x,
      sourceY: sourcePos.y,
      sourcePosition: sourceHandlePos,
      targetX: targetPos.x,
      targetY: targetPos.y,
      targetPosition: targetHandlePos,
    };

    switch (edge.type) {
      case 'straight':
        return getStraightPath(params);
      case 'step':
      case 'smoothstep':
        return getSmoothStepPath(params);
      case 'bezier':
      default:
        return getBezierPath(params);
    }
  }, [
    edge.type,
    sourceNode.position.x, sourceNode.position.y, sourceNode.width, sourceNode.height,
    targetNode.position.x, targetNode.position.y, targetNode.width, targetNode.height,
  ]);

  const strokeColor = edge.style?.stroke ?? (edge.selected ? '#1a73e8' : '#b1b1b7');
  const strokeWidth = edge.style?.strokeWidth ?? (edge.selected ? 2.5 : 1.5);
  const markerId = `marker-${edge.id}`;

  if (edge.hidden) return null;

  return (
    <>
      <Defs>
        <Marker
          id={markerId}
          viewBox="0 0 10 10"
          refX="10"
          refY="5"
          markerWidth={5}
          markerHeight={5}
          orient="auto-start-reverse"
        >
          <Polygon points="0,1 10,5 0,9" fill={strokeColor} />
        </Marker>
      </Defs>

      <Path
        d={pathData}
        stroke="transparent"
        strokeWidth={20}
        fill="none"
        onPress={() => onPress?.(edge)}
      />

      <Path
        d={pathData}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={edge.animated ? '5,5' : edge.style?.strokeDasharray}
        markerEnd={edge.markerEnd ? `url(#${markerId})` : undefined}
        onPress={() => onPress?.(edge)}
      />
    </>
  );
});

interface EdgeLabelProps {
  label: string;
  x: number;
  y: number;
  selected?: boolean;
  viewport: Viewport;
}

export const EdgeLabel = React.memo<EdgeLabelProps>(({ label, x, y, selected, viewport }) => {
  const screenX = x * viewport.zoom + viewport.x;
  const screenY = y * viewport.zoom + viewport.y;

  return (
    <View
      style={[
        styles.labelContainer,
        {
          left: screenX,
          top: screenY,
          transform: [{ scale: viewport.zoom }],
          transformOrigin: 'top left',
        },
      ]}
      pointerEvents="none"
    >
      <Text style={[styles.labelText, selected && styles.selectedLabel]}>{label}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  labelContainer: {
    position: 'absolute',
    backgroundColor: '#fff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  labelText: {
    fontSize: 11,
    color: '#666',
  },
  selectedLabel: {
    color: '#1a73e8',
    fontWeight: '600',
  },
});
