# Real Bank Verification Setup Guide

This guide will help you set up real bank verification for your MavenPay application, fetching actual user data from Nigerian banks.

## Overview

The bank verification system now uses a secure backend API approach that:
- ✅ Fetches real account holder names
- ✅ Uses actual Paystack and Flutterwave APIs
- ✅ Keeps API keys secure on the backend
- ✅ Handles errors properly
- ✅ Works with all major Nigerian banks

## Prerequisites

1. **Paystack Account** - [Sign up here](https://dashboard.paystack.com/signup)
2. **Flutterwave Account** - [Sign up here](https://dashboard.flutterwave.com/signup) (Optional, for backup)
3. **Node.js** installed on your system
4. **Valid Nigerian bank account numbers** for testing

## Step 1: Get Your API Keys

### Paystack API Keys
1. Go to [Paystack Dashboard](https://dashboard.paystack.com/#/settings/developer)
2. Copy your **Public Key** (starts with `pk_test_` or `pk_live_`)
3. Copy your **Secret Key** (starts with `sk_test_` or `sk_live_`)

### Flutterwave API Keys (Optional)
1. Go to [Flutterwave Dashboard](https://dashboard.flutterwave.com/settings/api)
2. Copy your **Public Key** (starts with `FLWPUBK_TEST-` or `FLWPUBK-`)
3. Copy your **Secret Key** (starts with `FLWSECK_TEST-` or `FLWSECK-`)

## Step 2: Set Up Backend API

### Option A: Quick Local Setup

1. Create a new directory for your backend:
```bash
mkdir mavenpay-backend
cd mavenpay-backend
```

2. Initialize npm and install dependencies:
```bash
npm init -y
npm install express cors axios dotenv
```

3. Copy the `backend-api-example.js` file to your backend directory:
```bash
cp ../workspace/shadcn-ui/backend-api-example.js ./server.js
```

4. Create a `.env` file with your real API keys:
```bash
# .env file
PAYSTACK_SECRET_KEY=sk_test_your_actual_paystack_secret_key
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-your_actual_flutterwave_secret
PORT=3001
NODE_ENV=development
```

5. Start the backend server:
```bash
node server.js
```

Your backend should now be running at `http://localhost:3001`

### Option B: Deploy to Cloud (Recommended for Production)

Deploy your backend to any of these services:

- **Railway** (Easiest): 
  1. Push your backend code to GitHub
  2. Connect to Railway and deploy
  3. Add environment variables in Railway dashboard

- **Vercel**: Use serverless functions
- **Heroku**: Classic deployment
- **DigitalOcean App Platform**: Container deployment

## Step 3: Configure Frontend Environment

1. Create a `.env` file in your React app root:
```bash
# .env
VITE_BACKEND_URL=http://localhost:3001
VITE_API_URL=http://localhost:3001/api
VITE_USE_BACKEND_PROXY=true
NODE_ENV=development

# Optional: Keep these for fallback (use test keys only)
VITE_PAYSTACK_PUBLIC_KEY=pk_test_your_paystack_public_key
VITE_FLW_PUBLIC_KEY=FLWPUBK_TEST-your_flutterwave_public_key
```

**Important**: Never put secret keys in your React `.env` file!

2. If you deployed your backend to a cloud service, update the `VITE_BACKEND_URL`:
```bash
VITE_BACKEND_URL=https://your-backend-url.railway.app
```

## Step 4: Test the Integration

### Test with Real Account Numbers

Try these real Nigerian bank accounts for testing:

**GTBank (058):**
- Account: `0123456789` (test account - replace with real ones)

**Access Bank (044):**
- Account: `0987654321` (test account - replace with real ones)

**Important**: Use actual valid account numbers from friends or your own accounts for real testing.

### Testing Process

1. Start your backend server:
```bash
cd mavenpay-backend
node server.js
```

2. Start your React app:
```bash
cd ../workspace/shadcn-ui
npm run dev
```

3. Go to the Payments page
4. Enter a real Nigerian account number and select the correct bank
5. The system should automatically verify and show the real account holder name

## Step 5: Verify Everything Works

### Backend Health Check
Visit: `http://localhost:3001/api/health`

Should return:
```json
{
  "status": "ok",
  "message": "Bank verification API is running",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Manual API Test
Test the verification endpoint directly:

```bash
curl -X POST http://localhost:3001/api/verify-account \
  -H "Content-Type: application/json" \
  -d '{
    "account_number": "0123456789",
    "bank_code": "058",
    "provider": "paystack"
  }'
```

Should return real account holder data:
```json
{
  "success": true,
  "data": {
    "accountName": "JOHN DOE",
    "accountNumber": "0123456789",
    "verified": true,
    "provider": "paystack"
  }
}
```

## Troubleshooting

### Common Issues

1. **"Network error" or "Unable to connect"**
   - Make sure your backend server is running
   - Check the `REACT_APP_BACKEND_URL` is correct

2. **"Invalid API key" errors**
   - Verify your Paystack/Flutterwave secret keys are correct
   - Make sure you're using secret keys (starting with `sk_` or `FLWSECK_`)
   - Check that keys are properly set in backend `.env` file

3. **"Account not found" errors**
   - Try with different valid account numbers
   - Some banks may not be supported by the API provider
   - Try switching to Flutterwave as backup provider

4. **CORS errors**
   - Make sure your backend has proper CORS configuration
   - Verify your frontend URL is in the CORS allowed origins

### Debug Mode

Enable detailed logging by adding this to your backend `.env`:
```bash
DEBUG=true
```

### API Rate Limits

- Paystack: ~100 requests per minute
- Flutterwave: ~60 requests per minute

## Security Considerations

1. **Never expose secret keys in frontend code**
2. **Use environment variables for all sensitive data**
3. **Enable HTTPS in production**
4. **Implement rate limiting on your backend**
5. **Add authentication to your API endpoints in production**

## Production Deployment

Before going live:

1. **Switch to live API keys** (remove `_test_` from keys)
2. **Deploy backend to a reliable cloud service**
3. **Update frontend environment variables**
4. **Set up monitoring and error tracking**
5. **Implement proper logging**

## Support

If you encounter issues:

1. Check the browser console for errors
2. Check your backend server logs
3. Verify your API keys are valid
4. Test with multiple account numbers
5. Try both Paystack and Flutterwave providers

## Next Steps

Once bank verification is working:

1. Add more Nigerian banks to the list
2. Implement international bank verification
3. Add caching to reduce API calls
4. Set up monitoring and analytics
5. Add user feedback for verification status

---

**Note**: This setup fetches real data from actual bank APIs. Always use valid account numbers for testing and respect API rate limits.
