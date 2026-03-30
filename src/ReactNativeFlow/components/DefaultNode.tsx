import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NodeComponentProps } from '../types';
import { Handle } from './Handle';

export const DefaultNode = React.memo<NodeComponentProps>(({ id, data, selected }) => (
  <View style={[styles.node, selected && styles.selected]}>
    <Handle nodeId={id} type="target" position="top" />
    <Text style={styles.label} numberOfLines={1}>
      {data.label ?? id}
    </Text>
    <Handle nodeId={id} type="source" position="bottom" />
  </View>
));

export const InputNode = React.memo<NodeComponentProps>(({ id, data, selected }) => (
  <View style={[styles.node, styles.inputNode, selected && styles.selected]}>
    <Text style={styles.label} numberOfLines={1}>
      {data.label ?? id}
    </Text>
    <Handle nodeId={id} type="source" position="bottom" />
  </View>
));

export const OutputNode = React.memo<NodeComponentProps>(({ id, data, selected }) => (
  <View style={[styles.node, styles.outputNode, selected && styles.selected]}>
    <Handle nodeId={id} type="target" position="top" />
    <Text style={styles.label} numberOfLines={1}>
      {data.label ?? id}
    </Text>
  </View>
));

const styles = StyleSheet.create({
  node: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputNode: {
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  outputNode: {
    borderColor: '#f44336',
    borderWidth: 2,
  },
  selected: {
    borderColor: '#1a73e8',
    borderWidth: 2,
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  label: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
});
