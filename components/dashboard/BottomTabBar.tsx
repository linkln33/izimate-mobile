import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import { colors, spacing, borderRadius, elevation } from '@/lib/design-system'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

interface Tab {
  id: string
  label: string
  icon: string
  badge?: number
}

interface BottomTabBarProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
}

// Group tabs into primary (always visible, thumb-friendly) and secondary (scrollable)
// Primary tabs are the most frequently used and placed at bottom for one-handed access
const PRIMARY_TABS = ['overview', 'listings', 'messages', 'approvals', 'settings']
const SECONDARY_TABS = ['liked', 'billing', 'affiliate', 'verification', 'notifications']

export function BottomTabBar({ tabs, activeTab, onTabChange }: BottomTabBarProps) {
  // Separate tabs into primary and secondary
  const primaryTabs = tabs.filter(tab => PRIMARY_TABS.includes(tab.id))
  const secondaryTabs = tabs.filter(tab => SECONDARY_TABS.includes(tab.id))
  
  // Primary tabs: Always visible at bottom for one-handed thumb access
  // Secondary tabs: Scrollable horizontal strip above primary tabs
  
  return (
    <View style={styles.container}>
      {Platform.OS !== 'web' && (
        <BlurView
          intensity={80}
          tint="light"
          style={StyleSheet.absoluteFillObject}
        />
      )}
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Primary Tabs - Always visible, thumb-friendly */}
      <View style={styles.primaryTabsContainer}>
        {primaryTabs.map((tab) => {
          const isActive = activeTab === tab.id
          
          return (
              <Pressable
                key={tab.id}
                onPress={() => onTabChange(tab.id)}
                style={({ pressed }) => [
                  styles.primaryTab,
                  isActive && styles.activePrimaryTab,
                  pressed && styles.pressedTab,
                ]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {isActive && (
                  <LinearGradient
                    colors={[`${colors.primary}15`, `${colors.primary}08`]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                )}
              <View style={styles.tabContent}>
                <View style={styles.iconContainer}>
                  <Ionicons
                    name={isActive ? (tab.icon.replace('-outline', '') as any) : (tab.icon as any)}
                    size={24}
                    color={isActive ? '#f25842' : '#6b7280'}
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
                    styles.primaryTabLabel,
                    isActive && styles.activePrimaryTabLabel,
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </View>
            </Pressable>
          )
        })}
      </View>

      {/* Secondary Tabs - Scrollable horizontal strip */}
      {secondaryTabs.length > 0 && (
        <View style={styles.secondaryContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.secondaryScrollContent}
          >
            {secondaryTabs.map((tab) => {
              const isActive = activeTab === tab.id
              
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => onTabChange(tab.id)}
                  style={({ pressed }) => [
                    styles.secondaryTab,
                    isActive && styles.activeSecondaryTab,
                    pressed && styles.pressedTab,
                  ]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <View style={styles.secondaryTabContent}>
                    <Ionicons
                      name={isActive ? (tab.icon.replace('-outline', '') as any) : (tab.icon as any)}
                      size={20}
                      color={isActive ? '#f25842' : '#6b7280'}
                    />
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <View style={[styles.smallBadge, isActive && styles.activeBadge]}>
                        <Text style={styles.smallBadgeText}>
                          {tab.badge > 9 ? '9+' : tab.badge}
                        </Text>
                      </View>
                    )}
                    <Text
                      style={[
                        styles.secondaryTabLabel,
                        isActive && styles.activeSecondaryTabLabel,
                      ]}
                      numberOfLines={1}
                    >
                      {tab.label}
                    </Text>
                  </View>
                </Pressable>
              )
            })}
          </ScrollView>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Platform.OS === 'web' ? 'rgba(255, 255, 255, 0.85)' : 'transparent',
    borderTopWidth: 0,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.08)',
      backdropFilter: 'blur(20px)',
    } : {
      ...elevation.level2,
    }),
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
  },
  primaryTabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    minHeight: 76, // Large touch targets for thumb (76pt = comfortable one-handed reach)
  },
  primaryTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: borderRadius.md,
    minHeight: 64, // Large touch target (64pt) for comfortable thumb tapping
    minWidth: 64, // Square touch targets are easier to hit
    maxWidth: (SCREEN_WIDTH - 32) / 5, // Distribute evenly across 5 tabs with padding
    overflow: 'hidden',
    position: 'relative',
  },
  activePrimaryTab: {
    backgroundColor: 'transparent',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(242, 88, 66, 0.15)',
    } : {}),
  },
  pressedTab: {
    opacity: 0.6,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  primaryTabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 2,
  },
  activePrimaryTabLabel: {
    color: colors.primary,
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -12,
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
    fontSize: 9,
    fontWeight: 'bold',
  },
  secondaryContainer: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingVertical: 6,
  },
  secondaryScrollContent: {
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  secondaryTab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    minHeight: 40, // Comfortable touch target for secondary tabs
    minWidth: 80, // Minimum width for easy tapping
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
      backdropFilter: 'blur(10px)',
    } : {}),
  },
  activeSecondaryTab: {
    backgroundColor: 'rgba(242, 88, 66, 0.15)',
    borderColor: `${colors.primary}40`,
  },
  secondaryTabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  secondaryTabLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    marginLeft: 6,
  },
  activeSecondaryTabLabel: {
    color: '#f25842',
    fontWeight: '600',
  },
  smallBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  smallBadgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: 'bold',
  },
})
