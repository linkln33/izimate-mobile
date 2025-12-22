import React, { useEffect } from 'react'
import { View, StyleSheet, Dimensions, LayoutAnimation, Platform, UIManager } from 'react-native'
import { GestureDetector, Gesture } from 'react-native-gesture-handler'
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated'
import { ListingCard } from '../listings/ListingCard'
import { createShadowStyle } from '@/utils/shadowStyles'
import type { Listing, User } from '@/lib/types'

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')
const CARD_WIDTH = SCREEN_WIDTH * 0.9

interface EnrichedListing extends Listing {
  customer?: User
  customerRating?: number
  positivePercentage?: number
  distance?: number
}

interface CardDisplayProps {
  listings: EnrichedListing[]
  currentIndex: number
  currentListing: EnrichedListing | undefined
  isCardExpanded: boolean
  onExpandChange: (expanded: boolean) => void
  panGesture: Gesture.Pan
  animatedCardStyle: any
}

export function CardDisplay({
  listings,
  currentIndex,
  currentListing,
  isCardExpanded,
  onExpandChange,
  panGesture,
  animatedCardStyle,
}: CardDisplayProps) {
  if (!currentListing) {
    return null
  }

  // Calculate button space based on screen size
  const buttonSpace = SCREEN_HEIGHT < 600 ? 124 : SCREEN_HEIGHT < 900 ? 144 : 164
  
  // Animated height that expands downward
  const animatedHeight = useAnimatedStyle(() => {
    return {
      height: withSpring(
        isCardExpanded 
          ? Math.min(SCREEN_HEIGHT * 0.95, SCREEN_HEIGHT - 20 - buttonSpace)
          : Math.min(SCREEN_HEIGHT * 0.75, SCREEN_HEIGHT - 20 - buttonSpace),
        {
          damping: 20,
          stiffness: 90,
        }
      ),
    }
  })

  // Animate height expansion using LayoutAnimation
  useEffect(() => {
    LayoutAnimation.configureNext({
      duration: 300,
      create: { type: 'easeInEaseOut', property: 'opacity' },
      update: { type: 'spring', springDamping: 0.7 },
    })
  }, [isCardExpanded])

  // When expanded, return the card structure without ScrollView (ScrollView is outside)
  if (isCardExpanded) {
    return (
      <View style={styles.cardContainer}>
        {/* Background cards */}
        {currentIndex < listings.length - 1 && (
          <View style={[styles.card, styles.cardBack, { zIndex: 1 }]}>
            <ListingCard listing={listings[currentIndex + 1]} isExpanded={false} />
          </View>
        )}
        {currentIndex < listings.length - 2 && (
          <View style={[styles.card, styles.cardBack, { zIndex: 0 }]}>
            <ListingCard listing={listings[currentIndex + 2]} isExpanded={false} />
          </View>
        )}

        {/* Current card */}
        <Animated.View
          style={[
            styles.cardExpanded,
            styles.cardFront,
            animatedHeight,
            animatedCardStyle
          ]}
        >
          <ListingCard 
            listing={currentListing} 
            isExpanded={isCardExpanded}
            onExpandChange={onExpandChange}
          />
        </Animated.View>
      </View>
    )
  }

  // When collapsed, normal structure
  return (
    <View style={styles.cardContainer}>
      {/* Background cards */}
      {currentIndex < listings.length - 1 && (
        <View style={[styles.card, styles.cardBack, { zIndex: 1 }]}>
          <ListingCard listing={listings[currentIndex + 1]} isExpanded={false} />
        </View>
      )}
      {currentIndex < listings.length - 2 && (
        <View style={[styles.card, styles.cardBack, { zIndex: 0 }]}>
          <ListingCard listing={listings[currentIndex + 2]} isExpanded={false} />
        </View>
      )}

      {/* Current card */}
      <GestureDetector gesture={panGesture}>
        <Animated.View 
          style={[
            styles.card, 
            styles.cardFront,
            animatedHeight,
            animatedCardStyle
          ]}
        >
          <ListingCard 
            listing={currentListing} 
            isExpanded={isCardExpanded}
            onExpandChange={onExpandChange}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  )
}

const styles = StyleSheet.create({
  cardContainer: {
    width: Platform.OS === 'web' ? '90%' : CARD_WIDTH,
    maxWidth: Platform.OS === 'web' ? 600 : CARD_WIDTH,
    alignSelf: 'center',
    minHeight: SCREEN_HEIGHT * 0.75,
    position: 'absolute',
    top: 20, // Fixed top position - small margin from top
    left: Platform.OS === 'web' ? '5%' : (SCREEN_WIDTH - CARD_WIDTH) / 2, // Center horizontally
    zIndex: 5,
  },
  cardContainerInner: {
    width: '100%',
    minHeight: SCREEN_HEIGHT * 0.75,
    position: 'relative',
    top: 0, // Start from top of container
  },
  card: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    // Responsive height: account for action buttons at bottom
    // Small screens: 75% height but max to leave space for buttons (124px)
    // Medium screens: 75% height with more space for buttons (144px)
    // Large screens: 75% height with even more space (164px)
    height: Math.min(
      SCREEN_HEIGHT * 0.75,
      SCREEN_HEIGHT - 20 - (SCREEN_HEIGHT < 600 ? 124 : SCREEN_HEIGHT < 900 ? 144 : 164)
    ),
    borderRadius: 20,
    backgroundColor: '#ffffff',
    ...createShadowStyle(0.2, 8, { width: 0, height: 4 }),
    overflow: 'hidden',
  },
  cardExpanded: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    borderRadius: 20,
    backgroundColor: '#ffffff',
    ...createShadowStyle(0.2, 8, { width: 0, height: 4 }),
    overflow: 'hidden',
  },
  cardFront: {
    zIndex: 10,
  },
  cardBack: {
    transform: [{ scale: 0.95 }],
    opacity: 0.7,
  },
})
