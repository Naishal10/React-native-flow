import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  FlowCanvas,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
  applyNodeChanges,
  applyEdgeChanges,
  NodeComponentProps,
  Handle,
} from './src/ReactNativeFlow';

// ─── Custom Node Example ────────────────────────────────────────────

const CustomNode: React.FC<NodeComponentProps> = ({ id, data, selected }) => {
  return (
    <View style={[customStyles.node, selected && customStyles.selected]}>
      <Handle nodeId={id} type="target" position="top" />
      <View style={customStyles.header}>
        <Text style={customStyles.emoji}>{(data as any).emoji ?? '⚡'}</Text>
        <Text style={customStyles.title}>{data.label ?? id}</Text>
      </View>
      {(data as any).description && (
        <Text style={customStyles.description}>{(data as any).description}</Text>
      )}
      <Handle nodeId={id} type="source" position="bottom" />
    </View>
  );
};

const customStyles = StyleSheet.create({
  node: {
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#16213e',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  selected: {
    borderColor: '#e94560',
    borderWidth: 2,
    shadowColor: '#e94560',
    shadowOpacity: 0.3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emoji: {
    fontSize: 18,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  description: {
    fontSize: 11,
    color: '#a0a0b0',
    marginTop: 4,
  },
});

// ─── Initial Data ───────────────────────────────────────────────────

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'input',
    position: { x: 100, y: 50 },
    data: { label: 'Start' },
    width: 120,
    height: 40,
  },
  {
    id: '2',
    type: 'default',
    position: { x: 80, y: 180 },
    data: { label: 'Process Data' },
    width: 150,
    height: 40,
  },
  {
    id: '3',
    type: 'custom',
    position: { x: 60, y: 320 },
    data: {
      label: 'Transform',
      emoji: '🔄',
      description: 'Apply transformations',
    },
    width: 160,
    height: 65,
  },
  {
    id: '4',
    type: 'default',
    position: { x: 250, y: 320 },
    data: { label: 'Validate' },
    width: 120,
    height: 40,
  },
  {
    id: '5',
    type: 'output',
    position: { x: 140, y: 480 },
    data: { label: 'Output' },
    width: 120,
    height: 40,
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', type: 'bezier', animated: true },
  { id: 'e2-3', source: '2', target: '3', type: 'bezier', label: 'yes' },
  { id: 'e2-4', source: '2', target: '4', type: 'bezier', label: 'no' },
  {
    id: 'e3-5',
    source: '3',
    target: '5',
    type: 'bezier',
    markerEnd: { type: 'arrowClosed' },
  },
  {
    id: 'e4-5',
    source: '4',
    target: '5',
    type: 'bezier',
    style: { stroke: '#e94560', strokeWidth: 2 },
  },
];

// ─── App ────────────────────────────────────────────────────────────

export default function App() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    []
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdge: Edge = {
        id: `e${connection.source}-${connection.target}`,
        source: connection.source,
        sourceHandle: connection.sourceHandle,
        target: connection.target,
        targetHandle: connection.targetHandle,
        type: 'bezier',
      };
      setEdges((eds) => [...eds, newEdge]);
    },
    []
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.title}>React Native Flow</Text>
        <Text style={styles.subtitle}>Drag nodes, pinch to zoom, pan to explore</Text>
      </View>
      <FlowCanvas
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={{ custom: CustomNode }}
        defaultViewport={{ x: 20, y: 20, zoom: 0.85 }}
        minZoom={0.2}
        maxZoom={3}
        snapToGrid={false}
        showMiniMap={true}
        showControls={true}
        style={styles.canvas}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  subtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  canvas: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
});
