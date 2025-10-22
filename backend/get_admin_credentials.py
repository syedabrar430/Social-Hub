#!/usr/bin/env python3
"""
Script to get admin credentials from Rocket.Chat using your login
"""
import asyncio
import httpx
import os

async def get_admin_credentials():
    """Get admin credentials from Rocket.Chat"""
    print("🔐 Getting Admin Credentials from Rocket.Chat...")
    print("=" * 60)
    
    base_url = "http://10.68.0.49:30082"
    
    # Your Rocket.Chat credentials
    username = "ankush8@gmail.com"  # Using email as username
    password = "Ankushsocial@2"
    
    print(f"Server: {base_url}")
    print(f"Username: {username}")
    print()
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            print("1. Logging into Rocket.Chat...")
            
            # Try login with email
            login_data = {
                "username": username,
                "password": password
            }
            
            response = await client.post(
                f"{base_url}/api/v1/login",
                json=login_data,
                headers={"Content-Type": "application/json"}
            )
            
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                if result.get('status') == 'success':
                    data = result.get('data', {})
                    user_id = data.get('userId')
                    auth_token = data.get('authToken')
                    
                    print("   ✅ SUCCESS: Login successful!")
                    print(f"   User ID: {user_id}")
                    print(f"   Auth Token: {auth_token}")
                    
                    # Test the credentials
                    print("\n2. Testing credentials...")
                    test_ok = await test_credentials(base_url, user_id, auth_token)
                    
                    if test_ok:
                        print("\n📝 Update your .env file with these credentials:")
                        print(f"ROCKET_CHAT_USER_ID={user_id}")
                        print(f"ROCKET_CHAT_AUTH_TOKEN={auth_token}")
                        
                        # Update the .env file automatically
                        update_env_file(user_id, auth_token)
                        
                        return True
                    else:
                        print("❌ Credentials don't work properly.")
                        return False
                else:
                    print(f"❌ Login failed: {result.get('message', 'Unknown error')}")
                    return False
            else:
                print(f"❌ Login failed: {response.text}")
                
                # Try with username instead of email
                print("\nTrying with username instead of email...")
                username_only = username.split('@')[0]
                
                login_data = {
                    "username": username_only,
                    "password": password
                }
                
                response = await client.post(
                    f"{base_url}/api/v1/login",
                    json=login_data,
                    headers={"Content-Type": "application/json"}
                )
                
                print(f"   Status: {response.status_code}")
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('status') == 'success':
                        data = result.get('data', {})
                        user_id = data.get('userId')
                        auth_token = data.get('authToken')
                        
                        print("   ✅ SUCCESS: Login with username successful!")
                        print(f"   User ID: {user_id}")
                        print(f"   Auth Token: {auth_token}")
                        
                        # Test the credentials
                        test_ok = await test_credentials(base_url, user_id, auth_token)
                        
                        if test_ok:
                            print("\n📝 Update your .env file with these credentials:")
                            print(f"ROCKET_CHAT_USER_ID={user_id}")
                            print(f"ROCKET_CHAT_AUTH_TOKEN={auth_token}")
                            
                            update_env_file(user_id, auth_token)
                            return True
                
                return False
                
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

async def test_credentials(base_url, user_id, auth_token):
    """Test if credentials work"""
    try:
        headers = {
            "X-Auth-Token": auth_token,
            "X-User-Id": user_id,
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Test basic authentication
            response = await client.get(
                f"{base_url}/api/v1/me",
                headers=headers
            )
            
            print(f"   Authentication test: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success') or '_id' in result:
                    print("   ✅ Authentication successful!")
                    
                    # Test channel access
                    channels_response = await client.get(
                        f"{base_url}/api/v1/channels.list",
                        headers=headers
                    )
                    
                    print(f"   Channels access: {channels_response.status_code}")
                    
                    if channels_response.status_code == 200:
                        channels_result = channels_response.json()
                        channels = channels_result.get('channels', [])
                        print(f"   ✅ Can access {len(channels)} channels!")
                        
                        # Show available channels
                        print("   Available channels:")
                        for channel in channels[:3]:
                            print(f"   - {channel.get('name')} (ID: {channel.get('_id')})")
                        
                        return True
                    else:
                        print("   ⚠️ Cannot access channels")
                        return False
                else:
                    print("   ❌ Authentication failed")
                    return False
            else:
                print(f"   ❌ Authentication failed: {response.text}")
                return False
                
    except Exception as e:
        print(f"   ❌ Error testing credentials: {e}")
        return False

def update_env_file(user_id, auth_token):
    """Update the .env file with new credentials"""
    try:
        env_path = ".env"
        
        # Read existing .env file
        env_content = ""
        if os.path.exists(env_path):
            with open(env_path, 'r') as f:
                env_content = f.read()
        
        # Update or add the credentials
        lines = env_content.split('\n') if env_content else []
        updated_lines = []
        
        user_id_updated = False
        auth_token_updated = False
        
        for line in lines:
            if line.startswith('ROCKET_CHAT_USER_ID='):
                updated_lines.append(f'ROCKET_CHAT_USER_ID={user_id}')
                user_id_updated = True
            elif line.startswith('ROCKET_CHAT_AUTH_TOKEN='):
                updated_lines.append(f'ROCKET_CHAT_AUTH_TOKEN={auth_token}')
                auth_token_updated = True
            else:
                updated_lines.append(line)
        
        # Add missing credentials
        if not user_id_updated:
            updated_lines.append(f'ROCKET_CHAT_USER_ID={user_id}')
        if not auth_token_updated:
            updated_lines.append(f'ROCKET_CHAT_AUTH_TOKEN={auth_token}')
        
        # Write back to .env file
        with open(env_path, 'w') as f:
            f.write('\n'.join(updated_lines))
        
        print(f"✅ Updated .env file with new credentials")
        
    except Exception as e:
        print(f"❌ Error updating .env file: {e}")

if __name__ == "__main__":
    async def main():
        print("🧪 Getting Rocket.Chat Admin Credentials")
        print("This script will login to Rocket.Chat and get your admin credentials")
        print()
        
        success = await get_admin_credentials()
        
        if success:
            print("\n🎉 SUCCESS!")
            print("Your admin credentials have been updated in the .env file.")
            print("Now you can test the SSO authentication:")
            print("python test_sso_authentication.py")
        else:
            print("\n❌ FAILED!")
            print("Could not get valid admin credentials.")
            print("Please check:")
            print("1. Your Rocket.Chat server is running")
            print("2. Your username and password are correct")
            print("3. You have admin access to Rocket.Chat")
    
    asyncio.run(main())
