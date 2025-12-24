import { useEffect } from 'react'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { View, Text, StyleSheet, ActivityIndicator, Platform, Linking } from 'react-native'
import * as AuthSession from 'expo-auth-session'

/**
 * OAuth callback handler for mobile app
 * This screen handles the deep link redirect from OAuth providers
 */
export default function AuthCallback() {
  const router = useRouter()
  const params = useLocalSearchParams()
  
  // On web, also check window.location for URL parameters
  const getParam = (key: string): string | undefined => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      // Parse hash fragment - tokens are in hash like: #access_token=...&refresh_token=...
      const hash = window.location.hash.substring(1) // Remove #
      const hashParams = new URLSearchParams(hash)
      const value = urlParams.get(key) || hashParams.get(key) || params[key] as string | undefined
      if (__DEV__ && value) {
        console.log(`🔵 getParam(${key}):`, value.substring(0, 30) + (value.length > 30 ? '...' : ''))
      }
      return value
    }
    return params[key] as string | undefined
  }
  
  const code = getParam('code')
  const accessToken = getParam('access_token')
  const refreshToken = getParam('refresh_token')
  const error = getParam('error')
  const referralCode = getParam('ref') || getParam('referral_code')
  
  // Debug: Log extracted tokens
  if (__DEV__) {
    console.log('🔵 Extracted tokens:', {
      hasCode: !!code,
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      accessTokenPreview: accessToken ? accessToken.substring(0, 20) + '...' : 'none',
      refreshTokenPreview: refreshToken ? refreshToken.substring(0, 20) + '...' : 'none',
    })
  }

  useEffect(() => {
    async function handleCallback() {
      console.log('🔵 Auth callback route triggered')
      console.log('🔵 Callback params:', { code: code ? 'present' : 'missing', error, hasAccessToken: !!accessToken, hasRefreshToken: !!refreshToken })
      console.log('🔵 Full params:', params)
      console.log('🔵 Window location:', typeof window !== 'undefined' ? window.location.href : 'N/A')
      
      // Small delay to ensure router is mounted
      await new Promise(resolve => setTimeout(resolve, 100))
      
      if (error) {
        console.error('OAuth error:', error)
        try {
          router.replace('/(auth)/login?error=' + encodeURIComponent(error))
        } catch (e) {
          console.error('Navigation error:', e)
        }
        return
      }

      try {
        // First, check if Supabase already created a session (common with hash-based redirects)
        const { data: { session: existingSession }, error: sessionCheckError } = await supabase.auth.getSession()
        
        if (existingSession && !sessionCheckError) {
          console.log('✅ Found existing session from OAuth redirect')
          
          // Save referral code if present
          if (referralCode && existingSession.user) {
            try {
              const { error: updateError } = await supabase
                .from('users')
                .update({ referred_by_code: referralCode })
                .eq('id', existingSession.user.id)
              
              if (updateError) {
                console.error('Error saving referral code:', updateError)
              } else {
                console.log('✅ Referral code saved:', referralCode)
              }
            } catch (err) {
              console.error('Error processing referral code:', err)
            }
          }
          
          // If we're on web in a mobile browser, try to redirect to Expo app
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            const userAgent = window.navigator.userAgent || ''
            const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
            
            if (isMobile && existingSession) {
              // Get the current hostname and port
              const hostname = window.location.hostname
              const port = window.location.port || '8083'
              
              // Try to redirect to Expo app using exp:// scheme
              const expoDeepLink = `exp://${hostname}:${port}/--/auth/callback`
              console.log('📱 Mobile browser detected, attempting to redirect to Expo app:', expoDeepLink)
              
              // Try to open in Expo app (this will work if Expo Go is installed)
              try {
                window.location.href = expoDeepLink
                // Show a message while redirecting
                setTimeout(() => {
                  // If redirect didn't work, continue with web navigation
                  try {
                    router.replace('/(tabs)/dashboard')
                  } catch (e) {
                    console.error('Navigation error:', e)
                  }
                }, 2000)
                return
              } catch (linkError) {
                console.log('⚠️ Could not redirect to app, continuing with web navigation')
              }
            }
          }
          
          try {
            router.replace('/(tabs)/dashboard')
          } catch (e) {
            console.error('Navigation error:', e)
          }
          return
        }

        // If we have tokens directly, set them in Supabase
        if (accessToken && refreshToken) {
          console.log('Setting session from tokens...')
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (sessionError) {
            console.error('Session error:', sessionError)
            try {
              router.replace('/(auth)/login?error=' + encodeURIComponent(sessionError.message))
            } catch (e) {
              console.error('Navigation error:', e)
            }
            return
          }

          if (sessionData?.session) {
            console.log('OAuth success, redirecting to dashboard')
            
            // Save referral code if present
            if (referralCode && sessionData.session.user) {
              try {
                const { error: updateError } = await supabase
                  .from('users')
                  .update({ referred_by_code: referralCode })
                  .eq('id', sessionData.session.user.id)
                
                if (updateError) {
                  console.error('Error saving referral code:', updateError)
                } else {
                  console.log('✅ Referral code saved:', referralCode)
                }
              } catch (err) {
                console.error('Error processing referral code:', err)
              }
            }
            
            try {
              router.replace('/(tabs)/dashboard')
            } catch (e) {
              console.error('Navigation error:', e)
            }
          } else {
            try {
              router.replace('/(auth)/login?error=no_session')
            } catch (e) {
              console.error('Navigation error:', e)
            }
          }
          return
        }

        // If we only have access_token (no refresh_token), try to set session with just access_token
        // Or check if session was auto-created
        if (accessToken && !refreshToken) {
          console.log('🔵 Only access_token found, attempting to use it...')
          console.log('🔵 Access token length:', accessToken.length)
          
          // First, try to set session with just access_token (Supabase might accept it)
          try {
            const { data: sessionData, error: tokenError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: '', // Empty refresh token
            })
            
            if (tokenError) {
              console.log('⚠️ setSession error:', tokenError.message)
            }
            
            if (!tokenError && sessionData?.session) {
              console.log('✅ Session created from access_token only')
              
              // Save referral code if present
              if (referralCode && sessionData.session.user) {
                try {
                  const { error: updateError } = await supabase
                    .from('users')
                    .update({ referred_by_code: referralCode })
                    .eq('id', sessionData.session.user.id)
                  
                  if (updateError) {
                    console.error('Error saving referral code:', updateError)
                  } else {
                    console.log('✅ Referral code saved:', referralCode)
                  }
                } catch (err) {
                  console.error('Error processing referral code:', err)
                }
              }
              
              try {
                router.replace('/(tabs)/dashboard')
              } catch (e) {
                console.error('Navigation error:', e)
              }
              return
            }
          } catch (tokenErr) {
            console.log('⚠️ Could not set session with access_token only, trying auto-created session check...')
          }
          
          // If that didn't work, wait and check if Supabase auto-created the session
          console.log('Checking for auto-created session...')
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          const { data: { session: autoSession }, error: autoSessionError } = await supabase.auth.getSession()
          
          if (autoSession && !autoSessionError) {
            console.log('✅ Session auto-created from access_token')
            
            // Save referral code if present
            if (referralCode && autoSession.user) {
              try {
                const { error: updateError } = await supabase
                  .from('users')
                  .update({ referred_by_code: referralCode })
                  .eq('id', autoSession.user.id)
                
                if (updateError) {
                  console.error('Error saving referral code:', updateError)
                } else {
                  console.log('✅ Referral code saved:', referralCode)
                }
              } catch (err) {
                console.error('Error processing referral code:', err)
              }
            }
            
            try {
              router.replace('/(tabs)/dashboard')
            } catch (e) {
              console.error('Navigation error:', e)
            }
            return
          } else {
            console.error('❌ No session found after access_token redirect:', autoSessionError)
          }
        }

        // If we have a code, exchange it for a session (most common case)
        if (code) {
          console.log('🔵 Exchanging code for session...', code.substring(0, 20) + '...')
          try {
            const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)

            if (sessionError) {
              console.error('❌ Session exchange error:', sessionError)
              try {
                router.replace('/(auth)/login?error=' + encodeURIComponent(sessionError.message))
              } catch (e) {
                console.error('Navigation error:', e)
              }
              return
            }

            if (sessionData?.session) {
              console.log('✅ OAuth success! Session created:', {
                userId: sessionData.session.user.id,
                email: sessionData.session.user.email,
              })
              
              // Save referral code if present
              if (referralCode && sessionData.session.user) {
                try {
                  const { error: updateError } = await supabase
                    .from('users')
                    .update({ referred_by_code: referralCode })
                    .eq('id', sessionData.session.user.id)
                  
                  if (updateError) {
                    console.error('Error saving referral code:', updateError)
                  } else {
                    console.log('✅ Referral code saved:', referralCode)
                  }
                } catch (err) {
                  console.error('Error processing referral code:', err)
                }
              }
              
              // Small delay to ensure session is saved to storage
              await new Promise(resolve => setTimeout(resolve, 500))
              
              // Verify session was saved
              const { data: { session: verifySession } } = await supabase.auth.getSession()
              if (verifySession) {
                console.log('✅ Session verified')
                
                // If we're in a popup (Expo web), notify the parent window
                if (typeof window !== 'undefined' && window.opener && !window.opener.closed) {
                  console.log('📤 Notifying parent window of successful auth')
                  try {
                    // Send message to parent window
                    window.opener.postMessage(
                      {
                        type: 'OAUTH_SUCCESS',
                        session: {
                          access_token: verifySession.access_token,
                          refresh_token: verifySession.refresh_token,
                          expires_at: verifySession.expires_at,
                          user: verifySession.user,
                        },
                      },
                      window.location.origin
                    )
                    // Close the popup after a short delay
                    setTimeout(() => {
                      window.close()
                    }, 500)
                  } catch (e) {
                    console.error('Error notifying parent window:', e)
                  }
                }
                
                // Redirect to dashboard (or close popup if in popup)
                if (typeof window !== 'undefined' && window.opener && !window.opener.closed) {
                  // In popup, let parent handle navigation
                  console.log('✅ Popup will close, parent window will handle navigation')
                } else {
                  // Not in popup, navigate directly
                  console.log('✅ Redirecting to dashboard')
                  try {
                    // Use router.replace for in-app navigation
                    router.replace('/(tabs)/dashboard')
                  } catch (e) {
                    console.error('Navigation error:', e)
                    // Fallback: try window.location if router fails
                    if (typeof window !== 'undefined' && window.location) {
                      const dashboardUrl = `${window.location.protocol}//${window.location.host}/(tabs)/dashboard`
                      console.log('🔄 Fallback: redirecting to', dashboardUrl)
                      window.location.href = dashboardUrl
                    }
                  }
                }
              } else {
                console.error('❌ Session not persisted after creation')
                try {
                  router.replace('/(auth)/login?error=session_not_persisted')
                } catch (e) {
                  console.error('Navigation error:', e)
                }
              }
            } else {
              console.error('❌ No session in exchange response')
              try {
                router.replace('/(auth)/login?error=no_session')
              } catch (e) {
                console.error('Navigation error:', e)
              }
            }
            return
          } catch (err: any) {
            console.error('❌ Code exchange exception:', err)
            try {
              router.replace('/(auth)/login?error=' + encodeURIComponent(err.message || 'exchange_failed'))
            } catch (e) {
              console.error('Navigation error:', e)
            }
            return
          }
        }

        // If no code, check if we already have a session (Supabase might have created it)
        console.log('No code in URL, checking for existing session...')
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session check error:', sessionError)
          try {
            router.replace('/(auth)/login?error=' + encodeURIComponent(sessionError.message))
          } catch (e) {
            console.error('Navigation error:', e)
          }
          return
        }
        
        if (session) {
          console.log('Found existing session, redirecting to dashboard')
          try {
            router.replace('/(tabs)/dashboard')
          } catch (e) {
            console.error('Navigation error:', e)
          }
          return
        }
        
        console.error('No authorization code or tokens received, and no existing session')
        try {
          router.replace('/(auth)/login?error=no_code')
        } catch (e) {
          console.error('Navigation error:', e)
        }
      } catch (err: any) {
        console.error('Callback error:', err)
        try {
          router.replace('/(auth)/login?error=' + encodeURIComponent(err.message || 'unknown_error'))
        } catch (e) {
          console.error('Navigation error:', e)
        }
      }
    }

    handleCallback()
  }, [code, accessToken, refreshToken, error, referralCode, router])

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#f25842" />
      <Text style={styles.text}>Completing sign in...</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
})
