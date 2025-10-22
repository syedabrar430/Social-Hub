#!/usr/bin/env python3
"""
Test script for Rocket.Chat SSO integration
"""
import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv
from rocket_chat_local import RocketChatClient

# Load environment variables
env_path = Path(__file__).parent / ".env"
load_dotenv(env_path)

async def test_sso():
    """Test the SSO functionality"""
    print("🚀 Testing Rocket.Chat SSO Integration...")
    print("=" * 50)
    
    # Initialize Rocket.Chat client
    client = RocketChatClient()
    
    # Test connection first
    print("1. Testing Rocket.Chat connection...")
    is_connected = await client.test_connection()
    if is_connected:
        print("   ✅ Connected to Rocket.Chat successfully")
    else:
        print("   ❌ Failed to connect to Rocket.Chat")
        print("   Make sure your ROCKET_CHAT_URL, ROCKET_CHAT_USER_ID, and ROCKET_CHAT_AUTH_TOKEN are set correctly")
        return
    
    # Test SSO URL generation
    print("\n2. Testing SSO URL generation...")
    test_user_email = "test@socialhub.com"
    test_user_name = "Test User"
    test_user_id = "12345"
    
    try:
        sso_result = await client.generate_sso_url(test_user_email, test_user_name, test_user_id)
        
        if sso_result.get('success'):
            print("   ✅ SSO URL generated successfully")
            print(f"   URL: {sso_result.get('url')}")
        else:
            print(f"   ❌ Failed to generate SSO URL: {sso_result.get('error')}")
            
    except Exception as e:
        print(f"   ❌ Error during SSO URL generation: {e}")
    
    # Test user creation
    print("\n3. Testing user creation...")
    try:
        user_id = await client._ensure_user_exists(test_user_email, test_user_name, test_user_id)
        
        if user_id:
            print(f"   ✅ User created/found successfully with ID: {user_id}")
        else:
            print("   ❌ Failed to create/find user")
            
    except Exception as e:
        print(f"   ❌ Error during user creation: {e}")
    
    print("\n" + "=" * 50)
    print("SSO Test completed!")

if __name__ == "__main__":
    asyncio.run(test_sso())

