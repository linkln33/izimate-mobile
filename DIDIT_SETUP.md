# Didit Verification Setup

## 🔑 Environment Variables

Add these to your `.env` file in the project root:

```env
# Didit Verification API
EXPO_PUBLIC_DIDIT_API_KEY=AsiGVVkU_5tKEwQdR2OkTVjh6Gp3eTicnF6dSW-qQmQ
EXPO_PUBLIC_DIDIT_WORKFLOW_ID=694ea16c-7c1c-41dc-acdc-a191ac4cf67c
EXPO_PUBLIC_SITE_URL=https://izimate.com
```

## 📋 Setup Steps

### 1. Create .env file
```bash
touch .env
```

### 2. Add the environment variables above to your .env file

### 3. Restart your Expo development server
```bash
# Kill current server
pkill -f "expo start"

# Restart with new environment variables
npx expo start --web --port 8083
```

## 🚀 Features Enabled

With Didit integration, your app will have:

### Identity Verification (Free Tier)
- ✅ **AI document verification** (220+ countries)
- ✅ **Liveness detection** (prevents spoofing)
- ✅ **Face matching** (document photo vs live photo)
- ✅ **AML screening** (anti-money laundering)
- ✅ **IP analysis** (location verification)

### Business Verification (Premium)
- ✅ **Companies House integration** (UK business registry)
- ✅ **Business AML screening**
- ✅ **Address verification**
- ✅ **Beneficial ownership checks**

## 🔄 Verification Flow

1. **User clicks "Start Verification"**
2. **App creates Didit session** via API
3. **User redirected to Didit flow** (mobile-optimized)
4. **AI processes documents** in real-time
5. **Webhook updates your database** automatically
6. **User returns to app** with verified status

## 🎯 Integration Points

- **Profile verification status** updates automatically
- **Trust scores** calculated based on verification level
- **Enhanced user credibility** in marketplace
- **Compliance ready** for regulated industries

## 🧪 Testing

Navigate to `/rating-demo` in your app to test the verification components before full integration.

## 📚 Didit Documentation

- **Main site**: https://didit.me/ru/
- **API docs**: https://docs.didit.me
- **Dashboard**: https://console.didit.me