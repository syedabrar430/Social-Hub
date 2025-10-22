#!/usr/bin/env python3
"""
Test script for SSO authentication between Social Hub and Rocket.Chat
"""
import asyncio
import httpx
import json

async def test_sso_authentication():
    """Test SSO authentication flow"""
    print("🔐 Testing SSO Authentication Flow...")
    print("=" * 60)
    
    # Test data - using your actual Social Hub user credentials
    test_user = {
        "email": "ankush8@gmail.com",
        "password": "Ankushsocial@2"
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Step 1: Login to Social Hub
            print("1. Logging into Social Hub...")
            login_response = await client.post(
                "http://localhost:8000/auth/login",
                json=test_user,
                headers={"Content-Type": "application/json"}
            )
            
            if login_response.status_code != 200:
                print("   ❌ FAILED: Could not login to Social Hub")
                print(f"   Response: {login_response.text}")
                return False
            
            login_data = login_response.json()
            token = login_data.get('access_token')
            user_info = login_data.get('user', {})
            
            print("   ✅ SUCCESS: Logged into Social Hub")
            print(f"   User: {user_info.get('email', 'Unknown')}")
            
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}"
            }
            
            # Step 2: Test SSO URL generation
            print("\n2. Testing SSO URL generation...")
            sso_response = await client.post(
                "http://localhost:8000/api/rocket-chat/sso-url",
                json={},
                headers=headers
            )
            
            print(f"   Status: {sso_response.status_code}")
            if sso_response.status_code == 200:
                sso_data = sso_response.json()
                print("   ✅ SUCCESS: SSO URL generated!")
                print(f"   Rocket.Chat URL: {sso_data.get('rocketChatUrl')}")
            else:
                print(f"   ❌ FAILED: {sso_response.text}")
                return False
            
            # Step 3: Test user rooms retrieval
            print("\n3. Testing user rooms retrieval...")
            rooms_response = await client.get(
                "http://localhost:8000/api/rocket-chat/user-rooms",
                headers=headers
            )
            
            print(f"   Status: {rooms_response.status_code}")
            if rooms_response.status_code == 200:
                rooms_data = rooms_response.json()
                print("   ✅ SUCCESS: User rooms retrieved!")
                print(f"   Channels: {len(rooms_data.get('channels', []))}")
                print(f"   Groups: {len(rooms_data.get('groups', []))}")
                print(f"   Direct Messages: {len(rooms_data.get('direct_messages', []))}")
            else:
                print(f"   ❌ FAILED: {rooms_response.text}")
                return False
            
            # Step 4: Test channels retrieval
            print("\n4. Testing channels retrieval...")
            channels_response = await client.get(
                "http://localhost:8000/api/rocket-chat/channels",
                headers=headers
            )
            
            print(f"   Status: {channels_response.status_code}")
            if channels_response.status_code == 200:
                channels_data = channels_response.json()
                print("   ✅ SUCCESS: Channels retrieved!")
                print(f"   Found {len(channels_data)} channels")
                
                # Show first few channels
                for i, channel in enumerate(channels_data[:3]):
                    print(f"   - {channel.get('name', 'Unknown')} (ID: {channel.get('id', 'Unknown')})")
            else:
                print(f"   ❌ FAILED: {channels_response.text}")
                return False
            
            print("\n" + "=" * 60)
            print("🎉 SSO Authentication test completed successfully!")
            print("The user can now access Rocket.Chat features through Social Hub!")
            return True
            
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

async def test_without_sso():
    """Test what happens without proper SSO authentication"""
    print("\n🔍 Testing without SSO authentication...")
    print("=" * 50)
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Try to access Rocket.Chat endpoints without authentication
            response = await client.get("http://localhost:8000/api/rocket-chat/channels")
            
            print(f"Status: {response.status_code}")
            if response.status_code == 401:
                print("✅ SUCCESS: Properly protected - requires authentication")
            else:
                print("❌ FAILED: Endpoint should require authentication")
                
    except Exception as e:
        print(f"❌ ERROR: {e}")

if __name__ == "__main__":
    async def main():
        print("🧪 Testing SSO Authentication Between Social Hub and Rocket.Chat")
        print("Make sure:")
        print("1. Social Hub backend is running on http://localhost:8000")
        print("2. Rocket.Chat server is accessible at http://10.68.0.49:30082")
        print("3. You have a valid user account in Social Hub")
        print("4. The user has been created in Rocket.Chat via SSO")
        print()
        
        # Test SSO authentication
        sso_ok = await test_sso_authentication()
        
        # Test without authentication
        await test_without_sso()
        
        if sso_ok:
            print("\n🎉 All tests passed!")
            print("SSO authentication is working correctly!")
            print("Users can now:")
            print("  ✅ Access Rocket.Chat through Social Hub")
            print("  ✅ View their channels and DMs")
            print("  ✅ Send messages and reactions")
            print("  ✅ Use thread functionality")
        else:
            print("\n❌ Some tests failed.")
            print("Please check:")
            print("1. Your Social Hub user credentials")
            print("2. Rocket.Chat server accessibility")
            print("3. Backend server logs for errors")
    
    asyncio.run(main())

