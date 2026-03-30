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

// ─── Apply helpers ──────────────────────────────────────────────────

export function applyNodeChanges(changes: NodeChange[], nodes: Node[]): Node[] {
  let result = [...nodes];

  for (const change of changes) {
    switch (change.type) {
      case 'position': {
        const index = result.findIndex((n) => n.id === change.id);
        if (index !== -1) {
          result[index] = { ...result[index], position: change.position };
        }
        break;
      }
      case 'dimensions': {
        const index = result.findIndex((n) => n.id === change.id);
        if (index !== -1) {
          result[index] = {
            ...result[index],
            width: change.dimensions.width,
            height: change.dimensions.height,
          };
        }
        break;
      }
      case 'select': {
        const index = result.findIndex((n) => n.id === change.id);
        if (index !== -1) {
          result[index] = { ...result[index], selected: change.selected };
        }
        break;
      }
      case 'remove':
        result = result.filter((n) => n.id !== change.id);
        break;
      case 'add':
        result.push(change.item);
        break;
    }
  }

  return result;
}

export function applyEdgeChanges(changes: EdgeChange[], edges: Edge[]): Edge[] {
  let result = [...edges];

  for (const change of changes) {
    switch (change.type) {
      case 'select': {
        const index = result.findIndex((e) => e.id === change.id);
        if (index !== -1) {
          result[index] = { ...result[index], selected: change.selected };
        }
        break;
      }
      case 'remove':
        result = result.filter((e) => e.id !== change.id);
        break;
      case 'add':
        result.push(change.item);
        break;
    }
  }

  return result;
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
