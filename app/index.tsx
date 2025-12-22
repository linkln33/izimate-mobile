import { View, Text, StyleSheet, Pressable, Linking, ScrollView, Image, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { useSupabase } from '@/lib/supabase'
import { signInWithOAuth } from '@/lib/auth'
import { Ionicons } from '@expo/vector-icons'

export default function Index() {
  const router = useRouter()
  const { session, loading } = useSupabase()
  const [oauthLoading, setOauthLoading] = useState(false)

  useEffect(() => {
    if (!loading) {
      if (session) {
        router.replace('/(tabs)/dashboard')
      }
      // Don't auto-redirect to login - let user see the landing page
      // They can navigate to login manually
    }
  }, [session, loading, router])

  const handleOAuthLogin = async (provider: 'google' | 'facebook') => {
    setOauthLoading(true)
    try {
      const result = await signInWithOAuth(provider)
      if (result?.session) {
        router.replace('/(tabs)/dashboard')
      }
    } catch (error: any) {
      console.error('OAuth login error:', error)
      // Don't show alert for user cancellation
      if (!error.message?.includes('cancelled') && !error.message?.includes('dismissed')) {
        Alert.alert('Error', error.message || 'Failed to sign in')
      }
    } finally {
      setOauthLoading(false)
    }
  }

  // Show landing page when not logged in
  if (!loading && !session) {
    const socialLinks = [
      { name: 'Facebook', icon: 'logo-facebook', url: 'https://facebook.com' },
      { name: 'Twitter', icon: 'logo-twitter', url: 'https://twitter.com' },
      { name: 'Instagram', icon: 'logo-instagram', url: 'https://instagram.com' },
      { name: 'LinkedIn', icon: 'logo-linkedin', url: 'https://linkedin.com' },
    ]

    return (
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Logo */}
          <Image
            source={{ uri: 'https://izimate.com/picture/izimate-logo.png' }}
            style={styles.logo}
            resizeMode="contain"
          />
          
          <Text style={styles.subtitle}>Swipe to find local services</Text>
          <Text style={styles.description}>
            Connect with service providers in your area. Swipe right to like, left to pass.
          </Text>
          
          {/* Sign In and Sign Up buttons side by side */}
          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.buttonHalf, styles.primaryButton]}
              onPress={() => router.push('/(auth)/login')}
            >
              <Text style={styles.primaryButtonText}>Sign In</Text>
            </Pressable>
            
            <Pressable
              style={[styles.buttonHalf, styles.secondaryButton]}
              onPress={() => router.push('/(auth)/signup')}
            >
              <Text style={styles.secondaryButtonText}>Sign Up</Text>
            </Pressable>
          </View>

          {/* Social Login buttons */}
          <View style={styles.oauthContainer}>
            <Pressable
              style={[styles.oauthButton, styles.googleButton, oauthLoading && styles.buttonDisabled]}
              onPress={() => handleOAuthLogin('google')}
              disabled={oauthLoading}
            >
              <Ionicons name="logo-google" size={28} color="#4285F4" />
            </Pressable>

            <Pressable
              style={[styles.oauthButton, styles.facebookButton, oauthLoading && styles.buttonDisabled]}
              onPress={() => handleOAuthLogin('facebook')}
              disabled={oauthLoading}
            >
              <Ionicons name="logo-facebook" size={28} color="#1877F2" />
            </Pressable>
          </View>

          {/* Social Links */}
          <View style={styles.socialContainer}>
            <Text style={styles.socialTitle}>Follow Us</Text>
            <View style={styles.socialIcons}>
              {socialLinks.map((social) => (
                <Pressable
                  key={social.name}
                  style={styles.socialIcon}
                  onPress={() => Linking.openURL(social.url)}
                  accessibilityLabel={social.name}
                >
                  <Ionicons name={social.icon as any} size={24} color="#6b7280" />
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    )
  }

  // Show loading screen while checking auth
  return (
    <View style={styles.container}>
      <Text style={styles.title}>iZimate Job</Text>
      <Text style={styles.subtitle}>Loading...</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 400,
    padding: 24,
    alignItems: 'center',
  },
  logo: {
    width: 280,
    height: 84,
    marginBottom: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 20,
    color: '#6b7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  buttonRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  buttonHalf: {
    flex: 1,
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: '100%',
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  oauthContainer: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 40,
  },
  oauthButton: {
    flex: 1,
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  googleButton: {
    // White background with border (inherited from oauthButton)
  },
  facebookButton: {
    // White background with border (inherited from oauthButton)
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButton: {
    backgroundColor: '#f25842',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#4285F4', // Blue for Sign Up
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  socialContainer: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: 32,
  },
  socialTitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 16,
    fontWeight: '500',
  },
  socialIcons: {
    flexDirection: 'row',
    gap: 20,
  },
  socialIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
  },
})
