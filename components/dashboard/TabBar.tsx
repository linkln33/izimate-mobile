import { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

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
              <View style={styles.tabContent}>
                <View style={styles.iconContainer}>
                  <Ionicons
                    name={tab.icon as any}
                    size={22}
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
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
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
    borderRadius: 10,
    minWidth: 65,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeTab: {
    backgroundColor: '#fef2f2',
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
    color: '#f25842',
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
    marginLeft: -18,
    width: 36,
    height: 3,
    backgroundColor: '#f25842',
    borderRadius: 2,
  },
})
