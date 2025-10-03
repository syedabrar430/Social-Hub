#!/bin/bash

echo "🚀 Starting Rocket.Chat setup..."

# Stop any running containers
docker-compose down -v

# Start MongoDB first
echo "📦 Starting MongoDB..."
docker-compose up -d mongo

# Wait for MongoDB to be ready
echo "⏳ Waiting for MongoDB to initialize..."
sleep 15

# Initialize replica set
echo "🔧 Initializing MongoDB replica set..."
docker-compose exec mongo mongosh --eval "rs.initiate({_id: 'rs0', members: [{_id: 0, host: 'localhost:27017'}]})"

# Wait a bit more for replica set
sleep 10

# Start Rocket.Chat
echo "🚀 Starting Rocket.Chat..."
docker-compose up -d rocketchat

echo "⏳ Waiting for Rocket.Chat to start (this takes 2-3 minutes)..."
sleep 60

echo "🎉 Rocket.Chat should be available at: http://localhost:3001"
echo ""
echo "📋 Next steps:"
echo "1. Open http://localhost:3001 in your browser"
echo "2. Complete the setup wizard"
echo "3. Create admin account and get User ID + Personal Access Token"
echo "4. Update backend/.env with your credentials"
echo ""
echo "To check logs: docker-compose logs -f rocketchat"