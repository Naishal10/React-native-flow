import React from 'react';
import { View, StyleSheet } from 'react-native';
import { HandleProps } from '../types';
import { useFlowContext } from '../store/FlowStore';

const HANDLE_SIZE = 12;

interface HandleComponentProps extends HandleProps {
  nodeId: string;
}

export const Handle: React.FC<HandleComponentProps> = ({
  id,
  type,
  position,
  style,
  nodeId,
  isConnectable = true,
}) => {
  const { actions } = useFlowContext();

  const handlePressIn = () => {
    if (!isConnectable) return;
    actions.startConnection(nodeId, id ?? null, type);
  };

  return (
    <View
      style={[
        styles.handle,
        type === 'source' ? styles.source : styles.target,
        positionStyles[position],
        !isConnectable && styles.notConnectable,
        style,
      ]}
      onTouchStart={handlePressIn}
    />
  );
};

const styles = StyleSheet.create({
  handle: {
    position: 'absolute',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    borderWidth: 2,
    borderColor: '#fff',
    zIndex: 10,
  },
  source: {
    backgroundColor: '#555',
  },
  target: {
    backgroundColor: '#555',
  },
  notConnectable: {
    opacity: 0.4,
  },
});

// Separate so we can use transform for reliable centering
const positionStyles = StyleSheet.create({
  top: {
    top: -HANDLE_SIZE / 2,
    left: '50%',
    transform: [{ translateX: -HANDLE_SIZE / 2 }],
  },
  bottom: {
    bottom: -HANDLE_SIZE / 2,
    left: '50%',
    transform: [{ translateX: -HANDLE_SIZE / 2 }],
  },
  left: {
    left: -HANDLE_SIZE / 2,
    top: '50%',
    transform: [{ translateY: -HANDLE_SIZE / 2 }],
  },
  right: {
    right: -HANDLE_SIZE / 2,
    top: '50%',
    transform: [{ translateY: -HANDLE_SIZE / 2 }],
  },
});
