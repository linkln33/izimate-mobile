import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { signInWithOAuth } from '@/lib/auth'
import { Ionicons } from '@expo/vector-icons'

export default function SignupScreen() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [loading, setLoading] = useState(false)

  // Extract referral code from URL params (e.g., ?ref=CODE123)
  useEffect(() => {
    const ref = params.ref as string | undefined
    if (ref) {
      setReferralCode(ref)
    }
  }, [params.ref])

  const handleSignup = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters')
      return
    }

    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setLoading(false)
      Alert.alert('Error', error.message)
      return
    }

    // If signup successful and we have a referral code, save it to user profile
    if (data.user && referralCode) {
      try {
        // Update user profile with referral code
        const { error: updateError } = await supabase
          .from('users')
          .update({ referred_by_code: referralCode })
          .eq('id', data.user.id)

        if (updateError) {
          console.error('Error saving referral code:', updateError)
          // Don't fail signup if referral code save fails
        }
      } catch (err) {
        console.error('Error processing referral code:', err)
        // Don't fail signup if referral code processing fails
      }
    }

    setLoading(false)
    Alert.alert('Success', 'Account created! Please check your email to verify your account.')
    router.replace('/(auth)/login')
  }

  const handleOAuthSignup = async (provider: 'google' | 'facebook') => {
    setLoading(true)
    try {
      // Store referral code in session storage or pass it through OAuth flow
      // We'll handle it in the callback
      if (referralCode) {
        // Store in AsyncStorage or pass as query param
        // For now, we'll handle it in the callback by checking URL params
        // The referral code should be preserved in the OAuth redirect URL
      }
      
      const result = await signInWithOAuth(provider)
      if (result?.session) {
        // Save referral code after OAuth signup
        if (referralCode && result.session.user) {
          try {
            await supabase
              .from('users')
              .update({ referred_by_code: referralCode })
              .eq('id', result.session.user.id)
          } catch (err) {
            console.error('Error saving referral code after OAuth:', err)
          }
        }
        router.replace('/(tabs)/dashboard')
      }
    } catch (error: any) {
      console.error('OAuth signup error:', error)
      // Don't show alert for user cancellation
      if (!error.message?.includes('cancelled') && !error.message?.includes('dismissed')) {
        Alert.alert('Error', error.message || 'Failed to sign up')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Sign up to get started</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
      />

      <TextInput
        style={styles.input}
        placeholder="Referral Code (optional)"
        value={referralCode}
        onChangeText={setReferralCode}
        autoCapitalize="characters"
        autoComplete="off"
      />

      <Pressable
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSignup}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Creating...' : 'Sign Up'}</Text>
      </Pressable>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.oauthContainer}>
        <Pressable
          style={[styles.oauthButton, styles.googleButton, loading && styles.buttonDisabled]}
          onPress={() => handleOAuthSignup('google')}
          disabled={loading}
        >
          <Ionicons name="logo-google" size={20} color="#ffffff" />
        </Pressable>

        <Pressable
          style={[styles.oauthButton, styles.facebookButton, loading && styles.buttonDisabled]}
          onPress={() => handleOAuthSignup('facebook')}
          disabled={loading}
        >
          <Ionicons name="logo-facebook" size={20} color="#ffffff" />
        </Pressable>
      </View>

      <Pressable onPress={() => router.back()}>
        <Text style={styles.linkText}>Already have an account? Sign in</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 32,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    height: 50,
    backgroundColor: '#f25842',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkText: {
    color: '#f25842',
    fontSize: 14,
    textAlign: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#6b7280',
    fontSize: 14,
  },
  oauthContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  oauthButton: {
    flex: 1,
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButton: {
    backgroundColor: '#4285F4',
  },
  facebookButton: {
    backgroundColor: '#1877F2',
  },
})
