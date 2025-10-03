# Social Hub - Rocket.Chat Integration

## Overview
Simple Rocket.Chat integration for Social Hub messaging functionality.

## Files Structure
```
backend/
├── rocket_chat_local.py    # Clean Rocket.Chat client
├── main.py                 # FastAPI endpoints
└── .env                    # Configuration
```

## Configuration
Add to your `.env` file:
```
ROCKET_CHAT_URL=https://open.rocket.chat
ROCKET_CHAT_USER_ID=your_user_id
ROCKET_CHAT_AUTH_TOKEN=your_auth_token
```

## API Endpoints

### Test Connection
```
GET /chat/test-connection
```
Returns: `{"status": "connected", "message": "Rocket.Chat is accessible"}`

### Setup Channel
```
POST /chat/setup
Authorization: Bearer <jwt_token>
```
Returns: Channel information

### Send Message
```
POST /chat/send-to-channel
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "text": "Hello World!",
  "channel_name": "social-hub-general"  // optional, defaults to social-hub-general
}
```

### Get Messages
```
GET /chat/channel-messages?channel_name=social-hub-general
Authorization: Bearer <jwt_token>
```

## Usage

1. **Create Channel**: Manually create `social-hub-general` channel in Rocket.Chat web interface
2. **Start Backend**: `python main.py`
3. **Test Connection**: `curl http://localhost:8000/chat/test-connection`
4. **Send Messages**: Use the `/chat/send-to-channel` endpoint from your frontend

## Features
- ✅ Connection testing
- ✅ Channel message sending
- ✅ Message retrieval
- ✅ Simple, clean code
- ✅ Error handling