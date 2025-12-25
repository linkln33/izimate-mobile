/**
 * Skeleton Loader Component
 * Modern loading pattern that shows content structure
 * Expo-compatible (no react-native-linear-gradient dependency)
 */

import React from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';

interface SkeletonLoaderProps {
  type?: 'card' | 'list' | 'calendar' | 'profile' | 'booking';
  count?: number;
}

export function SkeletonLoader({ type = 'card', count = 1 }: SkeletonLoaderProps) {
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <View style={styles.cardContainer}>
            <Animated.View style={[styles.skeletonCircle, { opacity }]} />
            <View style={styles.cardContent}>
              <Animated.View style={[styles.skeletonLine, styles.skeletonLine80, { opacity }]} />
              <Animated.View style={[styles.skeletonLine, styles.skeletonLine60, { opacity }]} />
            </View>
          </View>
        );

      case 'list':
        return (
          <View style={styles.listContainer}>
            <Animated.View style={[styles.skeletonCircle, styles.skeletonCircleSmall, { opacity }]} />
            <View style={styles.listContent}>
              <Animated.View style={[styles.skeletonLine, styles.skeletonLine70, { opacity }]} />
              <Animated.View style={[styles.skeletonLine, styles.skeletonLine50, { opacity }]} />
            </View>
          </View>
        );

      case 'calendar':
        return (
          <View style={styles.calendarContainer}>
            <Animated.View style={[styles.skeletonCircle, styles.skeletonCircleMedium, { opacity }]} />
            <View style={styles.calendarContent}>
              <Animated.View style={[styles.skeletonLine, styles.skeletonLine60, { opacity }]} />
              <Animated.View style={[styles.skeletonLine, styles.skeletonLine40, { opacity }]} />
            </View>
            <Animated.View style={[styles.skeletonButton, { opacity }]} />
          </View>
        );

      case 'profile':
        return (
          <View style={styles.profileContainer}>
            <Animated.View style={[styles.skeletonCircle, styles.skeletonCircleLarge, { opacity }]} />
            <Animated.View style={[styles.skeletonLine, styles.skeletonLine70, { opacity }]} />
            <Animated.View style={[styles.skeletonLine, styles.skeletonLine50, { opacity }]} />
          </View>
        );

      case 'booking':
        return (
          <View style={styles.bookingContainer}>
            <Animated.View style={[styles.skeletonCircle, styles.skeletonCircleMedium, { opacity }]} />
            <View style={styles.bookingContent}>
              <Animated.View style={[styles.skeletonLine, styles.skeletonLine75, { opacity }]} />
              <Animated.View style={[styles.skeletonLine, styles.skeletonLine55, { opacity }]} />
              <Animated.View style={[styles.skeletonLine, styles.skeletonLine40, { opacity }]} />
            </View>
            <Animated.View style={[styles.skeletonButton, { opacity }]} />
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.item}>
          {renderSkeleton()}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  item: {
    marginBottom: 12,
  },
  // Card type
  cardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
  },
  cardContent: {
    marginLeft: 16,
    flex: 1,
  },
  // List type
  listContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
  },
  listContent: {
    marginLeft: 12,
    flex: 1,
  },
  // Calendar type
  calendarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
  },
  calendarContent: {
    flex: 1,
    marginLeft: 12,
  },
  // Profile type
  profileContainer: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
  },
  // Booking type
  bookingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
  },
  bookingContent: {
    marginLeft: 12,
    flex: 1,
  },
  // Common skeleton elements
  skeletonCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e5e7eb',
  },
  skeletonCircleSmall: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  skeletonCircleMedium: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  skeletonCircleLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  skeletonLine: {
    height: 14,
    borderRadius: 4,
    backgroundColor: '#e5e7eb',
    marginBottom: 8,
  },
  skeletonLine80: {
    width: '80%',
  },
  skeletonLine75: {
    width: '75%',
  },
  skeletonLine70: {
    width: '70%',
  },
  skeletonLine60: {
    width: '60%',
  },
  skeletonLine55: {
    width: '55%',
  },
  skeletonLine50: {
    width: '50%',
  },
  skeletonLine40: {
    width: '40%',
    marginBottom: 4,
  },
  skeletonButton: {
    width: 80,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    marginLeft: 12,
  },
});
