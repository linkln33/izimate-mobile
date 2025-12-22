import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

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
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
    paddingBottom: 8,
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
    borderRadius: 12,
    minHeight: 64, // Large touch target (64pt) for comfortable thumb tapping
    minWidth: 64, // Square touch targets are easier to hit
    maxWidth: (SCREEN_WIDTH - 32) / 5, // Distribute evenly across 5 tabs with padding
  },
  activePrimaryTab: {
    backgroundColor: '#fef2f2',
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
    color: '#f25842',
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
    borderRadius: 20,
    backgroundColor: '#f9fafb',
    minHeight: 40, // Comfortable touch target for secondary tabs
    minWidth: 80, // Minimum width for easy tapping
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeSecondaryTab: {
    backgroundColor: '#fee2e2',
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
