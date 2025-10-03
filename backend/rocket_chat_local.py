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
            async with httpx.AsyncClient() as client:
                # Search through channel list
                response = await client.get(
                    f"{self.base_url}/api/v1/channels.list",
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    channels = response.json()
                    for channel in channels.get('channels', []):
                        if channel.get('name') == channel_name:
                            return channel.get('_id')
                return None
        except Exception:
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
            # Get channel ID first
            channel_id = await self.get_or_create_channel(channel_name)
            if not channel_id:
                return []

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/api/v1/channels.history?roomId={channel_id}&count={count}",
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data.get("messages", [])
                else:
                    return []
        except Exception:
            return []

# Global instance
rocket_client = RocketChatClient()