import { useState } from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'
import { pastelDesignSystem } from '@/lib/pastel-design-system'
import { Platform } from 'react-native'
const { colors: pastelColors, surfaces, elevation, spacing, borderRadius } = pastelDesignSystem

interface CollapsibleSectionProps {
  title: string
  icon: string
  badge?: number
  children: React.ReactNode
  defaultExpanded?: boolean
  iconColor?: string
}

export function CollapsibleSection({
  title,
  icon,
  badge,
  children,
  defaultExpanded = false,
  iconColor,
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const rotation = useSharedValue(defaultExpanded ? 1 : 0)
  const height = useSharedValue(defaultExpanded ? 1 : 0)

  const toggle = () => {
    const newExpanded = !isExpanded
    setIsExpanded(newExpanded)
    
    rotation.value = withSpring(newExpanded ? 1 : 0, {
      damping: 15,
      stiffness: 200,
    })
    height.value = withSpring(newExpanded ? 1 : 0, {
      damping: 15,
      stiffness: 200,
    })
  }

  const iconRotation = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value * 180}deg` }],
  }))

  const iconBgColor = iconColor || pastelColors.primary[500]

  return (
    <View style={styles.container}>
      <Pressable
        onPress={toggle}
        style={({ pressed }) => [
          styles.header,
          pressed && styles.pressedHeader,
        ]}
      >
        <View style={styles.headerLeft}>
          <View style={[styles.iconContainer, { backgroundColor: `${iconBgColor}15` }]}>
          <Ionicons
            name={icon as any}
            size={22}
              color={iconColor || (isExpanded ? pastelColors.primary[500] : surfaces.onSurfaceVariant)}
          />
          </View>
          <Text style={[styles.title, isExpanded && styles.activeTitle]}>
            {title}
          </Text>
          {badge !== undefined && badge > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {badge > 9 ? '9+' : badge}
              </Text>
            </View>
          )}
        </View>
        <Animated.View style={iconRotation}>
          <Ionicons
            name="chevron-down"
            size={20}
            color={surfaces.onSurfaceVariant}
          />
        </Animated.View>
      </Pressable>

      {isExpanded && (
        <View style={styles.content}>
          {children}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: 'transparent',
  },
  pressedHeader: {
    backgroundColor: pastelColors.secondary[100],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: pastelColors.secondary[100],
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: surfaces.onSurface,
    flex: 1,
  },
  activeTitle: {
    color: pastelColors.primary[500],
    fontWeight: '700',
  },
  badge: {
    backgroundColor: pastelColors.primary[500],
    borderRadius: borderRadius.full,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    ...elevation.level1,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  content: {
    padding: spacing.lg,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
})
