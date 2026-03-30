import { ReactNode } from 'react';
import { ViewStyle } from 'react-native';

// ─── Position & Geometry ────────────────────────────────────────────

export interface XYPosition {
  x: number;
  y: number;
}

export interface Dimensions {
  width: number;
  height: number;
}

export interface Rect extends XYPosition, Dimensions {}

// ─── Handle ─────────────────────────────────────────────────────────

export type HandleType = 'source' | 'target';
export type HandlePosition = 'top' | 'bottom' | 'left' | 'right';

export interface HandleProps {
  id?: string;
  type: HandleType;
  position: HandlePosition;
  style?: ViewStyle;
  isConnectable?: boolean;
  onConnect?: (connection: Connection) => void;
}

// ─── Connection ─────────────────────────────────────────────────────

export interface Connection {
  source: string;
  sourceHandle?: string;
  target: string;
  targetHandle?: string;
}

// ─── Node ───────────────────────────────────────────────────────────

export interface NodeData {
  label?: string;
  [key: string]: unknown;
}

export interface Node<T extends NodeData = NodeData> {
  id: string;
  type?: string;
  position: XYPosition;
  data: T;
  width?: number;
  height?: number;
  draggable?: boolean;
  selectable?: boolean;
  connectable?: boolean;
  deletable?: boolean;
  style?: ViewStyle;
  selected?: boolean;
  hidden?: boolean;
  parentId?: string;
}

export type NodeChange =
  | { type: 'position'; id: string; position: XYPosition; dragging?: boolean }
  | { type: 'dimensions'; id: string; dimensions: Dimensions }
  | { type: 'select'; id: string; selected: boolean }
  | { type: 'remove'; id: string }
  | { type: 'add'; item: Node };

export type NodeTypes = Record<string, React.ComponentType<NodeComponentProps>>;

export interface NodeComponentProps<T extends NodeData = NodeData> {
  id: string;
  data: T;
  selected: boolean;
  type: string;
}

// ─── Edge ───────────────────────────────────────────────────────────

export type EdgeType = 'default' | 'straight' | 'step' | 'smoothstep' | 'bezier';

export interface MarkerConfig {
  type: 'arrow' | 'arrowClosed';
  color?: string;
  width?: number;
  height?: number;
}

export interface Edge {
  id: string;
  source: string;
  sourceHandle?: string;
  target: string;
  targetHandle?: string;
  type?: EdgeType;
  animated?: boolean;
  label?: string;
  labelStyle?: ViewStyle;
  style?: {
    stroke?: string;
    strokeWidth?: number;
    strokeDasharray?: string;
  };
  selected?: boolean;
  hidden?: boolean;
  deletable?: boolean;
  markerStart?: MarkerConfig;
  markerEnd?: MarkerConfig;
  data?: Record<string, unknown>;
}

export type EdgeChange =
  | { type: 'select'; id: string; selected: boolean }
  | { type: 'remove'; id: string }
  | { type: 'add'; item: Edge };

export type EdgeTypes = Record<string, React.ComponentType<EdgeComponentProps>>;

export interface EdgeComponentProps {
  id: string;
  source: string;
  target: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  selected: boolean;
  animated: boolean;
  label?: string;
  style?: Edge['style'];
  data?: Record<string, unknown>;
}

// ─── Viewport ───────────────────────────────────────────────────────

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

// ─── Flow Props ─────────────────────────────────────────────────────

export interface FlowProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange?: (changes: NodeChange[]) => void;
  onEdgesChange?: (changes: EdgeChange[]) => void;
  onConnect?: (connection: Connection) => void;
  onNodePress?: (node: Node) => void;
  onEdgePress?: (edge: Edge) => void;
  onPanePress?: () => void;
  nodeTypes?: NodeTypes;
  edgeTypes?: EdgeTypes;
  defaultViewport?: Viewport;
  minZoom?: number;
  maxZoom?: number;
  snapToGrid?: boolean;
  snapGrid?: [number, number];
  panOnDrag?: boolean;
  zoomOnPinch?: boolean;
  connectionLineStyle?: Edge['style'];
  style?: ViewStyle;
  children?: ReactNode;
}

// ─── Flow Instance ──────────────────────────────────────────────────

export interface FlowInstance {
  getNodes: () => Node[];
  getEdges: () => Edge[];
  getNode: (id: string) => Node | undefined;
  getEdge: (id: string) => Edge | undefined;
  setViewport: (viewport: Viewport) => void;
  getViewport: () => Viewport;
  fitView: (options?: { padding?: number; duration?: number }) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  addNodes: (nodes: Node[]) => void;
  addEdges: (edges: Edge[]) => void;
  toObject: () => { nodes: Node[]; edges: Edge[]; viewport: Viewport };
}
