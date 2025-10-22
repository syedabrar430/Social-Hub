#!/usr/bin/env python3
"""
Test script to check admin authentication with Rocket.Chat
"""
import asyncio
import httpx
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def test_admin_authentication():
    """Test admin authentication with Rocket.Chat"""
    base_url = os.getenv("ROCKET_CHAT_URL", "http://10.68.0.49:30082")
    user_id = os.getenv("ROCKET_CHAT_USER_ID", "")
    auth_token = os.getenv("ROCKET_CHAT_AUTH_TOKEN", "")
    
    print("🔐 Testing Admin Authentication with Rocket.Chat...")
    print("=" * 60)
    print(f"URL: {base_url}")
    print(f"User ID: {user_id}")
    print(f"Auth Token: {auth_token[:20]}..." if auth_token else "No token")
    print()
    
    if not user_id or not auth_token:
        print("❌ FAILED: No credentials found in .env file")
        print("Please add valid Rocket.Chat admin credentials to your .env file:")
        print("ROCKET_CHAT_USER_ID=your_admin_user_id")
        print("ROCKET_CHAT_AUTH_TOKEN=your_admin_auth_token")
        return False
    
    headers = {
        "X-Auth-Token": auth_token,
        "X-User-Id": user_id,
        "Content-Type": "application/json"
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Test basic authentication
            print("1. Testing basic authentication...")
            response = await client.get(
                f"{base_url}/api/v1/me",
                headers=headers
            )
            
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print("   ✅ SUCCESS: Authentication successful!")
                print(f"   User: {result.get('name', 'Unknown')}")
                print(f"   Username: {result.get('username', 'Unknown')}")
                print(f"   Email: {result.get('emails', [{}])[0].get('address', 'Unknown')}")
                
                # Test user creation permissions
                print("\n2. Testing user creation permissions...")
                
                # Try to list users to check permissions
                users_response = await client.get(
                    f"{base_url}/api/v1/users.list",
                    headers=headers,
                    params={"count": 1}
                )
                
                print(f"   Users list status: {users_response.status_code}")
                
                if users_response.status_code == 200:
                    print("   ✅ SUCCESS: Can access users list - admin permissions confirmed!")
                    
                    # Test channel listing
                    print("\n3. Testing channel access...")
                    channels_response = await client.get(
                        f"{base_url}/api/v1/channels.list",
                        headers=headers
                    )
                    
                    print(f"   Channels status: {channels_response.status_code}")
                    
                    if channels_response.status_code == 200:
                        channels_result = channels_response.json()
                        channels = channels_result.get('channels', [])
                        print(f"   ✅ SUCCESS: Can access {len(channels)} channels!")
                        
                        # Show available channels
                        print("\n   Available channels:")
                        for channel in channels[:5]:  # Show first 5
                            print(f"   - {channel.get('name')} (ID: {channel.get('_id')})")
                        
                        return True
                    else:
                        print(f"   ❌ FAILED: Cannot access channels: {channels_response.text}")
                        return False
                else:
                    print(f"   ❌ FAILED: Cannot access users list: {users_response.text}")
                    return False
            else:
                print(f"   ❌ FAILED: Authentication failed: {response.text}")
                return False
                
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
        return False

async def test_user_creation():
    """Test creating a user with admin credentials"""
    base_url = os.getenv("ROCKET_CHAT_URL", "http://10.68.0.49:30082")
    user_id = os.getenv("ROCKET_CHAT_USER_ID", "")
    auth_token = os.getenv("ROCKET_CHAT_AUTH_TOKEN", "")
    
    if not user_id or not auth_token:
        print("❌ No admin credentials available for user creation test")
        return False
    
    headers = {
        "X-Auth-Token": auth_token,
        "X-User-Id": user_id,
        "Content-Type": "application/json"
    }
    
    print("\n🧪 Testing User Creation...")
    print("=" * 40)
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Test user creation
            test_user_data = {
                "email": "testuser@socialhub.com",
                "name": "Test User",
                "pass": "testpassword123",
                "username": "testuser_socialhub",
                "verified": True,
                "active": True
            }
            
            print("Creating test user...")
            response = await client.post(
                f"{base_url}/api/v1/users.create",
                json=test_user_data,
                headers=headers
            )
            
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    print("   ✅ SUCCESS: Test user created successfully!")
                    print(f"   User ID: {result.get('user', {}).get('_id')}")
                    
                    # Clean up - delete the test user
                    user_id_to_delete = result.get('user', {}).get('_id')
                    if user_id_to_delete:
                        print("   Cleaning up test user...")
                        delete_response = await client.post(
                            f"{base_url}/api/v1/users.delete",
                            json={"userId": user_id_to_delete},
                            headers=headers
                        )
                        if delete_response.status_code == 200:
                            print("   ✅ Test user deleted successfully")
                        else:
                            print(f"   ⚠️ Could not delete test user: {delete_response.status_code}")
                    
                    return True
                else:
                    print(f"   ❌ FAILED: {result.get('error', 'Unknown error')}")
                    return False
            else:
                print(f"   ❌ FAILED: {response.text}")
                return False
                
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
        return False

if __name__ == "__main__":
    async def main():
        print("🧪 Testing Rocket.Chat Admin Authentication")
        print("This script will test if your admin credentials work for user management")
        print()
        
        # Test admin authentication
        auth_ok = await test_admin_authentication()
        
        if auth_ok:
            # Test user creation
            creation_ok = await test_user_creation()
            
            if creation_ok:
                print("\n🎉 All tests passed!")
                print("Your admin credentials are working correctly!")
                print("The SSO integration should now work properly.")
            else:
                print("\n⚠️ Authentication works but user creation failed.")
                print("Check your admin permissions in Rocket.Chat.")
        else:
            print("\n❌ Admin authentication failed.")
            print("Please check your .env file and ensure you have valid admin credentials.")
            print("\nTo get admin credentials:")
            print("1. Go to your Rocket.Chat server")
            print("2. Login as admin")
            print("3. Go to Profile → My Account → Personal Access Tokens")
            print("4. Create a new token with admin permissions")
            print("5. Update your .env file with the User ID and Auth Token")
    
    asyncio.run(main())

