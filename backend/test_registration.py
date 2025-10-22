#!/usr/bin/env python3
"""
Test script for the registration endpoint
"""
import asyncio
import httpx
import json

async def test_registration():
    """Test the registration endpoint"""
    print("🚀 Testing Social Hub Registration Endpoint...")
    print("=" * 50)
    
    # Test data
    test_user = {
        "email": "test@socialhub.com",
        "password": "testpassword123",
        "full_name": "Test User"
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            print("1. Testing registration endpoint...")
            print(f"   URL: http://localhost:8000/auth/register")
            print(f"   Data: {json.dumps(test_user, indent=2)}")
            
            response = await client.post(
                "http://localhost:8000/auth/register",
                json=test_user,
                headers={"Content-Type": "application/json"}
            )
            
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print("   ✅ SUCCESS: User registered successfully!")
                print(f"   Access Token: {result.get('access_token', '')[:50]}...")
                print(f"   User ID: {result.get('user', {}).get('id')}")
                print(f"   User Email: {result.get('user', {}).get('email')}")
                return True
            else:
                print(f"   ❌ FAILED: {response.text}")
                return False
                
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

async def test_login():
    """Test the login endpoint"""
    print("\n2. Testing login endpoint...")
    
    test_user = {
        "email": "test@socialhub.com",
        "password": "testpassword123"
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "http://localhost:8000/auth/login",
                json=test_user,
                headers={"Content-Type": "application/json"}
            )
            
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print("   ✅ SUCCESS: User logged in successfully!")
                print(f"   Access Token: {result.get('access_token', '')[:50]}...")
                return True
            else:
                print(f"   ❌ FAILED: {response.text}")
                return False
                
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

async def test_sso_endpoint():
    """Test the SSO endpoint"""
    print("\n3. Testing SSO endpoint...")
    
    # First, we need to login to get a token
    test_user = {
        "email": "test@socialhub.com",
        "password": "testpassword123"
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Login first
            login_response = await client.post(
                "http://localhost:8000/auth/login",
                json=test_user,
                headers={"Content-Type": "application/json"}
            )
            
            if login_response.status_code != 200:
                print("   ❌ FAILED: Could not login to test SSO endpoint")
                return False
            
            token = login_response.json().get('access_token')
            
            # Test SSO endpoint
            sso_response = await client.post(
                "http://localhost:8000/api/rocket-chat/sso-url",
                json={},
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {token}"
                }
            )
            
            print(f"   Status: {sso_response.status_code}")
            
            if sso_response.status_code == 200:
                result = sso_response.json()
                print("   ✅ SUCCESS: SSO URL generated successfully!")
                print(f"   Rocket.Chat URL: {result.get('rocketChatUrl')}")
                return True
            else:
                print(f"   ❌ FAILED: {sso_response.text}")
                return False
                
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

if __name__ == "__main__":
    async def main():
        print("🧪 Running Social Hub Integration Tests...")
        print("Make sure the backend server is running on http://localhost:8000")
        print()
        
        # Test credentials first
        from test_credentials import test_credentials
        credentials_ok = await test_credentials()
        
        if not credentials_ok:
            print("\n💥 Please fix the Rocket.Chat credentials first!")
            return
        
        # Test registration
        registration_ok = await test_registration()
        
        if registration_ok:
            # Test login
            login_ok = await test_login()
            
            if login_ok:
                # Test SSO
                sso_ok = await test_sso_endpoint()
                
                if sso_ok:
                    print("\n🎉 All tests passed! SSO integration is working!")
                else:
                    print("\n❌ SSO endpoint test failed!")
            else:
                print("\n❌ Login test failed!")
        else:
            print("\n❌ Registration test failed!")
    
    asyncio.run(main())

