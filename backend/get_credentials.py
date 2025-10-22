#!/usr/bin/env python3
"""
Interactive script to help get Rocket.Chat admin credentials
"""
import asyncio
import httpx
import os

async def get_credentials_interactively():
    """Help user get credentials interactively"""
    print("🔐 Rocket.Chat Admin Credentials Helper")
    print("=" * 50)
    print()
    
    base_url = "http://10.68.0.49:30082"
    
    print("This script will help you get valid admin credentials for Rocket.Chat.")
    print()
    print("You have two options:")
    print("1. Use your Rocket.Chat username/password to get credentials")
    print("2. Get credentials from Personal Access Tokens (recommended)")
    print()
    
    choice = input("Choose option (1 or 2): ").strip()
    
    if choice == "1":
        await get_credentials_from_login(base_url)
    elif choice == "2":
        print_manual_instructions(base_url)
    else:
        print("Invalid choice. Please run the script again.")

async def get_credentials_from_login(base_url):
    """Get credentials using login method"""
    print("\n🔑 Using Login Method")
    print("-" * 30)
    
    username = input("Enter your Rocket.Chat username: ").strip()
    password = input("Enter your Rocket.Chat password: ").strip()
    
    if not username or not password:
        print("❌ Username and password are required")
        return
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            print("\nAttempting to login...")
            
            login_data = {
                "username": username,
                "password": password
            }
            
            response = await client.post(
                f"{base_url}/api/v1/login",
                json=login_data,
                headers={"Content-Type": "application/json"}
            )
            
            print(f"Login response: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                if result.get('status') == 'success':
                    data = result.get('data', {})
                    user_id = data.get('userId')
                    auth_token = data.get('authToken')
                    
                    print("\n✅ SUCCESS: Login successful!")
                    print(f"User ID: {user_id}")
                    print(f"Auth Token: {auth_token}")
                    
                    # Test the credentials
                    print("\nTesting credentials...")
                    test_ok = await test_credentials(base_url, user_id, auth_token)
                    
                    if test_ok:
                        print("\n📝 Update your .env file with these credentials:")
                        print(f"ROCKET_CHAT_USER_ID={user_id}")
                        print(f"ROCKET_CHAT_AUTH_TOKEN={auth_token}")
                    else:
                        print("❌ Credentials don't work properly. Please try the manual method.")
                else:
                    print(f"❌ Login failed: {result.get('message', 'Unknown error')}")
            else:
                print(f"❌ Login failed: {response.text}")
                
    except Exception as e:
        print(f"❌ Error: {e}")

def print_manual_instructions(base_url):
    """Print manual instructions for getting credentials"""
    print("\n📋 Manual Method (Recommended)")
    print("-" * 35)
    print()
    print("Follow these steps to get your credentials:")
    print()
    print("1. 🌐 Open your browser and go to:")
    print(f"   {base_url}")
    print()
    print("2. 🔑 Login with your admin account")
    print()
    print("3. 👤 Click your profile picture (top right corner)")
    print()
    print("4. ⚙️ Click 'My Account'")
    print()
    print("5. 🔐 Go to 'Personal Access Tokens' (left sidebar)")
    print()
    print("6. ➕ Click 'New Token'")
    print()
    print("7. 📝 Fill in the details:")
    print("   - Name: Social Hub Admin Integration")
    print("   - Permissions: Select ALL permissions")
    print()
    print("8. 🎯 Click 'Generate Token'")
    print()
    print("9. 📋 Copy the User ID and Auth Token")
    print()
    print("10. 📝 Update your .env file with:")
    print("    ROCKET_CHAT_USER_ID=your_user_id_here")
    print("    ROCKET_CHAT_AUTH_TOKEN=your_auth_token_here")
    print()
    print("11. 🧪 Test your credentials:")
    print("    python test_admin_auth.py")

async def test_credentials(base_url, user_id, auth_token):
    """Test if credentials work"""
    try:
        headers = {
            "X-Auth-Token": auth_token,
            "X-User-Id": user_id,
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{base_url}/api/v1/me",
                headers=headers
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success') or '_id' in result:
                    print("✅ Credentials work correctly!")
                    return True
            
            print("❌ Credentials don't work")
            return False
            
    except Exception as e:
        print(f"❌ Error testing credentials: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(get_credentials_interactively())

