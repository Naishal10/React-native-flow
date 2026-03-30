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

  // Stable refs for callbacks used in memoized functions
  const onNodesChangeRef = useRef(onNodesChange);
  onNodesChangeRef.current = onNodesChange;
  const onEdgesChangeRef = useRef(onEdgesChange);
  onEdgesChangeRef.current = onEdgesChange;
  const onConnectRef = useRef(onConnect);
  onConnectRef.current = onConnect;
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const edgesRef = useRef(edges);
  edgesRef.current = edges;

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

  // RAF-throttled node position update for smooth dragging
  const pendingPositionUpdate = useRef<{ nodeId: string; position: XYPosition } | null>(null);
  const rafId = useRef<number | null>(null);

  const updateNodePosition = useCallback(
    (nodeId: string, position: XYPosition) => {
      pendingPositionUpdate.current = { nodeId, position };

      if (rafId.current === null) {
        rafId.current = requestAnimationFrame(() => {
          rafId.current = null;
          const pending = pendingPositionUpdate.current;
          if (pending) {
            onNodesChangeRef.current?.([
              { type: 'position', id: pending.nodeId, position: pending.position, dragging: true },
            ]);
            pendingPositionUpdate.current = null;
          }
        });
      }
    },
    []
  );

  // Selection uses refs to avoid deps on nodes/edges arrays
  const selectNode = useCallback(
    (nodeId: string, addToSelection = false) => {
      const changes: NodeChange[] = [];

      if (!addToSelection) {
        for (const n of nodesRef.current) {
          if (n.selected) changes.push({ type: 'select', id: n.id, selected: false });
        }
        const edgeChanges: EdgeChange[] = [];
        for (const e of edgesRef.current) {
          if (e.selected) edgeChanges.push({ type: 'select', id: e.id, selected: false });
        }
        if (edgeChanges.length) onEdgesChangeRef.current?.(edgeChanges);
      }

      changes.push({ type: 'select', id: nodeId, selected: true });
      onNodesChangeRef.current?.(changes);
    },
    []
  );

  const selectEdge = useCallback(
    (edgeId: string, addToSelection = false) => {
      const changes: EdgeChange[] = [];

      if (!addToSelection) {
        for (const e of edgesRef.current) {
          if (e.selected) changes.push({ type: 'select', id: e.id, selected: false });
        }
        const nodeChanges: NodeChange[] = [];
        for (const n of nodesRef.current) {
          if (n.selected) nodeChanges.push({ type: 'select', id: n.id, selected: false });
        }
        if (nodeChanges.length) onNodesChangeRef.current?.(nodeChanges);
      }

      changes.push({ type: 'select', id: edgeId, selected: true });
      onEdgesChangeRef.current?.(changes);
    },
    []
  );

  const clearSelection = useCallback(() => {
    const nodeChanges: NodeChange[] = [];
    const edgeChanges: EdgeChange[] = [];

    for (const n of nodesRef.current) {
      if (n.selected) nodeChanges.push({ type: 'select', id: n.id, selected: false });
    }
    for (const e of edgesRef.current) {
      if (e.selected) edgeChanges.push({ type: 'select', id: e.id, selected: false });
    }

    if (nodeChanges.length) onNodesChangeRef.current?.(nodeChanges);
    if (edgeChanges.length) onEdgesChangeRef.current?.(edgeChanges);
  }, []);

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
      let result: Connection | null = null;

      setConnectionState((prev) => {
        if (!prev.startNodeId || !prev.startHandleType) {
          return { startNodeId: null, startHandleId: null, startHandleType: null, endPosition: null };
        }

        const isSource = prev.startHandleType === 'source';
        const connection: Connection = {
          source: isSource ? prev.startNodeId : nodeId,
          sourceHandle: isSource ? prev.startHandleId ?? undefined : handleId ?? undefined,
          target: isSource ? nodeId : prev.startNodeId,
          targetHandle: isSource ? handleId ?? undefined : prev.startHandleId ?? undefined,
        };

        if (connection.source !== connection.target) {
          onConnectRef.current?.(connection);
          result = connection;
        }

        return { startNodeId: null, startHandleId: null, startHandleType: null, endPosition: null };
      });

      return result;
    },
    []
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
      const currentNodes = nodesRef.current;
      const bounds = getNodesBounds(currentNodes);
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
    [minZoom, maxZoom]
  );

  const flowInstance: FlowInstance = useMemo(
    () => ({
      getNodes: () => nodesRef.current,
      getEdges: () => edgesRef.current,
      getNode: (id: string) => nodesRef.current.find((n) => n.id === id),
      getEdge: (id: string) => edgesRef.current.find((e) => e.id === id),
      setViewport,
      getViewport: () => viewport,
      fitView: () => fitView(400, 600),
      zoomIn: () => setViewport({ ...viewport, zoom: Math.min(viewport.zoom * 1.2, maxZoom) }),
      zoomOut: () => setViewport({ ...viewport, zoom: Math.max(viewport.zoom / 1.2, minZoom) }),
      addNodes: (newNodes: Node[]) => {
        onNodesChangeRef.current?.(newNodes.map((n) => ({ type: 'add' as const, item: n })));
      },
      addEdges: (newEdges: Edge[]) => {
        onEdgesChangeRef.current?.(newEdges.map((e) => ({ type: 'add' as const, item: e })));
      },
      toObject: () => ({ nodes: nodesRef.current, edges: edgesRef.current, viewport }),
    }),
    [viewport, setViewport, fitView, minZoom, maxZoom]
  );

  // Stable selected ID sets
  const selectedNodeIds = useMemo(() => new Set(nodes.filter((n) => n.selected).map((n) => n.id)), [nodes]);
  const selectedEdgeIds = useMemo(() => new Set(edges.filter((e) => e.selected).map((e) => e.id)), [edges]);

  const state: FlowState = useMemo(() => ({
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
  }), [nodes, edges, viewport, selectedNodeIds, selectedEdgeIds, connectionState]);

  const actions: FlowActions = useMemo(() => ({
    setNodes: (ns) => onNodesChangeRef.current?.(ns.map((n) => ({ type: 'add' as const, item: n }))),
    setEdges: (es) => onEdgesChangeRef.current?.(es.map((e) => ({ type: 'add' as const, item: e }))),
    setViewport,
    applyNodeChanges: (changes) => applyNodeChangesUtil(changes, nodesRef.current),
    applyEdgeChanges: (changes) => applyEdgeChangesUtil(changes, edgesRef.current),
    updateNodePosition,
    selectNode,
    selectEdge,
    clearSelection,
    startConnection,
    updateConnection,
    endConnection,
    cancelConnection,
    setNodeInternals,
    getHandlePosition: () => null,
  }), [setViewport, updateNodePosition, selectNode, selectEdge, clearSelection, startConnection, updateConnection, endConnection, cancelConnection, setNodeInternals]);

  return { state, actions, viewport, setViewport, flowInstance, fitView };
}
