#!/usr/bin/env python3
import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv
import httpx

# Load environment variables
env_path = Path(__file__).parent / ".env"
load_dotenv(env_path)

async def test_rocket_chat():
    base_url = os.getenv("ROCKET_CHAT_URL", "http://10.68.0.49:30082")
    user_id = os.getenv("ROCKET_CHAT_USER_ID", "")
    auth_token = os.getenv("ROCKET_CHAT_AUTH_TOKEN", "")
    
    headers = {
        "X-Auth-Token": auth_token,
        "X-User-Id": user_id,
        "Content-Type": "application/json"
    }
    
    print(f"Testing Rocket.Chat connection...")
    print(f"URL: {base_url}")
    print(f"User ID: {user_id}")
    print(f"Auth Token: {auth_token[:20]}...")
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Test basic connection
            print("\n1. Testing basic connection...")
            response = await client.get(f"{base_url}/api/v1/me", headers=headers)
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                me_data = response.json()
                print(f"   Connected as: {me_data.get('username')}")
            else:
                print(f"   Error: {response.text}")
            
            # Test channels list
            print("\n2. Testing channels list...")
            response = await client.get(f"{base_url}/api/v1/channels.list", headers=headers)
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                channels_data = response.json()
                channels = channels_data.get('channels', [])
                print(f"   Found {len(channels)} channels:")
                for channel in channels:
                    print(f"     - {channel.get('name')} (ID: {channel.get('_id')}, Messages: {channel.get('msgs', 0)})")
                
                # Test getting messages from general channel
                general_channel = None
                for channel in channels:
                    if channel.get('name') == 'general':
                        general_channel = channel
                        break
                
                if general_channel:
                    print(f"\n3. Testing messages from general channel...")
                    channel_id = general_channel.get('_id')
                    response = await client.get(
                        f"{base_url}/api/v1/channels.history?roomId={channel_id}&count=20",
                        headers=headers
                    )
                    print(f"   Status: {response.status_code}")
                    if response.status_code == 200:
                        history_data = response.json()
                        messages = history_data.get('messages', [])
                        print(f"   Found {len(messages)} messages:")
                        for i, msg in enumerate(messages):
                            user_data = msg.get('u', {})
                            msg_type = msg.get('t', 'normal')  # message type
                            timestamp = msg.get('ts', {})
                            print(f"     {i+1}. User: {user_data.get('username', 'Unknown')}")
                            print(f"        Type: {msg_type}")
                            print(f"        Message: '{msg.get('msg', 'NO_MESSAGE')}'")
                            print(f"        Timestamp: {timestamp}")
                            print(f"        Full msg keys: {list(msg.keys())}")
                            print("")
                    else:
                        print(f"   Error: {response.text}")
                else:
                    print("\n3. No 'general' channel found!")
            else:
                print(f"   Error: {response.text}")
                
    except Exception as e:
        print(f"Exception: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_rocket_chat())