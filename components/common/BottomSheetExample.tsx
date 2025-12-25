/**
 * Bottom Sheet Example Component
 * Modern bottom sheet for service selection, time slots, etc.
 * This is a reusable component that can be customized for different use cases
 */

import React, { useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { triggerLight, triggerSuccess } from '@/lib/utils/haptics';

interface BottomSheetExampleProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
  snapPoints?: string[];
}

export function BottomSheetExample({
  visible,
  onClose,
  title = 'Select Option',
  children,
  snapPoints = ['25%', '50%', '90%'],
}: BottomSheetExampleProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);

  // Memoize snap points
  const memoizedSnapPoints = useMemo(() => snapPoints, [snapPoints]);

  // Handle sheet changes
  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      onClose();
    }
  }, [onClose]);

  // Backdrop component
  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  // Open/close based on visible prop
  React.useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.expand();
      triggerLight();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    triggerLight();
    bottomSheetRef.current?.close();
  }, []);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={visible ? 0 : -1}
      snapPoints={memoizedSnapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={styles.handleIndicator}
      backgroundStyle={styles.bottomSheetBackground}
    >
      <BottomSheetView style={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#6b7280" />
          </Pressable>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {children || (
            <View style={styles.placeholder}>
              <Ionicons name="options-outline" size={48} color="#d1d5db" />
              <Text style={styles.placeholderText}>Add your content here</Text>
            </View>
          )}
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingVertical: 16,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  placeholderText: {
    marginTop: 16,
    fontSize: 16,
    color: '#9ca3af',
  },
  handleIndicator: {
    backgroundColor: '#d1d5db',
    width: 40,
  },
  bottomSheetBackground: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
});

