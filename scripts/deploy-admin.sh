#!/bin/bash

# Halolmia Admin Panel Deployment Script
# Usage: ./scripts/deploy-admin.sh [vercel|netlify|build]

set -e

echo "🚀 Halolmia Admin Panel Deployment"
echo "=================================="

DEPLOY_TYPE=${1:-vercel}

case $DEPLOY_TYPE in
  vercel)
    echo "📦 Deploying to Vercel..."
    
    # Check if vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        echo "❌ Vercel CLI not found. Installing..."
        npm install -g vercel
    fi
    
    # Deploy
    echo "🔨 Building and deploying..."
    vercel --prod
    
    echo "✅ Deployment complete!"
    echo "Don't forget to set NEXT_PUBLIC_CONVEX_URL in Vercel dashboard"
    ;;
    
  netlify)
    echo "📦 Deploying to Netlify..."
    
    # Check if netlify CLI is installed
    if ! command -v netlify &> /dev/null; then
        echo "❌ Netlify CLI not found. Installing..."
        npm install -g netlify-cli
    fi
    
    # Build
    echo "🔨 Building admin panel..."
    npm run build -w @halolmia/admin
    
    # Deploy
    echo "📤 Deploying..."
    cd apps/admin
    netlify deploy --prod --dir=.next
    
    echo "✅ Deployment complete!"
    echo "Don't forget to set NEXT_PUBLIC_CONVEX_URL in Netlify dashboard"
    ;;
    
  build)
    echo "🔨 Building admin panel for manual deployment..."
    npm install
    npm run build -w @halolmia/admin
    
    echo "✅ Build complete!"
    echo "📁 Build output: apps/admin/.next/"
    echo "Upload this folder to your hosting provider"
    ;;
    
  *)
    echo "❌ Unknown deployment type: $DEPLOY_TYPE"
    echo "Usage: ./scripts/deploy-admin.sh [vercel|netlify|build]"
    exit 1
    ;;
esac

echo ""
echo "🎉 Done!"
