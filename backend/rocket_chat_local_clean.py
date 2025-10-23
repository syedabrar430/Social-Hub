import httpx
import os
import time
from typing import Dict, List, Optional
from dotenv import load_dotenv
from pathlib import Path

# Load .env file from the same directory as this script
env_path = Path(__file__).parent / ".env"
load_dotenv(env_path)

class RocketChatClient:
    def __init__(self):
        self.base_url = os.getenv("ROCKET_CHAT_URL", "http://10.68.0.49:30082").rstrip("/")
        self.user_id = os.getenv("ROCKET_CHAT_USER_ID", "")
        self.auth_token = os.getenv("ROCKET_CHAT_AUTH_TOKEN", "")
        
        self.headers = {
            "X-Auth-Token": self.auth_token,
            "X-User-Id": self.user_id,
            "Content-Type": "application/json"
        }
        
        # Backend caching to reduce API calls to remote server
        self._conversations_cache = None
        self._conversations_cache_time = 0
        self._cache_duration = 30  # Cache conversations for 30 seconds
        
        # Rate limiting protection
        self._last_api_call = 0
        self._min_call_interval = 10  # Minimum 10 seconds between API calls
        
        # SSO cache for user sessions
        self._sso_cache = {}
        self._sso_cache_duration = 300  # 5 minutes

    async def test_connection(self) -> bool:
        """Test connection to Rocket.Chat"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.base_url}/api/v1/me", headers=self.headers)
                return response.status_code == 200
        except Exception:
            return False

    async def ensure_authenticated(self, social_hub_user_email: str = None, social_hub_user_name: str = None, social_hub_user_id: str = None) -> bool:
        """Ensure we have valid authentication credentials for the current Social Hub user"""
        try:
            if social_hub_user_email and social_hub_user_name and social_hub_user_id:
                # Try to generate SSO URL for the user
                sso_url = await self.generate_sso_url(social_hub_user_email, social_hub_user_name, social_hub_user_id)
                if sso_url:
                    return True
            
            # Fall back to admin credentials
            return await self._authenticate_as_admin()
            
        except Exception as e:
            print(f"Error ensuring authentication: {e}")
            return False

    async def _authenticate_as_admin(self) -> bool:
        """Authenticate using admin credentials"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.base_url}/api/v1/me", headers=self.headers)
                return response.status_code == 200
        except Exception:
            return False

    async def create_user_account(self, email: str, username: str, password: str, full_name: str) -> dict:
        """Create a new user account in Rocket.Chat"""
        try:
            user_data = {
                "name": full_name,
                "email": email,
                "password": password,
                "username": username,
                "verified": True
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/api/v1/users.create",
                    json=user_data,
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('success'):
                        return {"success": True, "user": result.get('user')}
                    else:
                        return {"success": False, "error": result.get('error', 'Unknown error')}
                else:
                    return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}
                    
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def get_or_create_channel(self, channel_name: str = "social-hub-general") -> Optional[str]:
        """Get or create a channel"""
        try:
            # First try to find existing channel
            channel_id = await self.get_channel_id_by_name(channel_name)
            if channel_id:
                return channel_id
            
            # Create new channel if not found
            channel_data = {
                "name": channel_name,
                "type": "c",  # Public channel
                "members": []
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/api/v1/channels.create",
                    json=channel_data,
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('success'):
                        return result.get('channel', {}).get('_id')
                    else:
                        print(f"Failed to create channel: {result.get('error', 'Unknown error')}")
                        return None
                else:
                    print(f"Failed to create channel - HTTP {response.status_code}: {response.text}")
                    return None
                    
        except Exception as e:
            print(f"Exception getting or creating channel: {e}")
            return None

    async def get_channel_id_by_name(self, channel_name: str, channel_type: str = "channel") -> Optional[str]:
        """Get channel ID by name"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                if channel_type == "channel":
                    response = await client.get(
                        f"{self.base_url}/api/v1/channels.info",
                        headers=self.headers,
                        params={"roomName": channel_name}
                    )
                else:
                    response = await client.get(
                        f"{self.base_url}/api/v1/groups.info",
                        headers=self.headers,
                        params={"roomName": channel_name}
                    )
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('success'):
                        return result.get('channel', {}).get('_id') or result.get('group', {}).get('_id')
                    else:
                        return None
                else:
                    return None
                    
        except Exception as e:
            print(f"Exception getting channel ID: {e}")
            return None

    async def send_message_to_channel(self, channel_name: str, text: str) -> Dict:
        """Send message to a channel"""
        try:
            if not await self.ensure_authenticated():
                return {"success": False, "error": "Failed to authenticate with Rocket.Chat"}
            
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
                    result = response.json()
                    if result.get('success'):
                        return {"success": True, "message": result.get('message')}
                    else:
                        return {"success": False, "error": result.get('error', 'Unknown error')}
                else:
                    return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}
                    
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def get_channel_messages(self, channel_identifier: str, count: int = 50, channel_type: str = "channel") -> List[Dict]:
        """Get messages from a channel"""
        try:
            if not await self.ensure_authenticated():
                return []
            
            room_id = await self.get_channel_id_by_name(channel_identifier, channel_type)
            if not room_id:
                return []
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/api/v1/channels.messages",
                    headers=self.headers,
                    params={
                        "roomId": room_id,
                        "count": count
                    }
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('success'):
                        return result.get('messages', [])
                    else:
                        return []
                else:
                    return []
                    
        except Exception as e:
            print(f"Exception getting channel messages: {e}")
            return []

    async def add_reaction(self, message_id: str, emoji: str) -> Dict:
        """Add reaction to a message"""
        try:
            if not await self.ensure_authenticated():
                return {"success": False, "error": "Authentication failed"}
            
            reaction_data = {
                "messageId": message_id,
                "emoji": emoji
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/api/v1/reactions.set",
                    json=reaction_data,
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('success'):
                        return {"success": True}
                    else:
                        return {"success": False, "error": result.get('error', 'Unknown error')}
                else:
                    return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}
                    
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def remove_reaction(self, message_id: str, emoji: str) -> Dict:
        """Remove reaction from a message"""
        try:
            if not await self.ensure_authenticated():
                return {"success": False, "error": "Authentication failed"}
            
            reaction_data = {
                "messageId": message_id,
                "emoji": emoji
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/api/v1/reactions.unset",
                    json=reaction_data,
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('success'):
                        return {"success": True}
                    else:
                        return {"success": False, "error": result.get('error', 'Unknown error')}
                else:
                    return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}
                    
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def get_thread_messages(self, parent_message_id: str) -> List[Dict]:
        """Get thread messages for a parent message"""
        try:
            if not await self.ensure_authenticated():
                return []
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/api/v1/chat.getThreadMessages",
                    headers=self.headers,
                    params={
                        "tmid": parent_message_id,
                        "count": 50
                    }
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('success'):
                        return result.get('messages', [])
                    else:
                        return []
                else:
                    return []
                    
        except Exception as e:
            print(f"Exception getting thread messages: {e}")
            return []

    async def send_thread_message(self, channel_name: str, parent_message_id: str, text: str) -> Dict:
        """Send a message to a thread"""
        try:
            if not await self.ensure_authenticated():
                return {"success": False, "error": "Authentication failed"}
            
            channel_id = await self.get_or_create_channel(channel_name)
            if not channel_id:
                return {"success": False, "error": f"Channel '{channel_name}' not found"}
            
            message_data = {
                "roomId": channel_id,
                "text": text,
                "tmid": parent_message_id
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/api/v1/chat.postMessage",
                    json=message_data,
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('success'):
                        return {"success": True, "message": result.get('message')}
                    else:
                        return {"success": False, "error": result.get('error', 'Unknown error')}
                else:
                    return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}
                    
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def generate_sso_url(self, user_email: str, user_name: str, user_id: str) -> dict:
        """Generate SSO URL for user"""
        try:
            # Ensure user exists in Rocket.Chat
            rocket_chat_user_id = await self._ensure_user_exists(user_email, user_name, user_id)
            if not rocket_chat_user_id:
                return {"success": False, "error": "Failed to ensure user exists"}
            
            # Generate login token
            login_token = await self._generate_login_token(rocket_chat_user_id, user_email)
            if not login_token:
                return {"success": False, "error": "Failed to generate login token"}
            
            # Generate SSO URL
            rocket_chat_url = f"{self.base_url}/home"
            
            # Cache the result
            cache_key = f"{user_email}_{user_name}_{user_id}"
            self._sso_cache[cache_key] = {
                "url": rocket_chat_url,
                "token": login_token,
                "timestamp": time.time()
            }
            
            return {
                "success": True,
                "url": rocket_chat_url,
                "token": login_token
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def _ensure_user_exists(self, user_email: str, user_name: str, user_id: str):
        """Ensure user exists in Rocket.Chat, use existing user if registration is disabled"""
        try:
            if not await self._authenticate_as_admin():
                return None
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Get current user info (admin user)
                response = await client.get(
                    f"{self.base_url}/api/v1/me",
                    headers=self.headers
                )
                
                admin_user_id = None
                if response.status_code == 200:
                    result = response.json()
                    if result.get('success') or '_id' in result:
                        admin_user_id = result.get('_id')
                        return admin_user_id
                
                # Try to find user by email
                users_response = await client.get(
                    f"{self.base_url}/api/v1/users.list",
                    headers=self.headers,
                    params={"count": 100}
                )
                
                if users_response.status_code == 200:
                    users_result = users_response.json()
                    users = users_result.get('users', [])
                    
                    # Look for user with matching email
                    for user in users:
                        email_info = user.get('emails', [{}])[0]
                        if email_info.get('address') == user_email:
                            user_id_found = user.get('_id')
                            return user_id_found
                
                return admin_user_id
                
        except Exception as e:
            print(f"Error ensuring user exists in Rocket.Chat: {e}")
            return None

    async def _generate_login_token(self, rocket_chat_user_id: str, user_email: str) -> str:
        """Generate a login token for the user to enable SSO"""
        try:
            # Since user registration is disabled, we'll use the admin token
            # This allows the user to access Rocket.Chat through the admin account
            return self.auth_token
                
        except Exception as e:
            print(f"Error generating login token: {e}")
            return None

    async def get_direct_messages_list(self) -> List[Dict]:
        """Get list of direct message conversations"""
        try:
            if not await self.ensure_authenticated():
                return []
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/api/v1/im.list",
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('success'):
                        return result.get('ims', [])
                    else:
                        return []
                else:
                    return []
                    
        except Exception as e:
            print(f"Exception getting direct messages list: {e}")
            return []

    async def create_or_get_dm_room(self, username: str) -> Optional[str]:
        """Create or get DM room with a user"""
        try:
            if not await self.ensure_authenticated():
                return None
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/api/v1/im.create",
                    json={"username": username},
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('success'):
                        return result.get('room', {}).get('_id')
                    else:
                        return None
                else:
                    return None
                    
        except Exception as e:
            print(f"Exception creating or getting DM room: {e}")
            return None

    async def get_dm_messages(self, username: str, count: int = 50) -> List[Dict]:
        """Get direct messages with a specific user"""
        try:
            if not await self.ensure_authenticated():
                return []
            
            room_id = await self.create_or_get_dm_room(username)
            if not room_id:
                return []
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/api/v1/im.messages",
                    headers=self.headers,
                    params={
                        "roomId": room_id,
                        "count": count
                    }
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('success'):
                        return result.get('messages', [])
                    else:
                        return []
                else:
                    return []
                    
        except Exception as e:
            print(f"Exception getting DM messages with {username}: {e}")
            return []

    async def send_direct_message(self, username: str, text: str) -> Dict:
        """Send a direct message to a specific user"""
        try:
            room_id = await self.create_or_get_dm_room(username)
            if not room_id:
                return {"success": False, "error": f"Could not get DM room with {username}"}
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/api/v1/chat.sendMessage",
                    headers=self.headers,
                    json={
                        "message": {
                            "rid": room_id,
                            "msg": text
                        }
                    }
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('success'):
                        return {"success": True, "message": result.get('message', {})}
                    else:
                        error = result.get('error', 'Unknown error')
                        return {"success": False, "error": error}
                else:
                    return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}
                    
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def get_all_conversations(self) -> List[Dict]:
        """Get all conversations (channels, groups, DMs)"""
        try:
            if not await self.ensure_authenticated():
                return []
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/api/v1/subscriptions.get",
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('success'):
                        return result.get('update', [])
                    else:
                        return []
                else:
                    return []
                    
        except Exception as e:
            print(f"Exception getting all conversations: {e}")
            return []

    async def get_all_user_rooms(self) -> Dict:
        """Get all channels, groups, and DMs that the user is part of"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/api/v1/subscriptions.get",
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('success'):
                        subscriptions = result.get('update', [])
                        
                        rooms = {
                            'channels': [],
                            'groups': [],
                            'direct_messages': []
                        }
                        
                        for sub in subscriptions:
                            room_type = sub.get('t', '')
                            room_info = {
                                'id': sub.get('rid', ''),
                                'name': sub.get('name', ''),
                                'display_name': sub.get('fname', sub.get('name', '')),
                                'unread': sub.get('unread', 0),
                                'type': room_type,
                                'open': sub.get('open', False)
                            }
                            
                            if room_type == 'c':  # Public channel
                                rooms['channels'].append(room_info)
                            elif room_type == 'p':  # Private group
                                rooms['groups'].append(room_info)
                            elif room_type == 'd':  # Direct message
                                rooms['direct_messages'].append(room_info)
                        
                        return rooms
                    else:
                        return {'channels': [], 'groups': [], 'direct_messages': []}
                else:
                    return {'channels': [], 'groups': [], 'direct_messages': []}
                    
        except Exception as e:
            print(f"Exception getting user rooms: {e}")
            return {'channels': [], 'groups': [], 'direct_messages': []}

# Create global instance
rocket_client = RocketChatClient()
