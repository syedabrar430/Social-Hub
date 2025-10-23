#!/usr/bin/env python3
"""
Script to update Rocket.Chat credentials in .env file
"""

import os
import re
from pathlib import Path

def update_env_file(user_id, auth_token):
    """Update the .env file with new Rocket.Chat credentials"""
    env_path = Path(__file__).parent / ".env"
    
    if not env_path.exists():
        print("❌ .env file not found")
        return False
    
    # Read current content
    with open(env_path, 'r') as f:
        content = f.read()
    
    # Update the credentials
    content = re.sub(
        r'ROCKET_CHAT_USER_ID=.*',
        f'ROCKET_CHAT_USER_ID={user_id}',
        content
    )
    
    content = re.sub(
        r'ROCKET_CHAT_AUTH_TOKEN=.*',
        f'ROCKET_CHAT_AUTH_TOKEN={auth_token}',
        content
    )
    
    # Write back to file
    with open(env_path, 'w') as f:
        f.write(content)
    
    print("✅ .env file updated successfully")
    return True

def main():
    print("🔧 Rocket.Chat Credentials Updater")
    print("="*40)
    
    print("\nTo get new credentials:")
    print("1. Go to http://10.68.0.49:30082")
    print("2. Log in to your account")
    print("3. Go to Administration → My Account")
    print("4. Note your User ID")
    print("5. Go to Personal Access Tokens")
    print("6. Create a new token")
    print()
    
    user_id = input("Enter your User ID: ").strip()
    auth_token = input("Enter your Auth Token: ").strip()
    
    if not user_id or not auth_token:
        print("❌ User ID and Auth Token are required")
        return
    
    if update_env_file(user_id, auth_token):
        print("\n✅ Credentials updated successfully!")
        print("🔄 Please restart your backend server for changes to take effect")
    else:
        print("❌ Failed to update credentials")

if __name__ == "__main__":
    main()
