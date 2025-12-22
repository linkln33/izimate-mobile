# iZimate Job - Mobile App (React Native + Expo)

**This is a standalone Expo mobile-first application** for iZimate Job, built with React Native and Expo. This project is completely independent from the web app and can be developed separately.

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- For Android: Android Studio
- For iOS: Xcode (macOS only)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   Then fill in your configuration:
   
   ```bash
   # Supabase Configuration
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   
   # API Configuration (for image uploads to Cloudflare R2)
   EXPO_PUBLIC_API_URL=https://www.izimate.com
   # Or for local development:
   # EXPO_PUBLIC_API_URL=http://localhost:3000
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```

### Running the App

#### Android
```bash
npm run android
```

#### iOS (macOS only)
```bash
npm run ios
```

#### Web
```bash
npm run web
```

## Project Structure

```
izimate-job-mobile/
├── app/                    # Expo Router app directory
│   ├── (auth)/            # Authentication screens
│   │   ├── login.tsx
│   │   └── signup.tsx
│   ├── (tabs)/            # Tab navigation screens
│   │   ├── dashboard.tsx
│   │   ├── swipe.tsx
│   │   ├── messages.tsx
│   │   └── profile.tsx
│   ├── _layout.tsx        # Root layout
│   └── index.tsx          # Entry point
├── lib/                    # Utilities and helpers
│   ├── supabase.ts       # Supabase client
│   └── utils/
│       └── images.ts      # Image upload (Cloudflare R2 via API)
├── assets/                 # Images, fonts, etc.
├── app.json               # Expo configuration
└── package.json
```

## Features

- ✅ Authentication (Login/Signup)
- ✅ Supabase integration
- ✅ Tab navigation
- ✅ TypeScript support
- ✅ Expo Router (file-based routing)
- ✅ **Cloudflare R2 image storage** (direct S3-compatible uploads)

## Image Storage

**All images are stored on Cloudflare R2** via direct S3-compatible API uploads.

- **Storage**: Cloudflare R2
- **Upload Method**: Direct upload using S3-compatible API (aws4fetch)
- **Configuration**: Set R2 credentials in `.env`:
  - `EXPO_PUBLIC_R2_ACCOUNT_ID`
  - `EXPO_PUBLIC_R2_ACCESS_KEY_ID`
  - `EXPO_PUBLIC_R2_SECRET_ACCESS_KEY`
- **URL Format**: `https://pub-{account-id}.r2.dev/{folder}/{filename}.{ext}`
- **Folders**: `listings`, `avatars`, `messages`

## Development

### Adding New Screens

Create files in the `app/` directory. Expo Router will automatically create routes based on the file structure.

### Environment Variables

All environment variables must be prefixed with `EXPO_PUBLIC_` to be accessible in the app.

**Required:**
- `EXPO_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- `EXPO_PUBLIC_R2_ACCOUNT_ID` - Your Cloudflare R2 account ID
- `EXPO_PUBLIC_R2_ACCESS_KEY_ID` - Your R2 access key ID
- `EXPO_PUBLIC_R2_SECRET_ACCESS_KEY` - Your R2 secret access key

### Building for Production

#### Android APK
```bash
eas build --platform android
```

#### iOS
```bash
eas build --platform ios
```

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Expo Router Documentation](https://docs.expo.dev/router/introduction/)
