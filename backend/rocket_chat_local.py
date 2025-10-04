import httpx
import os
from typing import Dict, List, Optional
from dotenv import load_dotenv

load_dotenv()

class RocketChatClient:
    def __init__(self):
        self.base_url = os.getenv("ROCKET_CHAT_URL", "https://open.rocket.chat").rstrip("/")
        self.user_id = os.getenv("ROCKET_CHAT_USER_ID", "")
        self.auth_token = os.getenv("ROCKET_CHAT_AUTH_TOKEN", "")
        
        self.headers = {
            "X-Auth-Token": self.auth_token,
            "X-User-Id": self.user_id,
            "Content-Type": "application/json"
        }

    async def test_connection(self) -> bool:
        """Test connection to Rocket.Chat"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.base_url}/api/v1/me", headers=self.headers)
                return response.status_code == 200
        except Exception:
            return False

    async def get_or_create_channel(self, channel_name: str = "social-hub-general") -> Optional[str]:
        """Get existing channel ID by name"""
        try:
            print(f"DEBUG: Looking for channel: {channel_name}")
            async with httpx.AsyncClient() as client:
                # Search through channel list
                response = await client.get(
                    f"{self.base_url}/api/v1/channels.list",
                    headers=self.headers
                )
                
                print(f"DEBUG: Channel list response: {response.status_code}")
                if response.status_code == 200:
                    channels = response.json()
                    print(f"DEBUG: Found {len(channels.get('channels', []))} channels")
                    available_channels = []
                    for channel in channels.get('channels', []):
                        available_channels.append(channel.get('name'))
                        if channel.get('name') == channel_name:
                            print(f"DEBUG: Found matching channel ID: {channel.get('_id')}")
                            return channel.get('_id')
                    print(f"DEBUG: Available channels: {available_channels}")
                    print(f"DEBUG: Channel '{channel_name}' not found in available channels")
                return None
        except Exception as e:
            print(f"DEBUG: Exception in get_or_create_channel: {e}")
            return None

    async def send_message_to_channel(self, channel_name: str, text: str) -> Dict:
        """Send message to a channel"""
        try:
            # Get channel ID first
            channel_id = await self.get_or_create_channel(channel_name)
            if not channel_id:
                return {"success": False, "error": f"Channel '{channel_name}' not found"}

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/api/v1/chat.postMessage",
                    json={
                        "roomId": channel_id,
                        "text": text
                    },
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    return {"success": False, "error": response.text}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def get_channel_messages(self, channel_name: str, count: int = 50) -> List[Dict]:
        """Get messages from a channel"""
        try:
            print(f"DEBUG: Getting messages for channel: {channel_name}")
            # Get channel ID first
            channel_id = await self.get_or_create_channel(channel_name)
            if not channel_id:
                print(f"DEBUG: No channel ID found for channel: {channel_name}")
                return []

            print(f"DEBUG: Found channel ID: {channel_id}")
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/api/v1/channels.history?roomId={channel_id}&count={count}",
                    headers=self.headers
                )
                
                print(f"DEBUG: Channel history response: {response.status_code}")
                if response.status_code == 200:
                    data = response.json()
                    messages = data.get("messages", [])
                    print(f"DEBUG: Found {len(messages)} messages in channel")
                    return messages
                else:
                    print(f"DEBUG: Error getting channel history: {response.text}")
                    return []
        except Exception as e:
            print(f"DEBUG: Exception in get_channel_messages: {e}")
            return []

    async def add_reaction(self, message_id: str, emoji: str) -> Dict:
        """Add reaction to a message"""
        try:
            # Convert unicode emoji to colon format for Rocket.Chat API
            emoji_map = {
                "👍": ":+1:",
                "❤️": ":heart:",
                "😂": ":joy:",
                "😮": ":open_mouth:",
                "😢": ":cry:",
                "😡": ":rage:",
                "🎉": ":tada:",
                "🔥": ":fire:",
                "👏": ":clap:",
                "💯": ":100:",
                "✨": ":sparkles:",
                "🚀": ":rocket:"
            }
            rocket_emoji = emoji_map.get(emoji, emoji)
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/api/v1/chat.react",
                    json={
                        "messageId": message_id,
                        "emoji": rocket_emoji
                    },
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    return {"success": True, "data": response.json()}
                else:
                    error_detail = f"Status: {response.status_code}, Response: {response.text}"
                    return {"success": False, "error": error_detail}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def remove_reaction(self, message_id: str, emoji: str) -> Dict:
        """Remove reaction from a message"""
        try:
            # Convert unicode emoji to colon format for Rocket.Chat API
            emoji_map = {
                "👍": ":+1:",
                "❤️": ":heart:",
                "😂": ":joy:",
                "😮": ":open_mouth:",
                "😢": ":cry:",
                "😡": ":rage:",
                "🎉": ":tada:",
                "🔥": ":fire:",
                "👏": ":clap:",
                "💯": ":100:",
                "✨": ":sparkles:",
                "🚀": ":rocket:"
            }
            rocket_emoji = emoji_map.get(emoji, emoji)
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/api/v1/chat.react",
                    json={
                        "messageId": message_id,
                        "emoji": rocket_emoji,
                        "shouldReact": False
                    },
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    return {"success": True, "data": response.json()}
                else:
                    error_detail = f"Status: {response.status_code}, Response: {response.text}"
                    return {"success": False, "error": error_detail}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def get_thread_messages(self, parent_message_id: str) -> List[Dict]:
        """Get thread messages for a parent message"""
        try:
            print(f"DEBUG: Requesting thread messages for parent ID: {parent_message_id}")
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/api/v1/chat.getThreadMessages"
                params = {"tmid": parent_message_id}
                print(f"DEBUG: Thread request URL: {url}")
                print(f"DEBUG: Thread request params: {params}")
                print(f"DEBUG: Thread request headers: {self.headers}")
                
                response = await client.get(url, params=params, headers=self.headers)
                
                print(f"DEBUG: Thread API response status: {response.status_code}")
                print(f"DEBUG: Thread API response text: {response.text}")
                
                if response.status_code == 200:
                    data = response.json()
                    messages = data.get('messages', [])
                    print(f"DEBUG: Found {len(messages)} thread messages")
                    return messages
                else:
                    print(f"Failed to get thread messages: {response.status_code} - {response.text}")
                    return []
        except Exception as e:
            print(f"Exception getting thread messages: {e}")
            import traceback
            traceback.print_exc()
            return []

    async def send_thread_message(self, channel_name: str, parent_message_id: str, text: str) -> Dict:
        """Send a message in a thread"""
        try:
            # First get the channel ID
            channel_id = await self.get_or_create_channel(channel_name)
            if not channel_id:
                return {"success": False, "error": f"Channel {channel_name} not found"}
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/api/v1/chat.sendMessage",
                    json={
                        "message": {
                            "rid": channel_id,
                            "msg": text,
                            "tmid": parent_message_id  # Thread message ID
                        }
                    },
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    return {"success": True, "message": response.json().get("message")}
                else:
                    error_detail = f"Status: {response.status_code}, Response: {response.text}"
                    return {"success": False, "error": error_detail}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def send_file_to_channel(self, channel_name: str, file_path: str, filename: str) -> Dict:
        """Send file to Rocket.Chat channel"""
        try:
            # First get the room ID
            room_id = await self.get_or_create_channel(channel_name)
            if not room_id:
                return {"success": False, "error": f"Room {channel_name} not found"}

            async with httpx.AsyncClient(timeout=30.0) as client:
                # Prepare file upload
                with open(file_path, 'rb') as f:
                    files = {
                        'file': (filename, f, 'image/*')
                    }
                    data = {
                        'roomId': room_id,
                        'description': f'Image uploaded via Social Hub'
                    }
                    
                    # Special headers for file upload (remove Content-Type)
                    upload_headers = {
                        "X-Auth-Token": self.auth_token,
                        "X-User-Id": self.user_id,
                    }
                    
                    response = await client.post(
                        f"{self.base_url}/api/v1/rooms.upload/{room_id}",
                        files=files,
                        data=data,
                        headers=upload_headers
                    )
                
                if response.status_code == 200:
                    result = response.json()
                    return {
                        "success": True, 
                        "message": result.get("message", {}),
                        "file_id": result.get("message", {}).get("file", {}).get("_id")
                    }
                else:
                    error_detail = f"Status: {response.status_code}, Response: {response.text}"
                    return {"success": False, "error": error_detail}
                    
        except Exception as e:
            return {"success": False, "error": str(e)}

# Global instance
rocket_client = RocketChatClient()