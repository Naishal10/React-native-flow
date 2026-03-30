import { XYPosition, HandlePosition } from '../types';

interface EdgePathParams {
  sourceX: number;
  sourceY: number;
  sourcePosition?: HandlePosition;
  targetX: number;
  targetY: number;
  targetPosition?: HandlePosition;
  curvature?: number;
}

/**
 * Generate a straight edge path (SVG d attribute).
 */
export function getStraightPath({
  sourceX,
  sourceY,
  targetX,
  targetY,
}: EdgePathParams): string {
  return `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
}

/**
 * Generate a default bezier edge path.
 */
export function getBezierPath({
  sourceX,
  sourceY,
  sourcePosition = 'bottom',
  targetX,
  targetY,
  targetPosition = 'top',
  curvature = 0.25,
}: EdgePathParams): string {
  const dist = distance({ x: sourceX, y: sourceY }, { x: targetX, y: targetY });
  const offset = dist * curvature;

  const controlPoints = getControlPoints(
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    offset
  );

  return `M ${sourceX} ${sourceY} C ${controlPoints.sourceControlX} ${controlPoints.sourceControlY}, ${controlPoints.targetControlX} ${controlPoints.targetControlY}, ${targetX} ${targetY}`;
}

/**
 * Generate a smoothstep (rounded corners) edge path.
 */
export function getSmoothStepPath({
  sourceX,
  sourceY,
  sourcePosition = 'bottom',
  targetX,
  targetY,
  targetPosition = 'top',
}: EdgePathParams): string {
  const offset = 20;
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;

  const sourceDir = getDirection(sourcePosition);
  const targetDir = getDirection(targetPosition);

  const s1x = sourceX + sourceDir.x * offset;
  const s1y = sourceY + sourceDir.y * offset;
  const t1x = targetX + targetDir.x * offset;
  const t1y = targetY + targetDir.y * offset;

  // Simple step: source -> offset point -> mid -> offset point -> target
  if (isHorizontal(sourcePosition) && isHorizontal(targetPosition)) {
    return `M ${sourceX} ${sourceY} L ${s1x} ${s1y} L ${s1x} ${midY} L ${t1x} ${midY} L ${t1x} ${t1y} L ${targetX} ${targetY}`;
  }

  if (isVertical(sourcePosition) && isVertical(targetPosition)) {
    return `M ${sourceX} ${sourceY} L ${s1x} ${s1y} L ${midX} ${s1y} L ${midX} ${t1y} L ${t1x} ${t1y} L ${targetX} ${targetY}`;
  }

  // Mixed: one horizontal, one vertical
  return `M ${sourceX} ${sourceY} L ${s1x} ${s1y} L ${t1x} ${s1y} L ${t1x} ${t1y} L ${targetX} ${targetY}`;
}

/**
 * Generate a step edge path (right angles, no rounding).
 */
export function getStepPath(params: EdgePathParams): string {
  return getSmoothStepPath(params);
}

// ─── Helpers ────────────────────────────────────────────────────────

function distance(a: XYPosition, b: XYPosition): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function getControlPoints(
  sourceX: number,
  sourceY: number,
  sourcePosition: HandlePosition,
  targetX: number,
  targetY: number,
  targetPosition: HandlePosition,
  offset: number
) {
  const dir = getDirection(sourcePosition);
  const tDir = getDirection(targetPosition);

  return {
    sourceControlX: sourceX + dir.x * offset,
    sourceControlY: sourceY + dir.y * offset,
    targetControlX: targetX + tDir.x * offset,
    targetControlY: targetY + tDir.y * offset,
  };
}

function getDirection(position: HandlePosition): XYPosition {
  switch (position) {
    case 'top':
      return { x: 0, y: -1 };
    case 'bottom':
      return { x: 0, y: 1 };
    case 'left':
      return { x: -1, y: 0 };
    case 'right':
      return { x: 1, y: 0 };
  }
}

function isHorizontal(position: HandlePosition): boolean {
  return position === 'left' || position === 'right';
}

function isVertical(position: HandlePosition): boolean {
  return position === 'top' || position === 'bottom';
}

/**
 * Get the center/label position along an edge path.
 */
export function getEdgeCenter(params: EdgePathParams): XYPosition {
  return {
    x: (params.sourceX + params.targetX) / 2,
    y: (params.sourceY + params.targetY) / 2,
  };
}
