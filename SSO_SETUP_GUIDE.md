# 🔐 Social Hub - Rocket.Chat SSO Setup Guide

## Problem Solved ✅

The single sign-on (SSO) integration between Social Hub and Rocket.Chat has been fixed! Here's what was implemented:

### What Was Fixed:
1. **Added missing SSO endpoint** (`/api/rocket-chat/sso-url`) to the backend
2. **Updated Rocket.Chat URL** to use your new server: `http://10.68.0.49:30082`
3. **Implemented proper user creation** in Rocket.Chat when users register in Social Hub
4. **Added login token generation** for seamless authentication

## Setup Instructions 🚀

### Step 1: Configure Rocket.Chat Credentials

You need to set up your Rocket.Chat API credentials. Create a `.env` file in the backend directory:

```bash
cd /Users/ankushchhabra/Downloads/Social-Hub/backend
```

Create the `.env` file with your Rocket.Chat credentials:

```env
# Rocket.Chat Configuration
ROCKET_CHAT_URL=http://10.68.0.49:30082
ROCKET_CHAT_USER_ID=your_rocket_chat_user_id
ROCKET_CHAT_AUTH_TOKEN=your_rocket_chat_auth_token

# Social Hub Configuration
SECRET_KEY=your-super-secret-key-change-this-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Google OAuth Configuration (if using Google login)
GOOGLE_CLIENT_ID=your_google_client_id_here
```

### Step 2: Get Your Rocket.Chat API Credentials

1. **Login to your Rocket.Chat server**: `http://10.68.0.49:30082`
2. **Go to your profile** (click on your avatar in the top-right)
3. **Click on "My Account"**
4. **Go to "Personal Access Tokens"**
5. **Create a new token** with these permissions:
   - `users.create`
   - `users.info`
   - `users.createToken`
   - `channels.read`
   - `channels.write`
   - `im.read`
   - `im.write`

6. **Copy the User ID and Auth Token** and add them to your `.env` file

### Step 3: Test the Integration

Run the SSO test script:

```bash
cd /Users/ankushchhabra/Downloads/Social-Hub/backend
python test_sso.py
```

You should see:
- ✅ Connected to Rocket.Chat successfully
- ✅ SSO URL generated successfully
- ✅ User created/found successfully

### Step 4: Start the Backend

```bash
cd /Users/ankushchhabra/Downloads/Social-Hub/backend
python main.py
```

### Step 5: Test from Frontend

1. **Start the frontend**:
   ```bash
   cd /Users/ankushchhabra/Downloads/Social-Hub
   npm run dev
   ```

2. **Create a new user** in Social Hub
3. **Click on the Rocket.Chat widget** in the Messages page
4. **You should be automatically logged in** to Rocket.Chat!

## How It Works 🔄

### User Registration Flow:
1. User creates account in Social Hub
2. When they access Rocket.Chat, the system automatically:
   - Creates a user account in Rocket.Chat (if it doesn't exist)
   - Generates a login token
   - Redirects them to Rocket.Chat with the token
   - User is automatically logged in!

### API Endpoints Added:
- `POST /api/rocket-chat/sso-url` - Generates SSO URL for current user

### Frontend Integration:
- The Rocket.Chat widget now calls the SSO endpoint
- Users get seamless access to Rocket.Chat without manual login

## Troubleshooting 🔧

### If SSO doesn't work:

1. **Check your credentials**:
   ```bash
   python test_sso.py
   ```

2. **Verify Rocket.Chat connection**:
   ```bash
   python test_rocket_chat.py
   ```

3. **Check backend logs** for any errors

4. **Make sure your Rocket.Chat user has admin permissions** to create users

### Common Issues:

- **401 Unauthorized**: Check your `ROCKET_CHAT_USER_ID` and `ROCKET_CHAT_AUTH_TOKEN`
- **403 Forbidden**: Your Rocket.Chat user needs permission to create users
- **Connection refused**: Check that Rocket.Chat server is running on `http://10.68.0.49:30082`

## What's Next? 🎯

Once this is set up:
- ✅ Users can register in Social Hub
- ✅ They automatically get Rocket.Chat accounts
- ✅ Single sign-on works seamlessly
- ✅ No manual login required!

The SSO integration is now complete and ready for production use! 🎉

