# Rocket.Chat Integration Setup Guide

## Quick Setup

1. **Install Backend Dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Set Environment Variables**
   Create a `.env` file in the `backend` directory with:
   
   **For testing (using Rocket.Chat demo server):**
   ```env
   ROCKET_CHAT_URL=https://open.rocket.chat
   ROCKET_CHAT_ADMIN_USERNAME=ankush.chhabra
   ROCKET_CHAT_ADMIN_PASSWORD=XU28DqEir9WL9YOBV3m84KVpyRcNjVO99hVU3bWXWV4
   ROCKET_CHAT_USER_ID=5q2isnPgZL85pxbaJ
   ```
   
   **For your own instance:**
   ```env
   ROCKET_CHAT_URL=https://your-rocket-chat-instance.com
   ROCKET_CHAT_ADMIN_USERNAME=admin_username
   ROCKET_CHAT_ADMIN_PASSWORD=admin_password
   ```

3. **Update Database Schema**
   The new Rocket.Chat fields will be automatically added to the User table when you restart the FastAPI server.

4. **Start the Backend**
   ```bash
   cd backend
   python main.py
   ```

## Testing the Integration

**Quick Start with Demo Server:**
1. **Create account at https://open.rocket.chat** - Sign up for a free demo account
2. **Get admin access** - Contact support or create a test workspace  
3. **Update your .env** with demo credentials
4. **Bootstrap Chat** - Visit the Messages page in your frontend, it will automatically bootstrap your chat account
5. **Create Conversations** - Use the frontend to start conversations with other users
6. **Send Messages** - Test real-time messaging functionality

## Environment Variables Explained

- `ROCKET_CHAT_URL`: Your Rocket.Chat server URL (e.g., https://open.rocket.chat for demo)
- `ROCKET_CHAT_ADMIN_USERNAME`: Admin user with permissions to create users and manage channels
- `ROCKET_CHAT_ADMIN_PASSWORD`: Password for the admin user

## Features Implemented

✅ **Backend Integration**
- Complete Rocket.Chat REST API client
- User provisioning and management
- Message proxying and conversation handling
- Secure token management (tokens never exposed to frontend)

✅ **Frontend Service**
- TypeScript interfaces for type safety
- Comprehensive chat API service
- Error handling and loading states

✅ **Messages Page**
- Real conversation loading from Rocket.Chat
- Live message sending and receiving
- User search functionality
- Responsive design with conversation list and chat area

## Next Steps

1. **Real-time Updates**: Consider implementing WebSocket connections for live message updates
2. **File Sharing**: Add support for file uploads in messages
3. **Push Notifications**: Integrate with browser notifications for new messages
4. **Admin Features**: Add conversation management and user administration

## Troubleshooting

- **Chat not loading**: Check your Rocket.Chat server URL and admin credentials
- **Bootstrap failing**: Ensure your Rocket.Chat instance allows user creation via API
- **Messages not sending**: Verify the user has proper permissions in Rocket.Chat

For more details, see `ROCKET_CHAT_ENV.md` for environment configuration specifics.