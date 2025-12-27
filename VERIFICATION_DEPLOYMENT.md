# Verification System - Independent Mobile App Implementation

This document explains how the verification system works independently in the mobile app without relying on the webapp.

## Architecture

The verification system uses platform detection to handle CORS issues:

- **Native Apps (iOS/Android)**: Direct API calls to Didit (no CORS issues)
- **Web**: Uses Cloudflare Worker proxy to avoid CORS

## Setup Instructions

### 1. Deploy Cloudflare Worker (for Web Support)

The Cloudflare Worker handles Didit API calls server-side to avoid CORS issues on web.

#### Deploy the Worker

```bash
# Install Wrangler CLI if not already installed
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Set secrets (API keys)
wrangler secret put DIDIT_API_KEY
# Enter: AsiGVVkU_5tKEwQdR2OkTVjh6Gp3eTicnF6dSW-qQmQ

wrangler secret put DIDIT_WORKFLOW_ID
# Enter: 694ea16c-7c1c-41dc-acdc-a191ac4cf67c

# Deploy the worker
wrangler deploy --config wrangler-verification.toml
```

After deployment, you'll get a URL like: `https://izimate-verification.your-subdomain.workers.dev`

#### Update Environment Variables

Add to your `.env` file:

```bash
EXPO_PUBLIC_VERIFICATION_WORKER_URL=https://izimate-verification.your-subdomain.workers.dev
```

### 2. How It Works

#### Native Apps (iOS/Android)
- Directly calls Didit API using `createDiditIdentityVerification()` utility
- No CORS issues on native platforms
- Works immediately without any worker deployment

#### Web
- Detects `Platform.OS === 'web'`
- Calls Cloudflare Worker instead of Didit directly
- Worker handles the Didit API call server-side
- Returns `session_id` and `verification_url`

### 3. Testing

#### Test on Native (iOS/Android)
1. Run the app on a device or simulator
2. Navigate to Dashboard → Verification
3. Click "Start Verification"
4. Should work immediately (no worker needed)

#### Test on Web
1. Deploy the Cloudflare Worker first
2. Set `EXPO_PUBLIC_VERIFICATION_WORKER_URL` in `.env`
3. Restart the Expo dev server
4. Navigate to Dashboard → Verification
5. Click "Start Verification"
6. Should use the worker proxy

## Files Created

1. **`worker-verification.ts`**: Cloudflare Worker that proxies Didit API calls
2. **`wrangler-verification.toml`**: Wrangler configuration for the worker
3. **Updated `VerificationTab.tsx`**: Platform-aware verification handler

## Environment Variables

### Required for Web
- `EXPO_PUBLIC_VERIFICATION_WORKER_URL`: URL of deployed Cloudflare Worker

### Required for All Platforms
- `EXPO_PUBLIC_DIDIT_API_KEY`: Didit API key (used as fallback)
- `EXPO_PUBLIC_DIDIT_WORKFLOW_ID`: Didit workflow ID (used as fallback)
- `EXPO_PUBLIC_SITE_URL`: Your site URL for callbacks

## Troubleshooting

### CORS Error on Web
- Ensure the Cloudflare Worker is deployed
- Check that `EXPO_PUBLIC_VERIFICATION_WORKER_URL` is set correctly
- Verify the worker URL is accessible

### Verification Not Starting on Native
- Check that Didit API keys are configured in `didit-config.ts`
- Verify network connectivity
- Check console logs for specific error messages

### Worker Deployment Issues
- Ensure Wrangler CLI is installed and logged in
- Verify secrets are set correctly: `wrangler secret list`
- Check worker logs: `wrangler tail --config wrangler-verification.toml`

