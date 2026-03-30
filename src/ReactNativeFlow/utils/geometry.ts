import { XYPosition, HandlePosition, Node, Viewport } from '../types';

/**
 * Get the absolute position of a handle on a node.
 */
export function getHandlePosition(
  position: HandlePosition,
  nodePosition: XYPosition,
  nodeWidth: number = 150,
  nodeHeight: number = 40
): XYPosition {
  switch (position) {
    case 'top':
      return { x: nodePosition.x + nodeWidth / 2, y: nodePosition.y };
    case 'bottom':
      return { x: nodePosition.x + nodeWidth / 2, y: nodePosition.y + nodeHeight };
    case 'left':
      return { x: nodePosition.x, y: nodePosition.y + nodeHeight / 2 };
    case 'right':
      return { x: nodePosition.x + nodeWidth, y: nodePosition.y + nodeHeight / 2 };
  }
}

/**
 * Calculate the distance between two points.
 */
export function distance(a: XYPosition, b: XYPosition): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/**
 * Clamp a value between min and max.
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

/**
 * Snap position to grid.
 */
export function snapToGrid(position: XYPosition, grid: [number, number]): XYPosition {
  return {
    x: Math.round(position.x / grid[0]) * grid[0],
    y: Math.round(position.y / grid[1]) * grid[1],
  };
}

/**
 * Convert screen coordinates to flow coordinates given viewport.
 */
export function screenToFlow(
  screenPos: XYPosition,
  viewport: { x: number; y: number; zoom: number }
): XYPosition {
  return {
    x: (screenPos.x - viewport.x) / viewport.zoom,
    y: (screenPos.y - viewport.y) / viewport.zoom,
  };
}

/**
 * Convert flow coordinates to screen coordinates given viewport.
 */
export function flowToScreen(
  flowPos: XYPosition,
  viewport: { x: number; y: number; zoom: number }
): XYPosition {
  return {
    x: flowPos.x * viewport.zoom + viewport.x,
    y: flowPos.y * viewport.zoom + viewport.y,
  };
}

/**
 * Check if a point is inside a node's bounding box.
 */
export function isPointInsideNode(point: XYPosition, node: Node): boolean {
  const w = node.width ?? 150;
  const h = node.height ?? 40;
  return (
    point.x >= node.position.x &&
    point.x <= node.position.x + w &&
    point.y >= node.position.y &&
    point.y <= node.position.y + h
  );
}

/**
 * Get the bounding box that fits all nodes.
 */
export function getNodesBounds(nodes: Node[]): { x: number; y: number; width: number; height: number } {
  if (nodes.length === 0) return { x: 0, y: 0, width: 0, height: 0 };

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    const w = node.width ?? 150;
    const h = node.height ?? 40;
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + w);
    maxY = Math.max(maxY, node.position.y + h);
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Check if a node is within the visible viewport (with buffer zone).
 * Zero allocations — pure arithmetic comparisons.
 */
export function isNodeInViewport(
  node: Node,
  viewport: Viewport,
  canvasWidth: number,
  canvasHeight: number,
  buffer: number = 0.5
): boolean {
  const w = node.width ?? 150;
  const h = node.height ?? 40;

  // Node bounds in screen coordinates
  const screenLeft = node.position.x * viewport.zoom + viewport.x;
  const screenTop = node.position.y * viewport.zoom + viewport.y;
  const screenRight = screenLeft + w * viewport.zoom;
  const screenBottom = screenTop + h * viewport.zoom;

  // Expand viewport by buffer
  const bufferX = canvasWidth * buffer;
  const bufferY = canvasHeight * buffer;

  // AABB overlap test
  return (
    screenRight >= -bufferX &&
    screenLeft <= canvasWidth + bufferX &&
    screenBottom >= -bufferY &&
    screenTop <= canvasHeight + bufferY
  );
}

/**
 * Get the set of node IDs visible within the viewport.
 * One Set allocation per call — used for O(1) edge filtering.
 */
export function getVisibleNodeIds(
  nodes: Node[],
  viewport: Viewport,
  canvasWidth: number,
  canvasHeight: number,
  buffer?: number
): Set<string> {
  const ids = new Set<string>();
  for (const node of nodes) {
    if (!node.hidden && isNodeInViewport(node, viewport, canvasWidth, canvasHeight, buffer)) {
      ids.add(node.id);
    }
  }
  return ids;
}
