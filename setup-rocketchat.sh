#!/bin/bash

echo "🚀 Setting up local Rocket.Chat server..."

# Create necessary directories
mkdir -p data/db
mkdir -p data/dump
mkdir -p uploads

echo "📦 Starting Rocket.Chat services with Docker Compose..."
docker-compose up -d

echo "⏳ Waiting for Rocket.Chat to start (this may take 2-3 minutes)..."
echo "   MongoDB is initializing and Rocket.Chat is starting up..."

# Wait and check if services are running
sleep 60

echo "🔍 Checking service status..."
docker-compose ps

echo ""
echo "🎉 Rocket.Chat should be available at: http://localhost:3000"
echo ""
echo "📋 Setup Instructions:"
echo "1. Open http://localhost:3000 in your browser"
echo "2. Complete the initial setup wizard:"
echo "   - Set admin username and password"
echo "   - Configure organization info"
echo "   - Skip additional setup steps"
echo "3. Go to Administration → My Account → Personal Access Tokens"
echo "4. Create a new token with admin permissions"
echo "5. Note your User ID (visible in My Account)"
echo "6. Update your backend/.env file with:"
echo "   ROCKET_CHAT_URL=http://localhost:3000"
echo "   ROCKET_CHAT_USER_ID=your_user_id_here"
echo "   ROCKET_CHAT_AUTH_TOKEN=your_token_here"
echo ""
echo "🛠️  Useful commands:"
echo "   Stop: docker-compose down"
echo "   View logs: docker-compose logs -f rocketchat"
echo "   Restart: docker-compose restart"
echo ""
echo "🔥 If Rocket.Chat takes too long to start, run: docker-compose restart rocketchat"