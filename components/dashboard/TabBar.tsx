import { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import { colors, spacing, borderRadius, elevation } from '@/lib/design-system'

interface Tab {
  id: string
  label: string
  icon: string
  badge?: number
}

interface TabBarProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
}

export function TabBar({ tabs, activeTab, onTabChange }: TabBarProps) {
  const scrollViewRef = useRef<ScrollView>(null)
  const tabPositions = useRef<Record<string, number>>({})

  // Scroll to active tab when it changes
  useEffect(() => {
    const activeIndex = tabs.findIndex(tab => tab.id === activeTab)
    if (activeIndex !== -1 && scrollViewRef.current) {
      const position = tabPositions.current[tabs[activeIndex].id]
      if (position !== undefined) {
        scrollViewRef.current.scrollTo({
          x: Math.max(0, position - 40),
          animated: true,
        })
      }
    }
  }, [activeTab, tabs])

  return (
    <View style={styles.container}>
      {Platform.OS !== 'web' && (
        <BlurView
          intensity={60}
          tint="light"
          style={StyleSheet.absoluteFillObject}
        />
      )}
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.85)', 'rgba(255, 255, 255, 0.6)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.id
          
          return (
            <Pressable
              key={tab.id}
              onPress={() => onTabChange(tab.id)}
              style={({ pressed }) => [
                styles.tab,
                isActive && styles.activeTab,
                pressed && styles.pressedTab,
              ]}
              onLayout={(event) => {
                const { x } = event.nativeEvent.layout
                tabPositions.current[tab.id] = x
              }}
            >
              {isActive && (
                <LinearGradient
                  colors={[`${colors.primary}20`, `${colors.primary}10`]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
              )}
              <View style={styles.tabContent}>
                <View style={styles.iconContainer}>
                  <Ionicons
                    name={tab.icon as any}
                    size={22}
                    color={isActive ? '#FF6B8A' : '#6b7280'}
                  />
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <View style={[styles.badge, isActive && styles.activeBadge]}>
                      <Text style={styles.badgeText}>
                        {tab.badge > 9 ? '9+' : tab.badge}
                      </Text>
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    styles.tabLabel,
                    isActive && styles.activeTabLabel,
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
                {isActive && <View style={styles.indicator} />}
              </View>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Platform.OS === 'web' ? 'rgba(255, 255, 255, 0.85)' : 'transparent',
    borderBottomWidth: 0,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
      backdropFilter: 'blur(20px)',
    } : {
      ...elevation.level1,
    }),
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 3,
    borderRadius: borderRadius.md,
    minWidth: 65,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  activeTab: {
    backgroundColor: 'transparent',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(242, 88, 66, 0.12)',
    } : {}),
  },
  pressedTab: {
    opacity: 0.6,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 2,
  },
  activeTabLabel: {
    color: colors.primary,
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  activeBadge: {
    backgroundColor: '#dc2626',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    left: '50%',
    marginLeft: -20,
    width: 40,
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    ...(Platform.OS === 'web' ? {
      boxShadow: `0 2px 8px ${colors.primary}40`,
    } : {}),
  },
})
