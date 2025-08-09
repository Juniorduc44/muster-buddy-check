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

# Check if gh-pages branch exists and delete it
if git show-ref --verify --quiet refs/heads/gh-pages; then
    echo "🗑️  Deleting existing local gh-pages branch..."
    git branch -D gh-pages
    echo "✅ Local gh-pages branch deleted"
else
    echo "📋 No local gh-pages branch found, continuing..."
fi

# Check if remote gh-pages branch exists and delete it
if git ls-remote --heads origin gh-pages | grep -q gh-pages; then
    echo "🗑️  Deleting remote gh-pages branch..."
    git push origin --delete gh-pages
    
    # Wait a moment for GitHub to process the deletion
    echo "⏳ Waiting for GitHub to process branch deletion..."
    sleep 3
    
    # Verify remote branch deletion
    echo "🔍 Verifying remote branch deletion..."
    if git ls-remote --heads origin gh-pages | grep -q gh-pages; then
        echo "⚠️  Remote gh-pages branch still exists, trying again..."
        git push origin --delete gh-pages
        sleep 2
    else
        echo "✅ Remote gh-pages branch successfully deleted"
    fi
else
    echo "📋 No remote gh-pages branch found, continuing..."
fi

# Force fetch to update local refs about remote branches
echo "🔄 Updating local repository refs..."
git fetch --prune origin

# Verify no gh-pages branch exists anywhere
echo "🔍 Final verification - checking for any remaining gh-pages branches..."
local_exists=$(git show-ref --verify --quiet refs/heads/gh-pages && echo "true" || echo "false")
remote_exists=$(git ls-remote --heads origin gh-pages | grep -q gh-pages && echo "true" || echo "false")

if [ "$local_exists" = "true" ] || [ "$remote_exists" = "true" ]; then
    echo "⚠️  Warning: gh-pages branch still detected!"
    echo "📋 Local exists: $local_exists"
    echo "📋 Remote exists: $remote_exists"
    echo "🤔 Continuing anyway - new deployment will overwrite..."
else
    echo "✅ Confirmed: No gh-pages branches exist"
fi

# Install gh-pages package
echo "📦 Installing gh-pages package..."
npm install gh-pages --save-dev

# Check if gh-pages installation was successful
if [ $? -eq 0 ]; then
    echo "✅ gh-pages package installed successfully!"
    
    # Deploy using gh-pages
    echo "🚀 Deploying to GitHub Pages..."
    npm run deploy
    
    # Check if deployment was successful
    if [ $? -eq 0 ]; then
        echo "✅ Deployment completed successfully!"
        
        # Wait for GitHub Pages to process the new deployment
        echo "⏳ Waiting for GitHub Pages to process deployment..."
        sleep 5
        
        # Verify the new gh-pages branch was created
        echo "🔍 Verifying new gh-pages branch creation..."
        git fetch origin
        if git ls-remote --heads origin gh-pages | grep -q gh-pages; then
            echo "✅ New gh-pages branch successfully created and pushed"
        else
            echo "⚠️  Warning: New gh-pages branch not detected yet"
        fi
        
        echo "🌐 Your site should be available at: https://juniorduc44.github.io/muster-buddy-check/"
        echo "📋 Make sure GitHub Pages is configured to deploy from the 'gh-pages' branch"
        echo "⏰ Note: It may take a few minutes for changes to appear due to GitHub Pages caching"
        echo "🔄 If the old site still appears, try hard refreshing (Ctrl+F5) or wait 5-10 minutes"
    else
        echo "❌ Deployment failed! Please check for errors."
        exit 1
    fi
else
    echo "❌ Failed to install gh-pages package! Please check for errors."
    exit 1
fi