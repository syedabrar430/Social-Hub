#!/usr/bin/env python3
"""
Script to help fix Rocket.Chat credentials and test channel fetching
"""
import asyncio
import httpx
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).parent / ".env"
load_dotenv(env_path)

async def test_different_auth_methods():
    """Test different authentication methods to find what works"""
    base_url = os.getenv("ROCKET_CHAT_URL", "http://10.68.0.49:30082")
    user_id = os.getenv("ROCKET_CHAT_USER_ID", "")
    auth_token = os.getenv("ROCKET_CHAT_AUTH_TOKEN", "")
    
    print("🔍 Testing Different Authentication Methods...")
    print("=" * 60)
    print(f"URL: {base_url}")
    print(f"User ID: {user_id}")
    print(f"Auth Token: {auth_token[:20]}...")
    print()
    
    # Method 1: Standard headers
    print("1. Testing standard headers method...")
    headers1 = {
        "X-Auth-Token": auth_token,
        "X-User-Id": user_id,
        "Content-Type": "application/json"
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{base_url}/api/v1/me", headers=headers1)
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                print("   ✅ SUCCESS: Standard headers work!")
                return headers1
            else:
                print(f"   ❌ FAILED: {response.text}")
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
    
    # Method 2: Try without Content-Type
    print("\n2. Testing without Content-Type header...")
    headers2 = {
        "X-Auth-Token": auth_token,
        "X-User-Id": user_id
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{base_url}/api/v1/me", headers=headers2)
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                print("   ✅ SUCCESS: Without Content-Type works!")
                return headers2
            else:
                print(f"   ❌ FAILED: {response.text}")
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
    
    # Method 3: Try with different header names
    print("\n3. Testing different header names...")
    headers3 = {
        "Authorization": f"Bearer {auth_token}",
        "X-User-Id": user_id,
        "Content-Type": "application/json"
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{base_url}/api/v1/me", headers=headers3)
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                print("   ✅ SUCCESS: Authorization Bearer works!")
                return headers3
            else:
                print(f"   ❌ FAILED: {response.text}")
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
    
    print("\n❌ All authentication methods failed!")
    print("The credentials in your .env file are invalid.")
    return None

async def test_server_access():
    """Test if the Rocket.Chat server is accessible"""
    base_url = os.getenv("ROCKET_CHAT_URL", "http://10.68.0.49:30082")
    
    print("🌐 Testing Rocket.Chat Server Access...")
    print("=" * 50)
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Test basic server access
            print("1. Testing basic server access...")
            response = await client.get(f"{base_url}/api/v1/info")
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                info = response.json()
                print("   ✅ SUCCESS: Server is accessible!")
                print(f"   Version: {info.get('version', 'Unknown')}")
                print(f"   Build: {info.get('build', {}).get('date', 'Unknown')}")
                return True
            else:
                print(f"   ❌ FAILED: {response.text}")
                return False
                
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
        return False

async def test_login_method():
    """Test login method to get fresh credentials"""
    base_url = os.getenv("ROCKET_CHAT_URL", "http://10.68.0.49:30082")
    
    print("\n🔐 Testing Login Method...")
    print("=" * 40)
    
    # You'll need to provide your actual Rocket.Chat username and password
    username = input("Enter your Rocket.Chat username: ").strip()
    password = input("Enter your Rocket.Chat password: ").strip()
    
    if not username or not password:
        print("❌ Username and password are required for login test")
        return None
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Try login
            login_data = {
                "username": username,
                "password": password
            }
            
            response = await client.post(
                f"{base_url}/api/v1/login",
                json=login_data,
                headers={"Content-Type": "application/json"}
            )
            
            print(f"   Login Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                if result.get('status') == 'success':
                    data = result.get('data', {})
                    user_id = data.get('userId')
                    auth_token = data.get('authToken')
                    
                    print("   ✅ SUCCESS: Login successful!")
                    print(f"   User ID: {user_id}")
                    print(f"   Auth Token: {auth_token[:20]}...")
                    
                    # Test the new credentials
                    headers = {
                        "X-Auth-Token": auth_token,
                        "X-User-Id": user_id,
                        "Content-Type": "application/json"
                    }
                    
                    test_response = await client.get(f"{base_url}/api/v1/me", headers=headers)
                    if test_response.status_code == 200:
                        print("   ✅ SUCCESS: New credentials work!")
                        
                        print("\n📝 Update your .env file with these credentials:")
                        print(f"ROCKET_CHAT_USER_ID={user_id}")
                        print(f"ROCKET_CHAT_AUTH_TOKEN={auth_token}")
                        
                        return headers
                    else:
                        print(f"   ❌ FAILED: New credentials don't work: {test_response.text}")
                else:
                    print(f"   ❌ FAILED: Login failed: {result.get('message', 'Unknown error')}")
            else:
                print(f"   ❌ FAILED: Login request failed: {response.text}")
                
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
    
    return None

async def test_channels_with_working_auth(headers):
    """Test channel fetching with working authentication"""
    if not headers:
        return
    
    base_url = os.getenv("ROCKET_CHAT_URL", "http://10.68.0.49:30082")
    
    print("\n📋 Testing Channel Fetching...")
    print("=" * 40)
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Test channels.list
            print("1. Testing channels.list...")
            response = await client.get(
                f"{base_url}/api/v1/channels.list",
                headers=headers
            )
            
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                channels = result.get('channels', [])
                print(f"   ✅ SUCCESS: Found {len(channels)} channels!")
                
                for channel in channels[:5]:  # Show first 5 channels
                    print(f"   - {channel.get('name')} (ID: {channel.get('_id')})")
                
                # Test specific channel access
                if channels:
                    test_channel = channels[0]
                    print(f"\n2. Testing access to channel: {test_channel.get('name')}")
                    
                    # Get channel info
                    channel_response = await client.get(
                        f"{base_url}/api/v1/channels.info?roomId={test_channel.get('_id')}",
                        headers=headers
                    )
                    
                    print(f"   Channel Info Status: {channel_response.status_code}")
                    if channel_response.status_code == 200:
                        print("   ✅ SUCCESS: Can access channel info!")
                    else:
                        print(f"   ❌ FAILED: {channel_response.text}")
                
                return True
            else:
                print(f"   ❌ FAILED: {response.text}")
                return False
                
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
        return False

async def main():
    print("🔧 Rocket.Chat Credentials Fix Script")
    print("=" * 50)
    
    # Test server access
    server_ok = await test_server_access()
    if not server_ok:
        print("\n💥 Server is not accessible. Please check your Rocket.Chat URL.")
        return
    
    # Test current credentials
    working_headers = await test_different_auth_methods()
    
    if working_headers:
        print("\n✅ Your current credentials work!")
        await test_channels_with_working_auth(working_headers)
    else:
        print("\n❌ Your current credentials don't work.")
        print("Let's try to get fresh credentials...")
        
        # Try login method
        fresh_headers = await test_login_method()
        if fresh_headers:
            await test_channels_with_working_auth(fresh_headers)
        else:
            print("\n💥 Could not get working credentials.")
            print("\n📋 Manual Steps to Get Credentials:")
            print("1. Go to your Rocket.Chat server: http://10.68.0.49:30082")
            print("2. Login with your admin account")
            print("3. Go to your profile (click avatar)")
            print("4. Click 'My Account'")
            print("5. Go to 'Personal Access Tokens'")
            print("6. Create a new token with these permissions:")
            print("   - users.create")
            print("   - users.info")
            print("   - users.createToken")
            print("   - channels.read")
            print("   - channels.write")
            print("   - im.read")
            print("   - im.write")
            print("   - chat")
            print("   - admin")
            print("7. Copy the User ID and Auth Token")
            print("8. Update your .env file with the new credentials")

if __name__ == "__main__":
    asyncio.run(main())

