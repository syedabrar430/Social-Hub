# 🔐 How to Get Valid Rocket.Chat Credentials

## The Problem
Your Rocket.Chat server is working fine, but the API is returning `401 Unauthorized` because the credentials in your `.env` file are invalid or expired.

## Solution: Get New Credentials

### Method 1: Personal Access Token (Recommended)

1. **Go to your Rocket.Chat server**: http://10.68.0.49:30082
2. **Login** with your admin account
3. **Click your profile picture** (top right corner)
4. **Click "My Account"**
5. **Go to "Personal Access Tokens"** (in the left sidebar)
6. **Click "New Token"**
7. **Fill in the details**:
   - Name: `Social Hub Integration`
   - Permissions: Select these permissions:
     - `users.create`
     - `users.info` 
     - `users.createToken`
     - `channels.read`
     - `channels.write`
     - `im.read`
     - `im.write`
     - `chat`
     - `admin`
8. **Click "Generate Token"**
9. **Copy the token** and **User ID**

### Method 2: Login API (Alternative)

If you know your Rocket.Chat username and password, you can use the login API:

```bash
curl -X POST http://10.68.0.49:30082/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your_username",
    "password": "your_password"
  }'
```

This will return:
```json
{
  "status": "success",
  "data": {
    "userId": "your_user_id",
    "authToken": "your_auth_token"
  }
}
```

### Method 3: Admin Panel

1. **Go to**: http://10.68.0.49:30082/admin
2. **Login** as admin
3. **Go to "Users"** → Find your user
4. **Click "Edit"**
5. **Generate a new token** or **reset password**

## Update Your .env File

Once you have the credentials, update your `.env` file:

```env
ROCKET_CHAT_URL=http://10.68.0.49:30082
ROCKET_CHAT_USER_ID=your_user_id_here
ROCKET_CHAT_AUTH_TOKEN=your_auth_token_here
```

## Test Your Credentials

Run this command to test your new credentials:

```bash
python test_credentials.py
```

If it shows "✅ SUCCESS", your credentials are working!

## Common Issues

### Issue 1: Token Expired
- **Solution**: Generate a new token from the Personal Access Tokens page

### Issue 2: Wrong Permissions
- **Solution**: Make sure your token has all the required permissions listed above

### Issue 3: Server Not Accessible
- **Solution**: Check if the Rocket.Chat server is running and accessible

### Issue 4: Wrong User ID
- **Solution**: Make sure you're using the correct User ID from the token generation

## Need Help?

If you're still having issues:

1. **Check the Rocket.Chat server logs** for any errors
2. **Verify the server is running** on http://10.68.0.49:30082
3. **Make sure you have admin access** to the Rocket.Chat server
4. **Check if the API is enabled** in the Rocket.Chat settings

## Next Steps

Once you have valid credentials:

1. **Update your `.env` file** with the new credentials
2. **Run the test script** to verify they work
3. **Start the backend server** to test the enhanced features
4. **Enjoy the enhanced Rocket.Chat widget!** 🚀

The enhanced features are ready to work once you have valid credentials!

