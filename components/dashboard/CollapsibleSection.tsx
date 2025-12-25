import { useState } from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'

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
          <Ionicons
            name={icon as any}
            size={22}
            color={iconColor || (isExpanded ? '#f25842' : '#6b7280')}
          />
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
            color="#6b7280"
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
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fafafa',
  },
  pressedHeader: {
    backgroundColor: '#f3f4f6',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  activeTitle: {
    color: '#f25842',
  },
  badge: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
    overflow: 'hidden',
  },
})
