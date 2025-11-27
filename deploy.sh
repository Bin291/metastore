#!/bin/bash

echo "🚀 MetaStore Deployment Script"
echo "================================"

# Check if git is clean
if [[ -n $(git status -s) ]]; then
    echo "⚠️  Warning: You have uncommitted changes"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Build backend
echo "📦 Building backend..."
cd backend
npm install
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Backend build failed"
    exit 1
fi
cd ..

# Build frontend
echo "📦 Building frontend..."
cd frontend
npm install
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed"
    exit 1
fi
cd ..

# Commit and push
echo "📝 Committing changes..."
git add .
git commit -m "chore: prepare for deployment $(date +%Y-%m-%d)"
git push origin $(git branch --show-current)

echo "✅ Build successful and pushed to GitHub!"
echo ""
echo "Next steps:"
echo "1. Deploy backend to Railway: railway up (in backend folder)"
echo "2. Deploy frontend to Vercel: vercel --prod (in frontend folder)"
echo "3. Update environment variables on both platforms"
echo "4. Test your deployment!"
