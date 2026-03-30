import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
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

  // Use a full-width or full-height wrapper to reliably center the dot
  const isVertical = position === 'top' || position === 'bottom';

  const wrapperStyle: ViewStyle = isVertical
    ? {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        ...(position === 'top' ? { top: -HANDLE_SIZE / 2 } : { bottom: -HANDLE_SIZE / 2 }),
      }
    : {
        position: 'absolute',
        top: 0,
        bottom: 0,
        justifyContent: 'center',
        ...(position === 'left' ? { left: -HANDLE_SIZE / 2 } : { right: -HANDLE_SIZE / 2 }),
      };

  return (
    <View style={wrapperStyle} pointerEvents="box-none">
      <View
        style={[
          styles.handle,
          type === 'source' ? styles.source : styles.target,
          !isConnectable && styles.notConnectable,
          style,
        ]}
        onTouchStart={handlePressIn}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  handle: {
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
