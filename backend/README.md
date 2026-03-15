# SznPay Bank Verification Backend

This is the backend API server for SznPay's real bank verification system.

## Quick Start

1. Add your API keys to the `.env` file:
   ```bash
   PAYSTACK_SECRET_KEY=sk_test_your_actual_paystack_secret_key
   FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-your_actual_flutterwave_secret
   ```

2. Start the server:
   ```bash
   npm start
   ```

3. Test the health endpoint:
   ```bash
   curl http://localhost:3001/api/health
   ```

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/verify-account` - Verify bank account
- `GET /api/banks` - Get supported banks

## Environment Variables

- `PAYSTACK_SECRET_KEY` - Your Paystack secret key
- `FLUTTERWAVE_SECRET_KEY` - Your Flutterwave secret key  
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)

## Deployment

Deploy to Railway, Vercel, Heroku, or any Node.js hosting service.
Make sure to set environment variables in your hosting platform.
