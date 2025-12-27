import { supabase } from './supabase'
import * as AuthSession from 'expo-auth-session'
import * as WebBrowser from 'expo-web-browser'
import { Platform, Linking } from 'react-native'
import Constants from 'expo-constants'

// Complete the auth session for better UX
WebBrowser.maybeCompleteAuthSession()

/**
 * Sign in with OAuth provider (Google or Facebook)
 * Uses the same Supabase backend as the web app
 * Mobile-specific implementation using expo-auth-session for deep linking
 */
export async function signInWithOAuth(provider: 'google' | 'facebook') {
  // IMPORTANT: Google/Facebook OAuth don't support custom scheme URLs (exp://, izimate-job://)
  // So we use a web URL that then deep links to the app
  // This web URL must be added to Google OAuth Authorized redirect URIs
  // For development, use localhost. For production, use the production domain
  
  // Generate the mobile deep link first
  // For Expo Go, use exp:// scheme. For production builds, use custom scheme
  const mobileDeepLink = AuthSession.makeRedirectUri({
    scheme: 'izimate-job',
    path: 'auth/callback',
  })
  
  // Also generate exp:// link for Expo Go
  const expoGoDeepLink = AuthSession.makeRedirectUri({
    scheme: 'exp',
    path: 'auth/callback',
  })
  
  const isDevelopment = __DEV__ || process.env.NODE_ENV === 'development'
  
  // Get the current origin (hostname + port) if available
  // This works for both localhost and network IPs (e.g., 192.168.1.100:8083)
  // NOTE: In tunnel mode, the hostname changes when tunnel reconnects, which breaks OAuth
  // For stable OAuth, prefer LAN mode with a fixed IP address
  let currentOrigin: string | null = null
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname
    // Check if we're in tunnel mode (ngrok URLs contain .exp.direct or .ngrok.io)
    const isTunnelMode = hostname.includes('.exp.direct') || hostname.includes('.ngrok.io')
    
    if (isTunnelMode && isDevelopment) {
      // Tunnel mode is unstable for OAuth - prefer using Next.js callback or LAN mode
      console.log('⚠️ Tunnel mode detected - OAuth redirects may be unstable')
      console.log('💡 Tip: Use LAN mode (--lan) for more stable OAuth redirects')
      // Still use the tunnel URL, but warn that it may change
      currentOrigin = `${window.location.protocol}//${window.location.host}`
    } else {
      // LAN mode or production - use the origin
      currentOrigin = `${window.location.protocol}//${window.location.host}`
    }
  }
  
  // Check if we're in a browser (even on mobile devices accessing Expo web)
  // If we have window.location with port 8083 or a network IP, we're in Expo web
  const isInBrowser = typeof window !== 'undefined' && 
                     typeof window.location !== 'undefined' &&
                     (window.location.port === '8083' || 
                      window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1' || 
                      (window.location.hostname && /^192\.168\.|^10\.|^172\./.test(window.location.hostname)))
  
  // Check for browser APIs (for postMessage support in popup flow)
  // This is optional - we can still be Expo web without all APIs
  const hasBrowserAPIs = typeof window !== 'undefined' && 
                         typeof window.location !== 'undefined' && 
                         typeof window.addEventListener === 'function' &&
                         typeof window.postMessage === 'function'
  
  // If we're in a browser with port 8083 or network IP, treat as Expo web
  // This handles the case where Platform.OS is 'android'/'ios' but we're in a browser
  // We prioritize isInBrowser check over Platform.OS since we can access Expo web from mobile browsers
  const isExpoWeb = isInBrowser || (Platform.OS === 'web' && hasBrowserAPIs)
  const isExpoNative = !isExpoWeb && (Platform.OS === 'ios' || Platform.OS === 'android')
  
  console.log('🔍 OAuth environment check:', { 
    isExpoWeb, 
    isExpoNative, 
    isInBrowser,
    platform: Platform.OS,
    port: typeof window !== 'undefined' ? window.location.port : 'N/A',
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'N/A',
    currentOrigin,
  })
  
  // If running in Expo web (browser), use the current origin for redirect
  // This works for both localhost and network IPs
  // For native Expo, we need to use a web URL that Google/Facebook accept,
  // but we'll try to use the deep link if possible
  let webRedirectUrl: string
  let redirectTo: string
  
  if (isExpoWeb && currentOrigin) {
    // Direct redirect to Expo web app using current origin (works for localhost and network IP)
    webRedirectUrl = `${currentOrigin}/auth/callback`
    redirectTo = webRedirectUrl
    console.log('🌐 Using current origin for redirect:', webRedirectUrl)
  } else if (isExpoNative) {
    // For native Expo apps, detect tunnel mode and use appropriate URL
    if (isDevelopment) {
      // Try to get the current manifest URL from Constants (works in tunnel mode)
      const manifestUrl = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.debuggerHost
      const isTunnelMode = manifestUrl?.includes('.exp.direct') || manifestUrl?.includes('.ngrok.io')
      
      if (isTunnelMode && manifestUrl) {
        // Extract hostname from manifest URL (e.g., "4f50jpc-anonymous-8083.exp.direct")
        const hostname = manifestUrl.split(':')[0] // Remove port if present
        webRedirectUrl = `http://${hostname}/auth/callback`
        redirectTo = webRedirectUrl
        console.log('📱 Native app in tunnel mode, using tunnel URL:', webRedirectUrl)
      } else {
        // LAN mode - try to get current IP or use production fallback
        // For now, use production callback as it's more reliable
        // Users can add their local IP to Supabase if needed
        webRedirectUrl = 'https://izimate.com/auth/callback-mobile?mobile=true'
        redirectTo = webRedirectUrl
        console.log('📱 Native app in LAN mode, using production callback (add local IP to Supabase if needed):', webRedirectUrl)
        console.log('💡 Tip: Add your local IP (e.g., http://YOUR_IP:8083/auth/callback) to Supabase Dashboard for LAN mode')
      }
    } else {
      // Production: use production callback URL
      webRedirectUrl = 'https://izimate.com/auth/callback-mobile?mobile=true'
      redirectTo = webRedirectUrl
      console.log('📱 Native app detected, using production callback:', webRedirectUrl)
    }
    console.log('📱 Deep link will be:', expoGoDeepLink)
  } else if (isDevelopment) {
    // Use Next.js callback route which will deep link to native app
    webRedirectUrl = `http://localhost:3000/auth/callback-mobile?mobile=true`
    redirectTo = webRedirectUrl
  } else {
    // Production: use production callback route
    webRedirectUrl = 'https://izimate.com/auth/callback-mobile?mobile=true'
    redirectTo = webRedirectUrl
  }

  console.log('OAuth web redirect URL (for Google/Facebook):', webRedirectUrl)
  console.log('Mobile deep link (final destination):', mobileDeepLink)
  console.log('Expo Go deep link:', expoGoDeepLink)
  
  // IMPORTANT: This exact URL must be added to Supabase Dashboard:
  // Authentication → URL Configuration → Redirect URLs
  // Add both:
  // - exp://192.168.50.101:8082/--/auth/callback (for Expo Go development)
  // - izimate-job://auth/callback (for production builds)

  // Same Supabase OAuth call as web app, but with skipBrowserRedirect for mobile
  // IMPORTANT: The redirectTo URL must be:
  // 1. Added to Supabase Dashboard → Authentication → URL Configuration → Redirect URLs
  // 2. Added to OAuth provider (Google/Facebook) → Authorized redirect URIs
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true, // Mobile-specific: we handle the browser ourselves
      // Query params are automatically added by Supabase
    },
  })

  if (error) {
    console.error('OAuth error:', error)
    throw error
  }

  if (data?.url) {
    console.log('Opening OAuth URL:', data.url)
    console.log('Expected redirect to:', redirectTo)
    
    // Verify the redirect URL is in the OAuth URL
    const urlHasRedirect = data.url.includes(encodeURIComponent(redirectTo))
    console.log('Redirect URL in OAuth URL:', urlHasRedirect)
    
    // Extract the actual redirect_to parameter from the URL
    try {
      const oauthUrl = new URL(data.url)
      const actualRedirect = oauthUrl.searchParams.get('redirect_to')
      console.log('Actual redirect_to in OAuth URL:', actualRedirect)
      console.log('Expected redirect_to:', redirectTo)
      
      if (actualRedirect !== redirectTo) {
        console.warn('⚠️ WARNING: Redirect URL mismatch!')
        console.warn('Expected:', redirectTo)
        console.warn('Actual:', actualRedirect)
        console.warn('This means Supabase is not using your mobile redirect URL.')
        console.warn('Check Supabase Dashboard → Authentication → URL Configuration')
      }
    } catch (e) {
      console.warn('Could not parse OAuth URL:', e)
    }
    
    if (!urlHasRedirect) {
      console.warn('⚠️ WARNING: Redirect URL not found in OAuth URL!')
      console.warn('This means Supabase may be using a default redirect URL instead.')
      console.warn('Make sure to add this exact URL to Supabase Dashboard:')
      console.warn('  Authentication → URL Configuration → Redirect URLs')
      console.warn('  URL:', redirectTo)
    }

    // Open OAuth in browser and wait for callback
    // WebBrowser.openAuthSessionAsync works on both web and native
    // We need to listen for both the callback-mobile URL and any fallback URLs
    // Supabase might redirect to the Site URL if it doesn't recognize our redirect URL
    console.log('🌐 Opening OAuth session...')
    console.log('🌐 OAuth URL:', data.url)
    console.log('🌐 Redirect URL:', redirectTo)
    
    // For Expo web, WebBrowser opens in a popup
    // When OAuth completes, it redirects to the callback route which creates the session
    // The callback route will notify us via postMessage when the session is created
    if (isExpoWeb) {
      console.log('🌐 Expo web detected, opening OAuth popup...')
      
      // Listen for postMessage from the popup callback route
      // Only use postMessage if we're in a real browser (has addEventListener and postMessage)
      const canUsePostMessage = typeof window !== 'undefined' && 
                                typeof window.addEventListener === 'function' &&
                                typeof window.postMessage === 'function'
      
      const messagePromise = canUsePostMessage
        ? new Promise((resolve, reject) => {
            const messageHandler = (event: MessageEvent) => {
              // Verify origin for security
              if (event.origin !== window.location.origin) {
                console.warn('⚠️ Ignoring message from different origin:', event.origin)
                return
              }
              
              if (event.data && event.data.type === 'OAUTH_SUCCESS') {
                console.log('✅ Received OAuth success message from popup')
                window.removeEventListener('message', messageHandler)
                
                // Set the session in the main window's Supabase client
                if (event.data.session) {
                  supabase.auth.setSession({
                    access_token: event.data.session.access_token,
                    refresh_token: event.data.session.refresh_token,
                  }).then(({ data: sessionData, error: sessionError }) => {
                    if (sessionError) {
                      console.error('❌ Error setting session from popup:', sessionError)
                      reject(sessionError)
                    } else if (sessionData?.session) {
                      console.log('✅ Session set in main window')
                      resolve({ session: sessionData.session, user: sessionData.session.user })
                    } else {
                      reject(new Error('No session data from popup'))
                    }
                  }).catch(reject)
                } else {
                  reject(new Error('No session in message'))
                }
              }
            }
            
            window.addEventListener('message', messageHandler)
            
            // Timeout after 60 seconds
            setTimeout(() => {
              window.removeEventListener('message', messageHandler)
              reject(new Error('OAuth session timeout - no message from callback route'))
            }, 60000)
          })
        : new Promise((_, reject) => {
            // If postMessage is not available, never resolve/reject so it doesn't interfere with Promise.race
            // We'll rely on polling and browser promise instead
            console.log('ℹ️ postMessage not available, using polling fallback')
          })
      
      // Start polling for session as fallback (in case postMessage doesn't work)
      let sessionCheckInterval: NodeJS.Timeout | null = null
      const sessionPromise = new Promise((resolve, reject) => {
        sessionCheckInterval = setInterval(async () => {
          const { data: { session }, error } = await supabase.auth.getSession()
          if (session) {
            if (sessionCheckInterval) clearInterval(sessionCheckInterval)
            console.log('✅ Session found via polling (fallback)')
            resolve({ session, user: session.user })
          } else if (error) {
            if (sessionCheckInterval) clearInterval(sessionCheckInterval)
            reject(error)
          }
        }, 500) // Check every 500ms
        
        // Timeout after 60 seconds
        setTimeout(() => {
          if (sessionCheckInterval) clearInterval(sessionCheckInterval)
          // Don't reject here, let messagePromise handle timeout
        }, 60000)
      })
      
      // Open OAuth popup
      const browserPromise = WebBrowser.openAuthSessionAsync(
        data.url,
        redirectTo,
        {
          showInRecents: false,
          preferEphemeralSession: false,
        }
      )
      
      // Race between message (if available), session polling, and browser result
      const racePromises = [sessionPromise, browserPromise]
      if (canUsePostMessage) {
        racePromises.unshift(messagePromise) // Add message promise first if available
      }
      
      try {
        const result = await Promise.race(racePromises)
        
        // Clean up interval
        if (sessionCheckInterval) clearInterval(sessionCheckInterval)
        
        // If session was created via message or polling, return it
        if (result && typeof result === 'object' && 'session' in result) {
          return result as any
        }
        
        // If browser returned success with URL, process it
        if (result && typeof result === 'object' && 'type' in result && (result as any).type === 'success' && (result as any).url) {
          const url = new URL((result as any).url)
          const code = url.searchParams.get('code') || url.hash.split('code=')[1]?.split('&')[0]
          
          if (code) {
            console.log('Got code from browser result, exchanging for session...')
            const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
            
            if (sessionError) {
              throw sessionError
            }
            
            return sessionData
          }
        }
        
        // If dismissed, wait longer and check session multiple times
        if (result && typeof result === 'object' && 'type' in result && ((result as any).type === 'dismiss' || (result as any).type === 'cancel')) {
          console.log('⚠️ OAuth popup dismissed, waiting for callback to process...')
          // Wait and check multiple times - callback route might still be processing
          for (let i = 0; i < 10; i++) {
            await new Promise(resolve => setTimeout(resolve, 1000))
            const { data: { session }, error: sessionError } = await supabase.auth.getSession()
            if (session) {
              console.log(`✅ Session found after dismiss (attempt ${i + 1})`)
              return { session, user: session.user }
            }
            if (sessionError) {
              console.error('Session check error:', sessionError)
            }
            console.log(`⏳ Checking for session... (attempt ${i + 1}/10)`)
          }
          throw new Error('OAuth was cancelled or dismissed - no session created after waiting')
        }
        
        // Final check
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          return { session, user: session.user }
        }
        
        throw new Error('OAuth failed - no session created')
      } catch (error: any) {
        // Clean up interval on error
        if (sessionCheckInterval) clearInterval(sessionCheckInterval)
        
        // If it's a timeout, check session one more time
        if (error.message?.includes('timeout')) {
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            return { session, user: session.user }
          }
        }
        throw error
      }
    }
    
    let result
    try {
      result = await Promise.race([
        WebBrowser.openAuthSessionAsync(
          data.url, 
          redirectTo,
          {
            // Also accept the production callback URL as a fallback
            showInRecents: true,
            // For web, preferRedirect helps with web redirects
            preferEphemeralSession: false,
          }
        ),
        // Timeout after 30 seconds for debugging
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('OAuth session timeout')), 30000)
        )
      ])
    } catch (error: any) {
      console.error('❌ OAuth session error:', error)
      // If timeout or error, check if callback route handled it (for Expo web)
      if (isExpoWeb && error.message?.includes('timeout')) {
        console.log('⏱️ OAuth timeout in Expo web, checking for session...')
        await new Promise(resolve => setTimeout(resolve, 2000))
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          console.log('✅ Session found after timeout')
          return { session, user: session.user }
        }
      }
      throw error
    }

    console.log('OAuth result:', result.type, (result as any).url || 'no url')
    console.log('OAuth result details:', JSON.stringify(result, null, 2))

    if (result.type === 'success' && (result as any).url) {
      console.log('✅ OAuth success, processing callback URL...')
      try {
        const url = new URL(result.url)
        
        // Check if Supabase redirected to dashboard (means it didn't recognize our redirect URL)
        // In this case, the session might already be created, so check for it
        if (url.pathname === '/dashboard' || url.pathname === '/dashboard/') {
          console.log('Supabase redirected to dashboard, checking for existing session...')
          // Check if we have a session (Supabase might have created it server-side)
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()
          
          if (sessionError) {
            console.error('Session check error:', sessionError)
            throw sessionError
          }
          
          if (session) {
            console.log('OAuth success, session found')
            return { session, user: session.user }
          } else {
            // Try to get code from hash or query
            const hashParams = new URLSearchParams(url.hash.substring(1))
            const code = hashParams.get('code') || url.searchParams.get('code')
            
            if (code) {
              console.log('Got code from dashboard redirect, exchanging for session...')
              const { data: sessionData, error: exchangeError } =
                await supabase.auth.exchangeCodeForSession(code)

              if (exchangeError) {
                console.error('Session exchange error:', exchangeError)
                throw exchangeError
              }

              console.log('OAuth success, session created')
              return sessionData
            } else {
              throw new Error('No session or code found after OAuth redirect')
            }
          }
        }
        
        // Check if this is the web callback URL (callback-mobile or regular callback)
        if ((url.hostname === 'izimate.com' || url.hostname === 'www.izimate.com' || url.hostname === 'localhost') && 
            (url.pathname === '/auth/callback-mobile' || url.pathname === '/auth/callback')) {
          // Extract the code from the web callback
          const code = url.searchParams.get('code')
          const error = url.searchParams.get('error')
          
          if (error) {
            throw new Error(url.searchParams.get('error_description') || error || 'OAuth authentication failed')
          }
          
          if (code) {
            console.log('Got code from web callback, exchanging for session...')
            const { data: sessionData, error: sessionError } =
              await supabase.auth.exchangeCodeForSession(code)

            if (sessionError) {
              console.error('Session exchange error:', sessionError)
              throw sessionError
            }

            console.log('OAuth success, session created')
            return sessionData
          }
        }
        
        // Also check for localhost:8083 (Expo web)
        if (url.hostname === 'localhost' && url.port === '8083' && url.pathname === '/auth/callback') {
          const code = url.searchParams.get('code')
          const error = url.searchParams.get('error')
          
          if (error) {
            throw new Error(url.searchParams.get('error_description') || error || 'OAuth authentication failed')
          }
          
          if (code) {
            console.log('Got code from Expo web callback, exchanging for session...')
            const { data: sessionData, error: sessionError } =
              await supabase.auth.exchangeCodeForSession(code)

            if (sessionError) {
              console.error('Session exchange error:', sessionError)
              throw sessionError
            }

            console.log('OAuth success, session created')
            return sessionData
          }
        }
        
        // Handle deep link directly (if the browser redirected to it)
        if (url.protocol === 'izimate-job:' || url.protocol === 'exp:') {
          const code = url.searchParams.get('code')
          const error = url.searchParams.get('error')
          const errorDescription = url.searchParams.get('error_description')

          if (error) {
            throw new Error(errorDescription || error || 'OAuth authentication failed')
          }

          if (code) {
            console.log('Got code from deep link, exchanging for session...')
            const { data: sessionData, error: sessionError } =
              await supabase.auth.exchangeCodeForSession(code)

            if (sessionError) {
              console.error('Session exchange error:', sessionError)
              throw sessionError
            }

            console.log('OAuth success, session created')
            return sessionData
          }
        }
        
        throw new Error('No authorization code received from OAuth provider')
      } catch (urlError: any) {
        console.error('URL parsing error:', urlError)
        throw new Error(urlError.message || 'Failed to parse OAuth callback URL')
      }
    } else if (result.type === 'cancel') {
      throw new Error('OAuth flow was cancelled by user')
    } else if (result.type === 'dismiss') {
      // 'dismiss' might occur even when redirect completes
      // The callback route might have already handled the OAuth flow
      // This can happen on both web and native when the browser/auth popup closes
      console.log('⚠️ OAuth dismissed, waiting for callback route to process...')
      console.log('⚠️ The redirect may have still occurred - checking for session...')
      
      // Wait and check multiple times - callback route might still be processing
      // The redirect URL with tokens might be processed by the callback route
      for (let i = 0; i < 15; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Check if a session was created by the callback route
        console.log(`Checking for session after dismiss (attempt ${i + 1}/15)...`)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (session) {
          console.log(`✅ Session found after dismiss (attempt ${i + 1}), OAuth succeeded`)
          return { session, user: session.user }
        }
        
        if (sessionError) {
          console.error('Session check error after dismiss:', sessionError)
        }
      }
      
      console.log('❌ No session found after dismiss - callback route may still be processing')
      // Don't throw immediately - the callback route might still be processing
      // Return null and let the callback route handle navigation
      // The user can manually open the callback URL if needed
      return { session: null, user: null }
    } else {
      console.error('Unexpected OAuth result:', result)
      throw new Error('OAuth flow failed unexpectedly')
    }
  }

  throw new Error('OAuth flow was cancelled or failed - no URL returned')
}
