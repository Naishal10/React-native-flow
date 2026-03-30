import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

interface ControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  style?: object;
}

export const Controls = React.memo<ControlsProps>(({
  onZoomIn,
  onZoomOut,
  onFitView,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity style={styles.button} onPress={onZoomIn} activeOpacity={0.7}>
        <Text style={styles.buttonText}>+</Text>
      </TouchableOpacity>
      <View style={styles.divider} />
      <TouchableOpacity style={styles.button} onPress={onZoomOut} activeOpacity={0.7}>
        <Text style={styles.buttonText}>−</Text>
      </TouchableOpacity>
      <View style={styles.divider} />
      <TouchableOpacity style={styles.button} onPress={onFitView} activeOpacity={0.7}>
        <Text style={styles.buttonText}>⊡</Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    overflow: 'hidden',
  },
  button: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 20,
    color: '#555',
    fontWeight: '300',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
  },
});
