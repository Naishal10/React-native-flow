import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
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
} from './src/ReactNativeFlow';

// ─── Generate a large grid of nodes + edges ─────────────────────────

function generateStressTest(count: number): { nodes: Node[]; edges: Edge[] } {
  const cols = Math.ceil(Math.sqrt(count));
  const spacingX = 200;
  const spacingY = 120;
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);

    nodes.push({
      id: `n${i}`,
      type: 'default',
      position: { x: col * spacingX, y: row * spacingY },
      data: { label: `Node ${i}` },
      width: 120,
      height: 40,
    });

    if (col < cols - 1 && i + 1 < count) {
      edges.push({
        id: `e${i}-${i + 1}`,
        source: `n${i}`,
        target: `n${i + 1}`,
        type: 'bezier',
      });
    }

    if (row > 0) {
      const aboveIdx = i - cols;
      if (aboveIdx >= 0) {
        edges.push({
          id: `e${aboveIdx}-${i}`,
          source: `n${aboveIdx}`,
          target: `n${i}`,
          type: 'bezier',
        });
      }
    }
  }

  return { nodes, edges };
}

// ─── Small demo data ────────────────────────────────────────────────

const smallDemo: { nodes: Node[]; edges: Edge[] } = {
  nodes: [
    { id: '1', type: 'input', position: { x: 100, y: 50 }, data: { label: 'Start' }, width: 120, height: 40 },
    { id: '2', type: 'default', position: { x: 80, y: 180 }, data: { label: 'Process Data' }, width: 150, height: 40 },
    { id: '3', type: 'default', position: { x: 60, y: 320 }, data: { label: 'Transform' }, width: 120, height: 40 },
    { id: '4', type: 'default', position: { x: 250, y: 320 }, data: { label: 'Validate' }, width: 120, height: 40 },
    { id: '5', type: 'output', position: { x: 140, y: 480 }, data: { label: 'Output' }, width: 120, height: 40 },
  ],
  edges: [
    { id: 'e1-2', source: '1', target: '2', type: 'bezier', animated: true },
    { id: 'e2-3', source: '2', target: '3', type: 'bezier', label: 'yes' },
    { id: 'e2-4', source: '2', target: '4', type: 'bezier', label: 'no' },
    { id: 'e3-5', source: '3', target: '5', type: 'bezier' },
    { id: 'e4-5', source: '4', target: '5', type: 'bezier', style: { stroke: '#e94560', strokeWidth: 2 } },
  ],
};

type DemoMode = 'small' | '500' | '1000' | '2000';

// ─── App ────────────────────────────────────────────────────────────

export default function App() {
  const [mode, setMode] = useState<DemoMode>('small');
  const [showMiniMap, setShowMiniMap] = useState(true);

  const { defaultZoom } = useMemo(() => {
    if (mode === 'small') return { defaultZoom: 0.85 };
    return { defaultZoom: 0.35 };
  }, [mode]);

  const [nodes, setNodes] = useState<Node[]>(smallDemo.nodes);
  const [edges, setEdges] = useState<Edge[]>(smallDemo.edges);

  const switchMode = useCallback((newMode: DemoMode) => {
    setMode(newMode);
    setTimeout(() => {
      if (newMode === 'small') {
        setNodes(smallDemo.nodes);
        setEdges(smallDemo.edges);
      } else {
        const count = newMode === '500' ? 500 : newMode === '1000' ? 1000 : 2000;
        const data = generateStressTest(count);
        setNodes(data.nodes);
        setEdges(data.edges);
      }
    }, 0);
  }, []);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const onConnect = useCallback((connection: Connection) => {
    const newEdge: Edge = {
      id: `e${connection.source}-${connection.target}`,
      source: connection.source,
      target: connection.target,
      type: 'bezier',
    };
    setEdges((eds) => [...eds, newEdge]);
  }, []);

  return (
    <SafeAreaProvider>
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>React Native Flow</Text>
            <Text style={styles.subtitle}>
              {nodes.length} nodes, {edges.length} edges
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.toggleBtn, showMiniMap && styles.toggleBtnActive]}
            onPress={() => setShowMiniMap((v) => !v)}
          >
            <Text style={[styles.toggleBtnText, showMiniMap && styles.toggleBtnTextActive]}>
              Map
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.modeBar}>
          {(['small', '500', '1000', '2000'] as DemoMode[]).map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
              onPress={() => switchMode(m)}
            >
              <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
                {m === 'small' ? '5' : m}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <FlowCanvas
        key={mode}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        defaultViewport={{ x: 20, y: 20, zoom: defaultZoom }}
        minZoom={1}
        maxZoom={3}
        snapToGrid={false}
        showMiniMap={showMiniMap}
        showControls={true}
        miniMapMaxNodes={100}
        style={styles.canvas}
      />
    </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  subtitle: {
    fontSize: 11,
    color: '#888',
    marginTop: 1,
  },
  modeBar: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  modeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#f0f0f0',
  },
  modeBtnActive: {
    backgroundColor: '#1a1a2e',
  },
  modeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  modeBtnTextActive: {
    color: '#fff',
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  toggleBtnActive: {
    backgroundColor: '#1a73e8',
    borderColor: '#1a73e8',
  },
  toggleBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  toggleBtnTextActive: {
    color: '#fff',
  },
  canvas: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
});
