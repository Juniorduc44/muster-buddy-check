#!/bin/bash

echo "🚀 Starting GitHub Pages deployment..."

# Check if we're on main branch
current_branch=$(git branch --show-current)
if [ "$current_branch" != "main" ]; then
    echo "❌ Error: You are currently on branch '$current_branch'"
    echo "📋 Please switch to main branch first: git checkout main"
    exit 1
fi

echo "✅ Currently on main branch"

# Pull latest changes
echo "📥 Pulling latest changes from remote..."
git pull

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🏗️  Building project..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    
    # Remove existing docs folder if it exists
    if [ -d "docs" ]; then
        echo "🗑️  Removing existing docs folder..."
        rm -rf docs
    fi
    
    # Move dist to docs
    echo "📁 Moving dist to docs..."
    mv dist docs
    
    # Add docs to git
    echo "📝 Adding docs to git..."
    git add docs
    
    # Commit the changes
    echo "💾 Committing changes..."
    git commit -m "Update production build for GitHub Pages"
    
    # Push to main
    echo "🚀 Pushing to main branch..."
    git push origin main
    
    echo "✅ Deployment script completed!"
    echo "🌐 Your site should be available at: https://juniorduc44.github.io/TheTravelingTechtician/"
    echo "📋 Don't forget to enable GitHub Pages in your repository settings and set the source to '/docs' folder"
else
    echo "❌ Build failed! Please check for errors."
    exit 1
fi