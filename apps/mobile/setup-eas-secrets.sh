#!/bin/bash

# Setup EAS Secrets for Wishly Production
# Run this script after getting your Clerk production keys

echo "🔐 Setting up EAS secrets for Wishly..."
echo ""
echo "You'll need:"
echo "  - Clerk Publishable Key (pk_live_...)"
echo "  - Clerk Secret Key (sk_live_...)"
echo "  - Sentry DSN (optional, for error tracking)"
echo "  - Sentry Auth Token (optional)"
echo ""

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI not found. Install it with: npm install -g eas-cli"
    exit 1
fi

# Check if logged in
if ! eas whoami &> /dev/null; then
    echo "❌ Not logged in to EAS. Run: eas login"
    exit 1
fi

echo "📝 Enter your Clerk production keys:"
echo ""

# Get Clerk Publishable Key
read -p "Clerk Publishable Key (pk_live_...): " CLERK_PUBLISHABLE_KEY
if [ -z "$CLERK_PUBLISHABLE_KEY" ]; then
    echo "❌ Clerk Publishable Key is required"
    exit 1
fi

# Get Clerk Secret Key (for backend, but we'll store it here too for reference)
read -p "Clerk Secret Key (sk_live_...) [optional, for Railway setup]: " CLERK_SECRET_KEY

# Set EAS secrets (using new eas env:create command)
echo ""
echo "🔑 Setting EAS secrets..."

eas env:create --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --value "$CLERK_PUBLISHABLE_KEY" --scope project --environment production --visibility sensitive --force

if [ ! -z "$CLERK_SECRET_KEY" ]; then
    echo "💡 Clerk Secret Key noted (will be used for Railway deployment)"
fi

# Optional: Sentry setup
echo ""
read -p "Do you want to set up Sentry? (y/n): " SETUP_SENTRY
if [ "$SETUP_SENTRY" = "y" ]; then
    read -p "Sentry DSN: " SENTRY_DSN
    read -p "Sentry Auth Token: " SENTRY_AUTH_TOKEN
    read -p "Sentry Org: " SENTRY_ORG
    read -p "Sentry Project: " SENTRY_PROJECT
    
    if [ ! -z "$SENTRY_DSN" ]; then
        eas env:create --name SENTRY_DSN --value "$SENTRY_DSN" --scope project --environment production --visibility sensitive --force
    fi
    if [ ! -z "$SENTRY_AUTH_TOKEN" ]; then
        eas env:create --name SENTRY_AUTH_TOKEN --value "$SENTRY_AUTH_TOKEN" --scope project --environment production --visibility secret --force
    fi
    if [ ! -z "$SENTRY_ORG" ]; then
        eas env:create --name SENTRY_ORG --value "$SENTRY_ORG" --scope project --environment production --visibility sensitive --force
    fi
    if [ ! -z "$SENTRY_PROJECT" ]; then
        eas env:create --name SENTRY_PROJECT --value "$SENTRY_PROJECT" --scope project --environment production --visibility sensitive --force
    fi
fi

echo ""
echo "✅ EAS secrets configured!"
echo ""
echo "📋 Next steps:"
echo "  1. Deploy backend to Railway (see railway-setup.md)"
echo "  2. Update Railway with Clerk Secret Key: $CLERK_SECRET_KEY"
echo "  3. Run: eas build --platform ios --profile production"
