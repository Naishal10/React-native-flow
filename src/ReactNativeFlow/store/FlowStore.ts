import { createContext, useContext } from 'react';
import {
  Node,
  Edge,
  Viewport,
  NodeChange,
  EdgeChange,
  Connection,
  XYPosition,
  HandlePosition,
} from '../types';

// ─── State ──────────────────────────────────────────────────────────

export interface FlowState {
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
  selectedNodeIds: Set<string>;
  selectedEdgeIds: Set<string>;
  connectionStartNodeId: string | null;
  connectionStartHandleId: string | null;
  connectionStartHandleType: 'source' | 'target' | null;
  connectionEndPosition: XYPosition | null;
  nodeInternals: Map<string, NodeInternals>;
}

export interface NodeInternals {
  handleBounds: {
    source: HandleBound[];
    target: HandleBound[];
  };
}

export interface HandleBound {
  id: string | null;
  position: HandlePosition;
  x: number;
  y: number;
}

// ─── Actions ────────────────────────────────────────────────────────

export interface FlowActions {
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  setViewport: (viewport: Viewport) => void;
  applyNodeChanges: (changes: NodeChange[]) => Node[];
  applyEdgeChanges: (changes: EdgeChange[]) => Edge[];
  updateNodePosition: (nodeId: string, position: XYPosition) => void;
  selectNode: (nodeId: string, addToSelection?: boolean) => void;
  selectEdge: (edgeId: string, addToSelection?: boolean) => void;
  clearSelection: () => void;
  startConnection: (nodeId: string, handleId: string | null, handleType: 'source' | 'target') => void;
  updateConnection: (position: XYPosition) => void;
  endConnection: (nodeId: string, handleId: string | null) => Connection | null;
  cancelConnection: () => void;
  setNodeInternals: (nodeId: string, internals: NodeInternals) => void;
  getHandlePosition: (nodeId: string, handleType: 'source' | 'target', handleId?: string) => XYPosition | null;
}

// ─── Apply helpers (Map-based O(1) lookups) ─────────────────────────

export function applyNodeChanges(changes: NodeChange[], nodes: Node[]): Node[] {
  if (changes.length === 0) return nodes;

  // Build index for O(1) lookups
  const indexMap = new Map<string, number>();
  nodes.forEach((n, i) => indexMap.set(n.id, i));

  let result: Node[] | null = null; // lazy copy
  const removals = new Set<string>();
  const additions: Node[] = [];

  for (const change of changes) {
    switch (change.type) {
      case 'position': {
        const idx = indexMap.get(change.id);
        if (idx !== undefined) {
          if (!result) result = [...nodes];
          result[idx] = { ...result[idx], position: change.position };
        }
        break;
      }
      case 'dimensions': {
        const idx = indexMap.get(change.id);
        if (idx !== undefined) {
          if (!result) result = [...nodes];
          result[idx] = {
            ...result[idx],
            width: change.dimensions.width,
            height: change.dimensions.height,
          };
        }
        break;
      }
      case 'select': {
        const idx = indexMap.get(change.id);
        if (idx !== undefined) {
          if (!result) result = [...nodes];
          result[idx] = { ...result[idx], selected: change.selected };
        }
        break;
      }
      case 'remove':
        removals.add(change.id);
        break;
      case 'add':
        additions.push(change.item);
        break;
    }
  }

  if (!result && removals.size === 0 && additions.length === 0) return nodes;

  let final = result ?? nodes;
  if (removals.size > 0) {
    final = final.filter((n) => !removals.has(n.id));
  }
  if (additions.length > 0) {
    final = [...final, ...additions];
  }

  return final;
}

export function applyEdgeChanges(changes: EdgeChange[], edges: Edge[]): Edge[] {
  if (changes.length === 0) return edges;

  const indexMap = new Map<string, number>();
  edges.forEach((e, i) => indexMap.set(e.id, i));

  let result: Edge[] | null = null;
  const removals = new Set<string>();
  const additions: Edge[] = [];

  for (const change of changes) {
    switch (change.type) {
      case 'select': {
        const idx = indexMap.get(change.id);
        if (idx !== undefined) {
          if (!result) result = [...edges];
          result[idx] = { ...result[idx], selected: change.selected };
        }
        break;
      }
      case 'remove':
        removals.add(change.id);
        break;
      case 'add':
        additions.push(change.item);
        break;
    }
  }

  if (!result && removals.size === 0 && additions.length === 0) return edges;

  let final = result ?? edges;
  if (removals.size > 0) {
    final = final.filter((e) => !removals.has(e.id));
  }
  if (additions.length > 0) {
    final = [...final, ...additions];
  }

  return final;
}

// ─── Context ────────────────────────────────────────────────────────

export interface FlowContextValue {
  state: FlowState;
  actions: FlowActions;
}

export const FlowContext = createContext<FlowContextValue | null>(null);

export function useFlowContext(): FlowContextValue {
  const context = useContext(FlowContext);
  if (!context) {
    throw new Error('useFlowContext must be used within a FlowProvider');
  }
  return context;
}

// ─── Initial state factory ──────────────────────────────────────────

export function createInitialState(
  nodes: Node[] = [],
  edges: Edge[] = [],
  viewport?: Partial<Viewport>
): FlowState {
  return {
    nodes,
    edges,
    viewport: { x: 0, y: 0, zoom: 1, ...viewport },
    selectedNodeIds: new Set(),
    selectedEdgeIds: new Set(),
    connectionStartNodeId: null,
    connectionStartHandleId: null,
    connectionStartHandleType: null,
    connectionEndPosition: null,
    nodeInternals: new Map(),
  };
}
