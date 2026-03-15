#!/bin/bash

# MavenPay Bank Verification Backend Setup Script
# This script sets up a local backend server for real bank verification

echo "🚀 Setting up MavenPay Bank Verification Backend..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

# Create backend directory
BACKEND_DIR="../mavenpay-backend"
echo "📁 Creating backend directory: $BACKEND_DIR"
mkdir -p "$BACKEND_DIR"
cd "$BACKEND_DIR"

# Initialize package.json
echo "📦 Initializing npm..."
npm init -y > /dev/null 2>&1

# Install dependencies
echo "⬇️  Installing dependencies..."
npm install express cors axios dotenv > /dev/null 2>&1

# Copy backend server file
echo "📄 Setting up server file..."
cp "../workspace/shadcn-ui/backend-api-example.js" "./server.js"

# Create package.json scripts
echo "⚙️  Configuring package.json..."
cat > package.json << EOF
{
  "name": "mavenpay-backend",
  "version": "1.0.0",
  "description": "Backend API for MavenPay bank verification",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "node server.js",
    "test": "echo \\"Error: no test specified\\" && exit 1"
  },
  "dependencies": {
    "axios": "^1.6.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2"
  },
  "keywords": ["bank", "verification", "paystack", "flutterwave", "nigeria"],
  "author": "MavenPay",
  "license": "MIT"
}
EOF

# Create .env template
echo "🔑 Creating environment file template..."
cat > .env.example << EOF
# Bank Verification API Keys
# Replace with your actual API keys from Paystack and Flutterwave

# Paystack API Keys (Primary provider)
# Get from: https://dashboard.paystack.com/#/settings/developer
PAYSTACK_SECRET_KEY=sk_test_your_actual_paystack_secret_key

# Flutterwave API Keys (Backup provider)
# Get from: https://dashboard.flutterwave.com/settings/api
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-your_actual_flutterwave_secret

# Server Configuration
PORT=3001
NODE_ENV=development

# Optional: Enable debug mode
DEBUG=false
EOF

# Create actual .env file (user needs to fill this)
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "📝 Created .env file - YOU NEED TO ADD YOUR API KEYS!"
fi

# Create README for backend
echo "📚 Creating backend documentation..."
cat > README.md << EOF
# MavenPay Bank Verification Backend

This is the backend API server for MavenPay's real bank verification system.

## Quick Start

1. Add your API keys to the \`.env\` file:
   \`\`\`bash
   PAYSTACK_SECRET_KEY=sk_test_your_actual_paystack_secret_key
   FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-your_actual_flutterwave_secret
   \`\`\`

2. Start the server:
   \`\`\`bash
   npm start
   \`\`\`

3. Test the health endpoint:
   \`\`\`bash
   curl http://localhost:3001/api/health
   \`\`\`

## API Endpoints

- \`GET /api/health\` - Health check
- \`POST /api/verify-account\` - Verify bank account
- \`GET /api/banks\` - Get supported banks

## Environment Variables

- \`PAYSTACK_SECRET_KEY\` - Your Paystack secret key
- \`FLUTTERWAVE_SECRET_KEY\` - Your Flutterwave secret key  
- \`PORT\` - Server port (default: 3001)
- \`NODE_ENV\` - Environment (development/production)

## Deployment

Deploy to Railway, Vercel, Heroku, or any Node.js hosting service.
Make sure to set environment variables in your hosting platform.
EOF

echo ""
echo "✅ Backend setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Get your API keys:"
echo "   - Paystack: https://dashboard.paystack.com/#/settings/developer"
echo "   - Flutterwave: https://dashboard.flutterwave.com/settings/api"
echo ""
echo "2. Edit the .env file and add your real API keys:"
echo "   nano .env"
echo ""
echo "3. Start the backend server:"
echo "   npm start"
echo ""
echo "4. Test the health endpoint:"
echo "   curl http://localhost:3001/api/health"
echo ""
echo "5. Update your React app's .env file:"
echo "   REACT_APP_BACKEND_URL=http://localhost:3001"
echo ""
echo "📁 Backend directory: $(pwd)"
echo "📖 Full setup guide: ../workspace/shadcn-ui/BANK_VERIFICATION_SETUP.md"
echo ""
echo "🎉 Happy coding!"