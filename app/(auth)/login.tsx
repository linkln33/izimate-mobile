import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { signInWithOAuth } from '@/lib/auth'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'

export default function LoginScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t('common.error'), t('auth.pleaseFillAllFields'))
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      Alert.alert(t('common.error'), error.message)
    } else {
      router.replace('/(tabs)/dashboard')
    }
  }

  const handleOAuthLogin = async (provider: 'google' | 'facebook') => {
    setLoading(true)
    try {
      const result = await signInWithOAuth(provider)
      if (result?.session) {
        router.replace('/(tabs)/dashboard')
      }
    } catch (error: any) {
      console.error('OAuth login error:', error)
      // Don't show alert for user cancellation
      if (!error.message?.includes('cancelled') && !error.message?.includes('dismissed')) {
        Alert.alert(t('common.error'), error.message || t('auth.failedToSignIn'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('auth.welcomeBack')}</Text>
      <Text style={styles.subtitle}>{t('auth.signInToContinue')}</Text>

      <TextInput
        style={styles.input}
        placeholder={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />

      <TextInput
        style={styles.input}
        placeholder={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
      />

      <Pressable
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? t('auth.signingIn') : t('auth.signIn')}</Text>
      </Pressable>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>{t('auth.or')}</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.oauthContainer}>
        <Pressable
          style={[styles.oauthButton, styles.googleButton, loading && styles.buttonDisabled]}
          onPress={() => handleOAuthLogin('google')}
          disabled={loading}
        >
          <Ionicons name="logo-google" size={20} color="#ffffff" />
        </Pressable>

        <Pressable
          style={[styles.oauthButton, styles.facebookButton, loading && styles.buttonDisabled]}
          onPress={() => handleOAuthLogin('facebook')}
          disabled={loading}
        >
          <Ionicons name="logo-facebook" size={20} color="#ffffff" />
        </Pressable>
      </View>

      <Pressable onPress={() => router.push('/(auth)/signup')}>
        <Text style={styles.linkText}>{t('auth.dontHaveAccount')}</Text>
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
