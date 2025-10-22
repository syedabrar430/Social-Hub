#!/usr/bin/env python3
"""
Test script to verify Rocket.Chat credentials
"""
import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv
import httpx

# Load environment variables
env_path = Path(__file__).parent / ".env"
load_dotenv(env_path)

async def test_credentials():
    """Test the Rocket.Chat credentials"""
    base_url = os.getenv("ROCKET_CHAT_URL", "http://10.68.0.49:30082")
    user_id = os.getenv("ROCKET_CHAT_USER_ID", "")
    auth_token = os.getenv("ROCKET_CHAT_AUTH_TOKEN", "")
    
    headers = {
        "X-Auth-Token": auth_token,
        "X-User-Id": user_id,
        "Content-Type": "application/json"
    }
    
    print("🔐 Testing Rocket.Chat Credentials...")
    print("=" * 50)
    print(f"URL: {base_url}")
    print(f"User ID: {user_id}")
    print(f"Auth Token: {auth_token[:20]}..." if auth_token else "Auth Token: NOT SET")
    print()
    
    if not user_id or not auth_token:
        print("❌ ERROR: User ID or Auth Token is not set!")
        print("Please update your .env file with valid credentials.")
        return False
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Test basic connection
            print("1. Testing basic connection...")
            response = await client.get(f"{base_url}/api/v1/me", headers=headers)
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                me_data = response.json()
                print("   ✅ SUCCESS: Connected to Rocket.Chat!")
                print(f"   Connected as: {me_data.get('username')}")
                print(f"   Email: {me_data.get('emails', [{}])[0].get('address', 'N/A')}")
                print(f"   Name: {me_data.get('name')}")
                return True
            else:
                print(f"   ❌ FAILED: {response.text}")
                return False
                
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

if __name__ == "__main__":
    success = asyncio.run(test_credentials())
    if success:
        print("\n🎉 Credentials are valid! You can now test the registration endpoint.")
    else:
        print("\n💥 Credentials are invalid. Please get new credentials from your Rocket.Chat server.")

