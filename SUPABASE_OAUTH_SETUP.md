# Supabase OAuth Setup for Mobile App

## Important: Configure Redirect URLs in Supabase

For OAuth to work correctly with the mobile app, you need to add the mobile deep link URL to your Supabase project's allowed redirect URLs.

### Steps:

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project

2. **Go to Authentication → URL Configuration**
   - Click on "Authentication" in the sidebar
   - Click on "URL Configuration"

3. **Add Mobile Redirect URLs**
   - Under "Redirect URLs", add BOTH:
     ```
     izimate-job://auth/callback
     ```
     ```
     exp://192.168.*.*:*/--/auth/callback
     ```
   - Or add the specific Expo Go URL you see in the console logs (e.g., `exp://192.168.50.101:8082/--/auth/callback`)
   - The `exp://` URL is for development with Expo Go
   - The `izimate-job://` URL is for production builds

4. **Save Changes**

### For Each OAuth Provider:

#### Google OAuth:
1. Go to **Authentication → Providers → Google**
2. Make sure "Authorized redirect URIs" includes:
   - `izimate-job://auth/callback`
   - Your web callback: `https://yourdomain.com/auth/callback`

#### Facebook OAuth:
1. Go to **Authentication → Providers → Facebook**
2. In Facebook Developer Console, add to "Valid OAuth Redirect URIs":
   - `izimate-job://auth/callback`
   - Your web callback: `https://yourdomain.com/auth/callback`

## Testing

After configuring:
1. Restart the Expo server
2. Try logging in with Google/Facebook
3. The OAuth flow should redirect back to the app instead of the website

## Troubleshooting

**Still redirecting to website?**
- Check that the redirect URL is exactly: `izimate-job://auth/callback`
- Verify it's added in Supabase dashboard
- Restart Expo server after changes

**"Invalid redirect URL" error?**
- Make sure the URL is added in Supabase dashboard
- Check for typos in the URL
- Ensure no trailing slashes
