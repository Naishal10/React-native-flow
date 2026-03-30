import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Node,
  Edge,
  Viewport,
  NodeChange,
  EdgeChange,
  Connection,
  XYPosition,
  FlowInstance,
} from '../types';
import {
  FlowState,
  FlowActions,
  NodeInternals,
  applyNodeChanges as applyNodeChangesUtil,
  applyEdgeChanges as applyEdgeChangesUtil,
} from '../store/FlowStore';
import { getNodesBounds, clamp } from '../utils/geometry';

interface UseFlowOptions {
  nodes: Node[];
  edges: Edge[];
  defaultViewport?: Partial<Viewport>;
  onNodesChange?: (changes: NodeChange[]) => void;
  onEdgesChange?: (changes: EdgeChange[]) => void;
  onConnect?: (connection: Connection) => void;
  minZoom?: number;
  maxZoom?: number;
}

export function useFlow(options: UseFlowOptions) {
  const {
    nodes,
    edges,
    defaultViewport,
    onNodesChange,
    onEdgesChange,
    onConnect,
    minZoom = 0.1,
    maxZoom = 4,
  } = options;

  const [viewport, setViewportState] = useState<Viewport>({
    x: 0,
    y: 0,
    zoom: 1,
    ...defaultViewport,
  });

  const [selectedNodeIds] = useState<Set<string>>(new Set());
  const [selectedEdgeIds] = useState<Set<string>>(new Set());
  const [connectionState, setConnectionState] = useState<{
    startNodeId: string | null;
    startHandleId: string | null;
    startHandleType: 'source' | 'target' | null;
    endPosition: XYPosition | null;
  }>({
    startNodeId: null,
    startHandleId: null,
    startHandleType: null,
    endPosition: null,
  });

  const nodeInternalsRef = useRef<Map<string, NodeInternals>>(new Map());

  const setViewport = useCallback(
    (vpOrUpdater: Viewport | ((prev: Viewport) => Viewport)) => {
      if (typeof vpOrUpdater === 'function') {
        setViewportState((prev) => {
          const vp = vpOrUpdater(prev);
          return { ...vp, zoom: clamp(vp.zoom, minZoom, maxZoom) };
        });
      } else {
        setViewportState({
          ...vpOrUpdater,
          zoom: clamp(vpOrUpdater.zoom, minZoom, maxZoom),
        });
      }
    },
    [minZoom, maxZoom]
  );

  const updateNodePosition = useCallback(
    (nodeId: string, position: XYPosition) => {
      onNodesChange?.([{ type: 'position', id: nodeId, position, dragging: true }]);
    },
    [onNodesChange]
  );

  const selectNode = useCallback(
    (nodeId: string, addToSelection = false) => {
      const changes: NodeChange[] = [];

      if (!addToSelection) {
        // Deselect all currently selected
        nodes.forEach((n) => {
          if (n.selected) {
            changes.push({ type: 'select', id: n.id, selected: false });
          }
        });
        edges.forEach((e) => {
          if (e.selected) {
            onEdgesChange?.([{ type: 'select', id: e.id, selected: false }]);
          }
        });
      }

      changes.push({ type: 'select', id: nodeId, selected: true });
      onNodesChange?.(changes);
    },
    [nodes, edges, onNodesChange, onEdgesChange]
  );

  const selectEdge = useCallback(
    (edgeId: string, addToSelection = false) => {
      const changes: EdgeChange[] = [];

      if (!addToSelection) {
        edges.forEach((e) => {
          if (e.selected) {
            changes.push({ type: 'select', id: e.id, selected: false });
          }
        });
        nodes.forEach((n) => {
          if (n.selected) {
            onNodesChange?.([{ type: 'select', id: n.id, selected: false }]);
          }
        });
      }

      changes.push({ type: 'select', id: edgeId, selected: true });
      onEdgesChange?.(changes);
    },
    [nodes, edges, onNodesChange, onEdgesChange]
  );

  const clearSelection = useCallback(() => {
    const nodeChanges: NodeChange[] = nodes
      .filter((n) => n.selected)
      .map((n) => ({ type: 'select' as const, id: n.id, selected: false }));
    const edgeChanges: EdgeChange[] = edges
      .filter((e) => e.selected)
      .map((e) => ({ type: 'select' as const, id: e.id, selected: false }));

    if (nodeChanges.length) onNodesChange?.(nodeChanges);
    if (edgeChanges.length) onEdgesChange?.(edgeChanges);
  }, [nodes, edges, onNodesChange, onEdgesChange]);

  const startConnection = useCallback(
    (nodeId: string, handleId: string | null, handleType: 'source' | 'target') => {
      setConnectionState({
        startNodeId: nodeId,
        startHandleId: handleId,
        startHandleType: handleType,
        endPosition: null,
      });
    },
    []
  );

  const updateConnection = useCallback((position: XYPosition) => {
    setConnectionState((prev) => ({ ...prev, endPosition: position }));
  }, []);

  const endConnection = useCallback(
    (nodeId: string, handleId: string | null): Connection | null => {
      if (!connectionState.startNodeId || !connectionState.startHandleType) {
        setConnectionState({
          startNodeId: null,
          startHandleId: null,
          startHandleType: null,
          endPosition: null,
        });
        return null;
      }

      const isSource = connectionState.startHandleType === 'source';
      const connection: Connection = {
        source: isSource ? connectionState.startNodeId : nodeId,
        sourceHandle: isSource ? connectionState.startHandleId ?? undefined : handleId ?? undefined,
        target: isSource ? nodeId : connectionState.startNodeId,
        targetHandle: isSource ? handleId ?? undefined : connectionState.startHandleId ?? undefined,
      };

      // Don't allow self-connections
      if (connection.source !== connection.target) {
        onConnect?.(connection);
      }

      setConnectionState({
        startNodeId: null,
        startHandleId: null,
        startHandleType: null,
        endPosition: null,
      });

      return connection.source !== connection.target ? connection : null;
    },
    [connectionState, onConnect]
  );

  const cancelConnection = useCallback(() => {
    setConnectionState({
      startNodeId: null,
      startHandleId: null,
      startHandleType: null,
      endPosition: null,
    });
  }, []);

  const setNodeInternals = useCallback((nodeId: string, internals: NodeInternals) => {
    nodeInternalsRef.current.set(nodeId, internals);
  }, []);

  const fitView = useCallback(
    (canvasWidth: number, canvasHeight: number, padding = 0.1) => {
      const bounds = getNodesBounds(nodes);
      if (bounds.width === 0 || bounds.height === 0) return;

      const padW = bounds.width * padding;
      const padH = bounds.height * padding;
      const totalW = bounds.width + padW * 2;
      const totalH = bounds.height + padH * 2;

      const zoom = clamp(
        Math.min(canvasWidth / totalW, canvasHeight / totalH),
        minZoom,
        maxZoom
      );

      const x = (canvasWidth - totalW * zoom) / 2 - (bounds.x - padW) * zoom;
      const y = (canvasHeight - totalH * zoom) / 2 - (bounds.y - padH) * zoom;

      setViewportState({ x, y, zoom });
    },
    [nodes, minZoom, maxZoom]
  );

  const flowInstance: FlowInstance = useMemo(
    () => ({
      getNodes: () => nodes,
      getEdges: () => edges,
      getNode: (id: string) => nodes.find((n) => n.id === id),
      getEdge: (id: string) => edges.find((e) => e.id === id),
      setViewport,
      getViewport: () => viewport,
      fitView: () => fitView(400, 600),
      zoomIn: () => setViewport({ ...viewport, zoom: Math.min(viewport.zoom * 1.2, maxZoom) }),
      zoomOut: () => setViewport({ ...viewport, zoom: Math.max(viewport.zoom / 1.2, minZoom) }),
      addNodes: (newNodes: Node[]) => {
        onNodesChange?.(newNodes.map((n) => ({ type: 'add' as const, item: n })));
      },
      addEdges: (newEdges: Edge[]) => {
        onEdgesChange?.(newEdges.map((e) => ({ type: 'add' as const, item: e })));
      },
      toObject: () => ({ nodes, edges, viewport }),
    }),
    [nodes, edges, viewport, setViewport, fitView, minZoom, maxZoom, onNodesChange, onEdgesChange]
  );

  const state: FlowState = {
    nodes,
    edges,
    viewport,
    selectedNodeIds,
    selectedEdgeIds,
    connectionStartNodeId: connectionState.startNodeId,
    connectionStartHandleId: connectionState.startHandleId,
    connectionStartHandleType: connectionState.startHandleType,
    connectionEndPosition: connectionState.endPosition,
    nodeInternals: nodeInternalsRef.current,
  };

  const actions: FlowActions = {
    setNodes: (ns) => onNodesChange?.(ns.map((n) => ({ type: 'add' as const, item: n }))),
    setEdges: (es) => onEdgesChange?.(es.map((e) => ({ type: 'add' as const, item: e }))),
    setViewport,
    applyNodeChanges: (changes) => applyNodeChangesUtil(changes, nodes),
    applyEdgeChanges: (changes) => applyEdgeChangesUtil(changes, edges),
    updateNodePosition,
    selectNode,
    selectEdge,
    clearSelection,
    startConnection,
    updateConnection,
    endConnection,
    cancelConnection,
    setNodeInternals,
    getHandlePosition: (_nodeId, _handleType, _handleId) => null, // resolved via node internals
  };

  return { state, actions, viewport, setViewport, flowInstance, fitView };
}
