import React, { useEffect } from 'react'
import { View, StyleSheet, Dimensions, ScrollView, LayoutAnimation, Platform, UIManager } from 'react-native'
import { GestureDetector, Gesture } from 'react-native-gesture-handler'
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated'
import { ListingCard } from '../listings/ListingCard'
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

interface CardContainerProps {
  listings: EnrichedListing[]
  currentIndex: number
  currentListing: EnrichedListing | undefined
  isCardExpanded: boolean
  onExpandChange: (expanded: boolean) => void
  panGesture: Gesture.Pan
  animatedCardStyle: any
}

export function CardContainer({
  listings,
  currentIndex,
  currentListing,
  isCardExpanded,
  onExpandChange,
  panGesture,
  animatedCardStyle,
}: CardContainerProps) {
  if (!currentListing) {
    return null
  }

  // Animated height that expands downward
  const animatedHeight = useAnimatedStyle(() => {
    return {
      height: withSpring(
        isCardExpanded ? SCREEN_HEIGHT * 0.95 : SCREEN_HEIGHT * 0.75,
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

  if (isCardExpanded) {
    // When expanded, ScrollView wraps the entire card container
    return (
      <ScrollView 
        style={styles.cardContainer}
        contentContainerStyle={styles.cardScrollContainerExpanded}
        scrollEnabled={true}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={false}
        bounces={true}
        scrollEventThrottle={16}
      >
        <View style={styles.cardContainerInner}>
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
              styles.cardExpandedScrollView,
              styles.cardFront,
              animatedHeight, // Animated height that expands downward
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
      </ScrollView>
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
    position: 'relative',
    zIndex: 5,
  },
  cardContainerInner: {
    width: '100%',
    minHeight: SCREEN_HEIGHT * 0.75,
    position: 'relative',
  },
  card: {
    position: 'absolute',
    top: 0, // Anchor at top
    left: 0,
    width: '100%',
    height: SCREEN_HEIGHT * 0.75,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  cardExpandedScrollView: {
    // When expanded, ScrollView is the card container itself
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    borderRadius: 20,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  cardFront: {
    zIndex: 10,
  },
  // cardExpanded style removed - using animated height instead
  cardBack: {
    transform: [{ scale: 0.95 }],
    opacity: 0.7,
  },
  cardScrollContainerExpanded: {
    paddingBottom: 120,
    minHeight: SCREEN_HEIGHT * 1.1, // Ensure content is taller than container to enable scrolling
  },
})
