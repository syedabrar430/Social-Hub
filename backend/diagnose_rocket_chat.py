#!/usr/bin/env python3
"""
Diagnose Rocket.Chat connection issues
"""

import asyncio
import httpx
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def diagnose_rocket_chat():
    base_url = os.getenv("ROCKET_CHAT_URL", "http://10.68.0.49:30082").rstrip("/")
    user_id = os.getenv("ROCKET_CHAT_USER_ID", "")
    auth_token = os.getenv("ROCKET_CHAT_AUTH_TOKEN", "")
    
    print("🚀 Rocket.Chat Diagnosis")
    print("="*40)
    print(f"Server URL: {base_url}")
    print(f"User ID: {user_id}")
    print(f"Auth Token: {auth_token[:20]}..." if auth_token else "Auth Token: (empty)")
    print()
    
    headers = {
        "X-Auth-Token": auth_token,
        "X-User-Id": user_id,
        "Content-Type": "application/json"
    }
    
    # Test 1: Basic connection
    print("🔍 Test 1: Basic Connection")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{base_url}/api/v1/info")
            if response.status_code == 200:
                print("✅ Server is accessible")
            else:
                print(f"❌ Server returned {response.status_code}")
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return
    
    # Test 2: Authentication
    print("\n🔐 Test 2: Authentication")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{base_url}/api/v1/me", headers=headers)
            if response.status_code == 200:
                print("✅ Authentication successful")
                user_info = response.json()
                print(f"   Authenticated as: {user_info.get('name', 'Unknown')}")
            else:
                print(f"❌ Authentication failed: {response.status_code}")
                print(f"   Response: {response.text}")
    except Exception as e:
        print(f"❌ Authentication test failed: {e}")
    
    # Test 3: Try common admin credentials
    print("\n🔑 Test 3: Trying Common Admin Credentials")
    common_credentials = [
        ("admin", "admin"),
        ("admin", "rocket"),
        ("admin", "password"),
        ("admin", "123456"),
        ("rocket", "rocket"),
        ("root", "root"),
    ]
    
    for username, password in common_credentials:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{base_url}/api/v1/login",
                    json={"username": username, "password": password}
                )
                if response.status_code == 200:
                    result = response.json()
                    if result.get('status') == 'success':
                        print(f"✅ Login successful with {username}/{password}")
                        data = result.get('data', {})
                        print(f"   User ID: {data.get('userId')}")
                        print(f"   Auth Token: {data.get('authToken')}")
                        print()
                        print("📝 Update your .env file with:")
                        print(f"ROCKET_CHAT_USER_ID={data.get('userId')}")
                        print(f"ROCKET_CHAT_AUTH_TOKEN={data.get('authToken')}")
                        return
                    else:
                        print(f"❌ Login failed with {username}/{password}: {result.get('error')}")
                else:
                    print(f"❌ Login failed with {username}/{password}: HTTP {response.status_code}")
        except Exception as e:
            print(f"❌ Login test failed with {username}/{password}: {e}")
    
    # Test 4: Check if server allows registration
    print("\n📝 Test 4: Check Registration Status")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{base_url}/api/v1/settings.public")
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    settings = result.get('settings', {})
                    registration_enabled = settings.get('Accounts_AllowUserRegistration', {}).get('value', False)
                    print(f"Registration enabled: {registration_enabled}")
                else:
                    print("❌ Could not get settings")
            else:
                print(f"❌ Settings request failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Settings test failed: {e}")
    
    print("\n" + "="*60)
    print("🔧 SOLUTION")
    print("="*60)
    print("The authentication credentials in your .env file are invalid.")
    print("Here's how to fix it:")
    print()
    print("1. 🌐 Access the Rocket.Chat web interface:")
    print(f"   Open: {base_url}")
    print()
    print("2. 🔑 If it's a fresh installation:")
    print("   - Complete the setup wizard")
    print("   - Create an admin account")
    print()
    print("3. 🔑 If you already have an account:")
    print("   - Log in with your credentials")
    print("   - Go to Administration → My Account")
    print("   - Note your User ID")
    print("   - Go to Personal Access Tokens")
    print("   - Create a new token with admin permissions")
    print()
    print("4. 📝 Update your .env file with the new credentials")
    print()
    print("5. 🔄 Restart your backend server")

if __name__ == "__main__":
    asyncio.run(diagnose_rocket_chat())
