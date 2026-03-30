import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { Node, Viewport } from '../types';
import { getNodesBounds } from '../utils/geometry';

interface MiniMapProps {
  nodes: Node[];
  viewport: Viewport;
  canvasWidth: number;
  canvasHeight: number;
  width?: number;
  height?: number;
  nodeColor?: string | ((node: Node) => string);
  style?: object;
}

export const MiniMap = React.memo<MiniMapProps>(({
  nodes,
  viewport,
  canvasWidth,
  canvasHeight,
  width = 140,
  height = 100,
  nodeColor = '#d0d0d0',
  style,
}) => {
  const { bounds, scale, rectX, rectY, rectW, rectH, visibleNodes } = useMemo(() => {
    const visibleNodes = nodes.filter((n) => !n.hidden);

    if (visibleNodes.length === 0) {
      return {
        bounds: { x: 0, y: 0, width: 400, height: 400 },
        scale: Math.min(width / 400, height / 400),
        rectX: 0, rectY: 0, rectW: width, rectH: height,
        visibleNodes: [],
      };
    }

    const b = getNodesBounds(visibleNodes);
    const padding = 60;

    const visibleW = canvasWidth / viewport.zoom;
    const visibleH = canvasHeight / viewport.zoom;
    const visibleLeft = -viewport.x / viewport.zoom;
    const visibleTop = -viewport.y / viewport.zoom;

    const fullMinX = Math.min(b.x - padding, visibleLeft);
    const fullMinY = Math.min(b.y - padding, visibleTop);
    const fullMaxX = Math.max(b.x + b.width + padding, visibleLeft + visibleW);
    const fullMaxY = Math.max(b.y + b.height + padding, visibleTop + visibleH);

    const fullW = fullMaxX - fullMinX;
    const fullH = fullMaxY - fullMinY;
    const s = Math.min(width / fullW, height / fullH);

    const boundsResult = { x: fullMinX, y: fullMinY, width: fullW, height: fullH };

    return {
      bounds: boundsResult,
      scale: s,
      rectX: (visibleLeft - boundsResult.x) * s,
      rectY: (visibleTop - boundsResult.y) * s,
      rectW: visibleW * s,
      rectH: visibleH * s,
      visibleNodes,
    };
  }, [nodes, viewport, canvasWidth, canvasHeight, width, height]);

  const getColor = typeof nodeColor === 'function' ? nodeColor : () => nodeColor;

  return (
    <View style={[styles.container, { width, height }, style]}>
      <Svg width={width} height={height}>
        {visibleNodes.map((node) => (
          <Rect
            key={node.id}
            x={(node.position.x - bounds.x) * scale}
            y={(node.position.y - bounds.y) * scale}
            width={(node.width ?? 150) * scale}
            height={(node.height ?? 40) * scale}
            fill={node.selected ? '#1a73e8' : getColor(node)}
            rx={2}
          />
        ))}

        <Rect
          x={rectX}
          y={rectY}
          width={rectW}
          height={rectH}
          fill="rgba(26, 115, 232, 0.08)"
          stroke="#1a73e8"
          strokeWidth={1.5}
          rx={2}
        />
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
});
