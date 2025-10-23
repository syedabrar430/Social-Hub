# Rocket.Chat Integration Fix

## Problem Identified

The groups and DMs are not fetching because the Rocket.Chat authentication credentials in the `.env` file are invalid. The server is returning `401 Unauthorized` errors for all API calls.

## Diagnosis Results

- ✅ **Rocket.Chat Server**: Running and accessible at `http://10.68.0.49:30082`
- ❌ **Authentication**: Current credentials are invalid (401 error)
- ❌ **API Access**: All endpoints fail with "You must be logged in to do this"

## Root Cause

The stored credentials in `backend/.env` are either:
1. Expired tokens
2. Invalid user ID
3. Incorrect authentication token
4. User account was deleted or modified

## Solution

### Step 1: Access Rocket.Chat Web Interface

Open your browser and navigate to: `http://10.68.0.49:30082`

### Step 2A: If it's a Fresh Installation

1. Complete the setup wizard
2. Create an admin account with your preferred credentials
3. Note the username and password for future reference

### Step 2B: If you already have an account

1. Log in with your existing credentials
2. Go to **Administration** → **My Account**
3. Note your **User ID** (visible in the account details)
4. Go to **Personal Access Tokens**
5. Create a new token with admin permissions
6. Copy the generated token

### Step 3: Update Environment Variables

Edit the `backend/.env` file and replace the Rocket.Chat credentials:

```env
# Rocket.Chat Configuration
ROCKET_CHAT_URL=http://10.68.0.49:30082
ROCKET_CHAT_USER_ID=YOUR_NEW_USER_ID_HERE
ROCKET_CHAT_AUTH_TOKEN=YOUR_NEW_AUTH_TOKEN_HERE
```

### Step 4: Restart Backend Server

Restart your backend server to load the new credentials:

```bash
cd backend
source venv/bin/activate
python main.py
```

### Step 5: Test the Fix

Run the diagnosis script to verify the fix:

```bash
cd backend
source venv/bin/activate
python diagnose_rocket_chat.py
```

## Alternative: Use Login API

If you know the admin username and password, you can use the login API to get new credentials:

```bash
curl -X POST "http://10.68.0.49:30082/api/v1/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "your_username", "password": "your_password"}'
```

This will return a response with `userId` and `authToken` that you can use in your `.env` file.

## Verification

After updating the credentials, the following should work:

1. ✅ Authentication test should pass
2. ✅ Channels list should be accessible
3. ✅ Groups and DMs should be fetchable
4. ✅ Messages should be retrievable

## Prevention

To prevent this issue in the future:

1. **Regular Token Refresh**: Personal Access Tokens can expire, so refresh them periodically
2. **Backup Credentials**: Keep a backup of working credentials
3. **Monitor Authentication**: Add logging to detect authentication failures early
4. **Use Environment Variables**: Never hardcode credentials in the code

## Files Modified

- `backend/.env` - Updated with new credentials
- `backend/diagnose_rocket_chat.py` - Created diagnostic script
- `backend/test_rocket_chat_auth.py` - Created authentication tester

## Testing Scripts

Two diagnostic scripts have been created to help troubleshoot Rocket.Chat issues:

1. **`diagnose_rocket_chat.py`** - Comprehensive diagnosis of connection and authentication
2. **`test_rocket_chat_auth.py`** - Interactive authentication testing

Run these scripts whenever you encounter Rocket.Chat connection issues.
