import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { Node, Viewport } from '../types';
import { getNodesBounds } from '../utils/geometry';

// Minimum fraction of minimap the viewport rect can occupy before we zoom in
const MIN_RECT_RATIO = 0.3;

interface MiniMapProps {
  nodes: Node[];
  viewport: Viewport;
  canvasWidth: number;
  canvasHeight: number;
  width?: number;
  height?: number;
  maxNodes?: number;
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
  maxNodes = 200,
  nodeColor = '#d0d0d0',
  style,
}) => {
  const { bounds, scale, offsetX, offsetY, rectX, rectY, rectW, rectH, displayNodes } = useMemo(() => {
    const allVisible = nodes.filter((n) => !n.hidden);

    if (allVisible.length === 0 || canvasWidth === 0 || canvasHeight === 0) {
      return {
        bounds: { x: 0, y: 0, width: 400, height: 400 },
        scale: Math.min(width / 400, height / 400),
        offsetX: 0, offsetY: 0,
        rectX: 0, rectY: 0, rectW: width, rectH: height,
        displayNodes: [] as Node[],
      };
    }

    const nodeBounds = getNodesBounds(allVisible);
    const padding = 40;

    // Viewport visible area in flow coordinates
    const vpLeft = -viewport.x / viewport.zoom;
    const vpTop = -viewport.y / viewport.zoom;
    const vpW = canvasWidth / viewport.zoom;
    const vpH = canvasHeight / viewport.zoom;

    // Full bounds: union of all nodes + viewport
    const fullMinX = Math.min(nodeBounds.x - padding, vpLeft);
    const fullMinY = Math.min(nodeBounds.y - padding, vpTop);
    const fullMaxX = Math.max(nodeBounds.x + nodeBounds.width + padding, vpLeft + vpW);
    const fullMaxY = Math.max(nodeBounds.y + nodeBounds.height + padding, vpTop + vpH);
    const fullW = fullMaxX - fullMinX;
    const fullH = fullMaxY - fullMinY;

    // Scale if showing everything
    const fullScale = Math.min(width / fullW, height / fullH);

    // Check if viewport rect would be too small
    const vpRectW = vpW * fullScale;
    const vpRectH = vpH * fullScale;
    const tooSmall = vpRectW < width * MIN_RECT_RATIO || vpRectH < height * MIN_RECT_RATIO;

    let focusMinX: number, focusMinY: number, focusW: number, focusH: number, s: number;

    if (tooSmall) {
      // Zoom the minimap to keep the viewport rect at a reasonable size
      // Show 3x the viewport area, centered on current view
      const expandX = vpW * 1.0;
      const expandY = vpH * 1.0;
      focusMinX = vpLeft - expandX;
      focusMinY = vpTop - expandY;
      focusW = vpW + expandX * 2;
      focusH = vpH + expandY * 2;
      s = Math.min(width / focusW, height / focusH);
    } else {
      // Show everything
      focusMinX = fullMinX;
      focusMinY = fullMinY;
      focusW = fullW;
      focusH = fullH;
      s = fullScale;
    }

    // Center offset: content may not fill both axes equally
    const offsetX = (width - focusW * s) / 2;
    const offsetY = (height - focusH * s) / 2;

    const boundsResult = { x: focusMinX, y: focusMinY, width: focusW, height: focusH };

    // Cull: only include nodes whose bounds intersect the minimap's focus area
    const focusMaxX = focusMinX + focusW;
    const focusMaxY = focusMinY + focusH;

    let inBoundsNodes: Node[] = [];
    for (const node of allVisible) {
      const nw = node.width ?? 150;
      const nh = node.height ?? 40;
      const nx = node.position.x;
      const ny = node.position.y;
      if (nx + nw >= focusMinX && nx <= focusMaxX && ny + nh >= focusMinY && ny <= focusMaxY) {
        inBoundsNodes.push(node);
      }
    }

    // Sample if still over maxNodes
    let displayNodes: Node[];
    if (inBoundsNodes.length <= maxNodes) {
      displayNodes = inBoundsNodes;
    } else {
      const step = inBoundsNodes.length / maxNodes;
      displayNodes = [];
      for (let i = 0; i < maxNodes; i++) {
        displayNodes.push(inBoundsNodes[Math.floor(i * step)]);
      }
    }

    return {
      bounds: boundsResult,
      scale: s,
      offsetX,
      offsetY,
      rectX: (vpLeft - boundsResult.x) * s + offsetX,
      rectY: (vpTop - boundsResult.y) * s + offsetY,
      rectW: vpW * s,
      rectH: vpH * s,
      displayNodes,
    };
  }, [nodes, viewport, canvasWidth, canvasHeight, width, height, maxNodes]);

  const getColor = typeof nodeColor === 'function' ? nodeColor : () => nodeColor;

  return (
    <View style={[styles.container, { width, height }, style]}>
      <Svg width={width} height={height}>
        {displayNodes.map((node) => (
          <Rect
            key={node.id}
            x={(node.position.x - bounds.x) * scale + offsetX}
            y={(node.position.y - bounds.y) * scale + offsetY}
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
