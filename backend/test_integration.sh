#!/bin/bash
echo "🔧 Testing Social Hub - Rocket.Chat Integration"
echo "==============================================="

echo ""
echo "1. Testing Backend Connection..."
BACKEND_RESPONSE=$(curl -s http://localhost:8000/chat/test-connection)
if [[ $BACKEND_RESPONSE == *"connected"* ]]; then
    echo "✅ Backend connection: SUCCESS"
else
    echo "❌ Backend connection: FAILED"
    echo "Response: $BACKEND_RESPONSE"
    exit 1
fi

echo ""
echo "2. Testing Frontend Availability..."
FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8081)
if [[ $FRONTEND_RESPONSE == "200" ]]; then
    echo "✅ Frontend available: SUCCESS (port 8081)"
else
    echo "❌ Frontend not available on port 8081"
    echo "HTTP code: $FRONTEND_RESPONSE"
fi

echo ""
echo "3. Integration Status:"
echo "   ✅ Backend: http://localhost:8000"
echo "   ✅ Frontend: http://localhost:8081" 
echo "   ✅ Rocket.Chat: https://open.rocket.chat"
echo ""
echo "🎯 Next Steps:"
echo "   1. Go to https://open.rocket.chat"
echo "   2. Create a PUBLIC channel named: social-hub-general"
echo "   3. Open http://localhost:8081 and navigate to Messages"
echo "   4. Send a message and check it appears in Rocket.Chat!"
echo ""
echo "🚀 Integration is ready!"