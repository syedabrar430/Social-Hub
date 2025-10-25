# 🚀 Fix Rocket.Chat Reaction Functionality

## The Issue
The reaction functionality is not working because the Rocket.Chat server is not accessible. The backend is trying to connect to `http://10.68.0.49:30082` which is not responding.

## Solution Options

### Option 1: Use Docker to Run Rocket.Chat Locally (Recommended)

1. **Install Docker** if you haven't already
2. **Run Rocket.Chat with Docker**:
   ```bash
   docker run --name rocketchat -p 3000:3000 --rm -e ROOT_URL=http://localhost:3000 -e MONGO_URL=mongodb://localhost:27017/rocketchat rocketchat/rocket.chat:latest
   ```

3. **Access Rocket.Chat** at `http://localhost:3000`
4. **Create an admin account** when prompted
5. **Get your credentials**:
   - Go to Admin → Users → Your User → API Keys
   - Create a new API key
   - Copy the User ID and Auth Token

6. **Create a `.env` file** in the backend directory:
   ```bash
   cd /Users/ankushchhabra/Downloads/Social-Hub/backend
   cat > .env << EOF
   ROCKET_CHAT_URL=http://localhost:3000
   ROCKET_CHAT_USER_ID=your_user_id_here
   ROCKET_CHAT_AUTH_TOKEN=your_auth_token_here
   SECRET_KEY=your-super-secret-key
   GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
   EOF
   ```

### Option 2: Use the Remote Rocket.Chat Server

If you have access to the remote server at `10.68.0.49:30082`:

1. **Check if the server is accessible**:
   ```bash
   curl -X GET "http://10.68.0.49:30082/api/v1/info"
   ```

2. **If accessible, get credentials** from the server administrator

3. **Update the configuration** in `backend/rocket_chat_local.py` or create a `.env` file

### Option 3: Use a Public Rocket.Chat Server

1. **Use the demo server** at `https://open.rocket.chat`
2. **Create an account** and get API credentials
3. **Update the configuration** to use the public server

## Testing the Fix

After setting up Rocket.Chat:

1. **Restart the backend server**:
   ```bash
   cd /Users/ankushchhabra/Downloads/Social-Hub/backend
   python main.py
   ```

2. **Test the connection**:
   ```bash
   curl -X GET "http://localhost:8000/chat/test-connection"
   ```

3. **Test reactions** with a valid user token:
   ```bash
   curl -X POST "http://localhost:8000/chat/add-reaction" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN_HERE" \
     -d '{"message_id": "test-123", "emoji": "👍"}'
   ```

## Expected Result

Once Rocket.Chat is properly configured, the reaction functionality should work:
- ✅ Users can click on existing reactions to toggle them
- ✅ Users can click "React" button to add new reactions
- ✅ Reactions are properly saved to Rocket.Chat
- ✅ Messages reload to show updated reaction counts

## Current Status

- ✅ **Frontend**: Reaction UI is properly implemented
- ✅ **Backend**: Reaction endpoints are working
- ❌ **Rocket.Chat**: Server connection is failing
- 🔧 **Next Step**: Configure Rocket.Chat server
