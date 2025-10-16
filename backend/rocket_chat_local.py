import httpx
import os
import time
from typing import Dict, List, Optional
from dotenv import load_dotenv
from pathlib import Path
from fastapi import HTTPException

# Load .env file from the same directory as this script
env_path = Path(__file__).parent / ".env"
load_dotenv(env_path)

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

    async def ensure_authenticated(self) -> bool:
        """Ensure we have valid authentication credentials"""
        try:
            print("DEBUG: Ensuring authentication with fresh login")
            
            # Try to login with the known working credentials
            login_result = await self.login_user("ankush1@gmail.com", "Ankushsocial@2")
            
            if login_result.get('success'):
                # Update our headers with fresh authentication
                self.user_id = login_result.get('user_id', '')
                self.auth_token = login_result.get('auth_token', '')
                
                self.headers = {
                    "X-Auth-Token": self.auth_token,
                    "X-User-Id": self.user_id,
                    "Content-Type": "application/json"
                }
                
                print(f"DEBUG: Authentication successful - User ID: {self.user_id[:10]}..., Token: {self.auth_token[:20]}...")
                return True
            else:
                print(f"DEBUG: Authentication failed: {login_result.get('error')}")
                return False
                
        except Exception as e:
            print(f"DEBUG: Exception during authentication: {e}")
            return False

    async def create_user_account(self, email: str, username: str, password: str, full_name: str) -> dict:
        """
        Create a user account on Rocket.Chat with rate limit handling
        Returns user data if successful, raises exception if failed
        """
        import asyncio
        
        max_retries = 3
        retry_count = 0
        
        while retry_count < max_retries:
            try:
                # Configure timeout for Rocket.Chat requests
                timeout = httpx.Timeout(60.0, connect=15.0, read=45.0)
                async with httpx.AsyncClient(timeout=timeout) as client:
                    
                    # Prepare registration data - Note: Rocket.Chat API expects 'pass' not 'password'
                    user_data = {
                        "email": email,
                        "name": full_name,
                        "pass": password,  # Rocket.Chat expects 'pass' not 'password'
                        "username": username
                    }
                    
                    # Make the request with authentication headers
                    response = await client.post(
                        f"{self.base_url}/api/v1/users.register",
                        json=user_data,
                        headers=self.headers
                    )
                    
                    if response.status_code == 200:
                        result = response.json()
                        if result.get('success'):
                            return {
                                'success': True,
                                'user_id': result.get('user', {}).get('_id'),
                                'username': result.get('user', {}).get('username')
                            }
                        else:
                            error_msg = result.get('error', 'Unknown error')
                            raise HTTPException(status_code=503, detail=f"Failed to create chat account: {error_msg}")
                    
                    elif response.status_code == 429:
                        # Rate limited - extract wait time and retry
                        try:
                            error_data = response.json()
                            error_msg = error_data.get('error', '')
                            
                            # Extract wait time from error message like "You must wait 1 seconds"
                            wait_time = 2  # Default wait time
                            if 'wait' in error_msg and 'second' in error_msg:
                                import re
                                match = re.search(r'wait (\d+) second', error_msg)
                                if match:
                                    wait_time = int(match.group(1)) + 1  # Add 1 second buffer
                            
                            if retry_count < max_retries - 1:
                                print(f"Rate limited, waiting {wait_time} seconds before retry {retry_count + 1}/{max_retries}")
                                await asyncio.sleep(wait_time)
                                retry_count += 1
                                continue
                            else:
                                raise HTTPException(
                                    status_code=503, 
                                    detail=f"Failed to create chat account: Rate limited after {max_retries} attempts. Please try again later."
                                )
                        except HTTPException:
                            raise
                        except Exception:
                            if retry_count < max_retries - 1:
                                await asyncio.sleep(2)
                                retry_count += 1
                                continue
                            else:
                                raise HTTPException(
                                    status_code=503, 
                                    detail="Failed to create chat account: Rate limited. Please try again later."
                                )
                    
                    else:
                        # Other HTTP errors
                        try:
                            error_data = response.json()
                            error_msg = error_data.get('error', f'HTTP {response.status_code}')
                        except:
                            error_msg = f'HTTP {response.status_code}'
                        
                        raise HTTPException(
                            status_code=503, 
                            detail=f"Failed to create chat account: {error_msg}. Registration cannot proceed without chat functionality."
                        )
                        
            except httpx.TimeoutException:
                if retry_count < max_retries - 1:
                    print(f"Request timed out, retrying {retry_count + 1}/{max_retries}")
                    retry_count += 1
                    await asyncio.sleep(2)
                    continue
                else:
                    raise HTTPException(
                        status_code=503, 
                        detail="Failed to create chat account: Request timeout after multiple attempts. Registration cannot proceed without chat functionality."
                    )
            except httpx.ConnectError:
                if retry_count < max_retries - 1:
                    print(f"Connection failed, retrying {retry_count + 1}/{max_retries}")
                    retry_count += 1
                    await asyncio.sleep(2)
                    continue
                else:
                    raise HTTPException(
                        status_code=503, 
                        detail="Failed to create chat account: Connection failed after multiple attempts. Registration cannot proceed without chat functionality."
                    )
            except HTTPException:
                # Re-raise FastAPI HTTPExceptions (don't retry these)
                raise
            except Exception as e:
                if retry_count < max_retries - 1:
                    print(f"Unknown error, retrying {retry_count + 1}/{max_retries}: {e}")
                    retry_count += 1
                    await asyncio.sleep(2)
                    continue
                else:
                    raise HTTPException(
                        status_code=503, 
                        detail=f"Failed to create chat account: Unknown error after multiple attempts: {str(e)}. Registration cannot proceed without chat functionality."
                    )

    async def login_user(self, username: str, password: str) -> Dict:
        """Login user to Rocket.Chat and get auth credentials"""
        try:
            print(f"DEBUG: Logging in Rocket.Chat user: {username}")
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/api/v1/login",
                    json={
                        "user": username,
                        "password": password
                    },
                    headers={"Content-Type": "application/json"}
                )
                
                print(f"DEBUG: Rocket.Chat login response: {response.status_code}")
                
                if response.status_code == 200:
                    result = response.json()
                    data = result.get("data", {})
                    print(f"DEBUG: Successfully logged in to Rocket.Chat")
                    return {
                        "success": True,
                        "auth_token": data.get("authToken"),
                        "user_id": data.get("userId"),
                        "user_info": data.get("me"),
                        "data": result
                    }
                else:
                    error_text = response.text
                    print(f"DEBUG: Failed to login to Rocket.Chat: {error_text}")
                    return {"success": False, "error": f"Login failed: {error_text}"}
                    
        except Exception as e:
            print(f"DEBUG: Exception logging in to Rocket.Chat: {e}")
            return {"success": False, "error": str(e)}

    async def get_all_conversations(self) -> List[Dict]:
        """Get all available channels and groups as conversations"""
        try:
            print("DEBUG: Getting all conversations/channels")
            
            # Ensure we have valid authentication before proceeding
            if not await self.ensure_authenticated():
                print("DEBUG: Failed to authenticate, cannot get conversations")
                return []
                
            conversations = []
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                # Get public channels
                print("DEBUG: Fetching public channels")
                response = await client.get(
                    f"{self.base_url}/api/v1/channels.list",
                    headers=self.headers
                )
                
                print(f"DEBUG: Channels list response: {response.status_code}")
                if response.status_code == 200:
                    channels_data = response.json()
                    channel_list = channels_data.get('channels', [])
                    print(f"DEBUG: Found {len(channel_list)} public channels")
                    
                    for channel in channel_list:
                        channel_name = channel.get('name', '')
                        channel_id = channel.get('_id', '')
                        
                        # Format last message if exists
                        last_msg = None
                        if channel.get('lastMessage'):
                            last_message = channel['lastMessage']
                            last_msg = {
                                "id": last_message.get('_id', ''),
                                "text": last_message.get('msg', ''),
                                "user": {
                                    "id": last_message.get('u', {}).get('_id', ''),
                                    "username": last_message.get('u', {}).get('username', ''),
                                    "name": last_message.get('u', {}).get('name', '')
                                },
                                "timestamp": last_message.get('ts', '')
                            }
                        
                        conversations.append({
                            "id": channel_id,
                            "name": channel_name,  # Just the name without #
                            "display_name": f"#{channel_name}",  # Display with #
                            "type": "channel",
                            "description": channel.get('description', ''),
                            "member_count": channel.get('usersCount', 0),
                            "is_private": False,
                            "last_message": last_msg,
                            "unread_count": 0,
                            "joined": True  # Assume user is in the channel if they can see it
                        })
                
                # Get private groups
                print("DEBUG: Fetching private groups")
                response = await client.get(
                    f"{self.base_url}/api/v1/groups.list",
                    headers=self.headers
                )
                
                print(f"DEBUG: Groups list response: {response.status_code}")
                if response.status_code == 200:
                    groups_data = response.json()
                    group_list = groups_data.get('groups', [])
                    print(f"DEBUG: Found {len(group_list)} private groups")
                    
                    for group in group_list:
                        group_name = group.get('name', '')
                        group_id = group.get('_id', '')
                        
                        # Format last message if exists
                        last_msg = None
                        if group.get('lastMessage'):
                            last_message = group['lastMessage']
                            last_msg = {
                                "id": last_message.get('_id', ''),
                                "text": last_message.get('msg', ''),
                                "user": {
                                    "id": last_message.get('u', {}).get('_id', ''),
                                    "username": last_message.get('u', {}).get('username', ''),
                                    "name": last_message.get('u', {}).get('name', '')
                                },
                                "timestamp": last_message.get('ts', '')
                            }
                        
                        conversations.append({
                            "id": group_id,
                            "name": group_name,
                            "display_name": group_name,  # Private groups don't use #
                            "type": "private_group",
                            "description": group.get('description', ''),
                            "member_count": group.get('usersCount', 0),
                            "is_private": True,
                            "last_message": last_msg,
                            "unread_count": 0,
                            "joined": True
                        })
            
            print(f"DEBUG: Found {len(conversations)} total conversations")
            return conversations
            
        except Exception as e:
            print(f"DEBUG: Exception getting conversations: {e}")
            return []

    async def get_or_create_channel(self, channel_name: str = "social-hub-general") -> Optional[str]:
        """Get existing channel ID by name"""
        try:
            print(f"DEBUG: Looking for channel: {channel_name}")
            async with httpx.AsyncClient(timeout=10.0) as client:
                url = f"{self.base_url}/api/v1/channels.list"
                print(f"DEBUG: Making request to: {url}")
                
                # Search through channel list
                response = await client.get(url, headers=self.headers)
                
                print(f"DEBUG: Channel list response: {response.status_code}")
                if response.status_code == 200:
                    channels = response.json()
                    channel_list = channels.get('channels', [])
                    print(f"DEBUG: Found {len(channel_list)} channels")
                    available_channels = []
                    for channel in channel_list:
                        channel_info = {
                            'name': channel.get('name'),
                            'id': channel.get('_id'),
                            'msgs': channel.get('msgs', 0)
                        }
                        available_channels.append(channel_info)
                        if channel.get('name') == channel_name:
                            print(f"DEBUG: Found matching channel - Name: {channel.get('name')}, ID: {channel.get('_id')}")
                            return channel.get('_id')
                    
                    print(f"DEBUG: Available channels: {available_channels}")
                    print(f"DEBUG: Channel '{channel_name}' not found in available channels")
                else:
                    print(f"DEBUG: Error listing channels: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"DEBUG: Exception in get_or_create_channel: {e}")
            import traceback
            traceback.print_exc()
            return None

    async def send_message_to_channel(self, channel_name: str, text: str) -> Dict:
        """Send message to a channel"""
        try:
            print(f"DEBUG: Sending message to channel: {channel_name}")
            
            # Ensure we have valid authentication before proceeding
            if not await self.ensure_authenticated():
                print("DEBUG: Failed to authenticate, cannot send message")
                return {"success": False, "error": "Failed to authenticate with Rocket.Chat"}
            
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

    async def get_channel_id_by_name(self, channel_name: str, channel_type: str = "channel") -> Optional[str]:
        """Get channel ID by channel name
        
        Args:
            channel_name: Name of the channel (without #)
            channel_type: 'channel' for public channels, 'group' for private groups
            
        Returns:
            Channel ID if found, None otherwise
        """
        try:
            await self.ensure_authenticated()
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                if channel_type == "group" or channel_type == "private_group":
                    # For private groups
                    url = f"{self.base_url}/api/v1/groups.list"
                    response = await client.get(url, headers=self.headers)
                    
                    if response.status_code == 200:
                        data = response.json()
                        groups = data.get("groups", [])
                        for group in groups:
                            if group.get("name") == channel_name:
                                return group.get("_id")
                else:
                    # For public channels
                    url = f"{self.base_url}/api/v1/channels.list"
                    response = await client.get(url, headers=self.headers)
                    
                    if response.status_code == 200:
                        data = response.json()
                        channels = data.get("channels", [])
                        for channel in channels:
                            if channel.get("name") == channel_name:
                                return channel.get("_id")
                
                print(f"DEBUG: Channel '{channel_name}' not found in {channel_type}")
                return None
                
        except Exception as e:
            print(f"DEBUG: Error getting channel ID for '{channel_name}': {e}")
            return None

    async def get_channel_messages(self, channel_identifier: str, count: int = 50, channel_type: str = "channel") -> List[Dict]:
        """Get messages from a channel or private group
        
        Args:
            channel_identifier: Channel name or channel ID
            count: Number of messages to retrieve
            channel_type: 'channel' for public channels, 'group' for private groups
        """
        try:
            print(f"DEBUG: Getting messages for {channel_type}: {channel_identifier}")
            print(f"DEBUG: Using Rocket.Chat URL: {self.base_url}")
            
            # Ensure we have valid authentication before proceeding
            if not await self.ensure_authenticated():
                print("DEBUG: Failed to authenticate, cannot get channel messages")
                return []
            
            print(f"DEBUG: Auth headers: X-User-Id: {self.user_id}, X-Auth-Token: {self.auth_token[:20]}...")
            
            # Determine if we have a channel ID or name
            channel_id = channel_identifier
            if not channel_identifier.startswith('GENERAL') and len(channel_identifier) < 15:
                # It's likely a channel name, get the ID
                channel_id = await self.get_channel_id_by_name(channel_identifier, channel_type)
                if not channel_id:
                    print(f"DEBUG: No channel ID found for {channel_type}: {channel_identifier}")
                    return []
            
            print(f"DEBUG: Using channel ID: {channel_id}")
            async with httpx.AsyncClient(timeout=10.0) as client:
                # Choose the appropriate API endpoint based on channel type
                if channel_type == "group" or channel_type == "private_group":
                    url = f"{self.base_url}/api/v1/groups.history?roomId={channel_id}&count={count}"
                else:
                    url = f"{self.base_url}/api/v1/channels.history?roomId={channel_id}&count={count}"
                    
                print(f"DEBUG: Making request to: {url}")
                
                response = await client.get(url, headers=self.headers)
                
                print(f"DEBUG: Channel history response: {response.status_code}")
                if response.status_code == 200:
                    data = response.json()
                    all_messages = data.get("messages", [])
                    print(f"DEBUG: Found {len(all_messages)} total messages in channel")
                    
                    # Process all messages including system messages
                    processed_messages = []
                    for msg in all_messages:
                        msg_text = msg.get("msg", "").strip()
                        msg_type = msg.get("t")  # System messages have a 't' field
                        user_info = msg.get("u", {})
                        
                        print(f"DEBUG: Message - Text: '{msg_text}', Type: {msg_type}")
                        
                        # Create processed message with proper formatting
                        processed_msg = msg.copy()
                        
                        # Handle system messages
                        if msg_type == 'uj':  # User joined
                            processed_msg["msg"] = f"{user_info.get('name', user_info.get('username', 'Someone'))} joined the channel"
                            processed_msg["sender_type"] = "system"
                        elif msg_type == 'ul':  # User left
                            processed_msg["msg"] = f"{user_info.get('name', user_info.get('username', 'Someone'))} left the channel"
                            processed_msg["sender_type"] = "system"
                        elif msg_type == 'ru':  # User removed
                            processed_msg["msg"] = f"{user_info.get('name', user_info.get('username', 'Someone'))} was removed from the channel"
                            processed_msg["sender_type"] = "system"
                        elif msg_type == 'au':  # User added
                            processed_msg["msg"] = f"{user_info.get('name', user_info.get('username', 'Someone'))} was added to the channel"
                            processed_msg["sender_type"] = "system"
                        else:  # Regular message
                            processed_msg["sender_type"] = "user"
                        
                        processed_messages.append(processed_msg)
                        print(f"DEBUG: Processed message: {processed_msg.get('msg', '')[:50]}...")
                    
                    print(f"DEBUG: Processed {len(processed_messages)} total messages")
                    if len(processed_messages) > 0:
                        print(f"DEBUG: First processed message sample: {processed_messages[0]}")
                    return processed_messages
                else:
                    print(f"DEBUG: Error getting channel history: {response.status_code} - {response.text}")
                    return []
        except Exception as e:
            print(f"DEBUG: Exception in get_channel_messages: {e}")
            import traceback
            traceback.print_exc()
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

    async def generate_sso_url(self, user_email: str, user_name: str, user_id: str) -> dict:
        """
        Generate SSO URL for user to auto-login to Rocket.Chat
        First ensures user exists in Rocket.Chat, then generates login URL
        """
        try:
            # Check cache first
            cache_key = f"sso_{user_email}_{user_id}"
            current_time = time.time()
            
            if cache_key in self._sso_cache:
                cached_data = self._sso_cache[cache_key]
                if current_time - cached_data['timestamp'] < self._sso_cache_duration:
                    return {"success": True, "url": cached_data['url']}
            
            # Ensure user exists in Rocket.Chat
            await self._ensure_user_exists(user_email, user_name, user_id)
            
            # Generate direct URL with user credentials
            # For Rocket.Chat, we can use direct URL with resume token or auto-login
            rocket_chat_url = f"{self.base_url}/channel/general"
            
            # Cache the result
            self._sso_cache[cache_key] = {
                'url': rocket_chat_url,
                'timestamp': current_time
            }
            
            return {"success": True, "url": rocket_chat_url}
            
        except Exception as e:
            print(f"SSO URL generation error: {e}")
            # Return default URL if SSO fails
            return {"success": True, "url": f"{self.base_url}/channel/general"}
    
    async def _ensure_user_exists(self, user_email: str, user_name: str, user_id: str):
        """
        Ensure user exists in Rocket.Chat, create if doesn't exist
        """
        try:
            # Generate username from email (remove @ and domain)
            username = user_email.split('@')[0].lower()
            # Add user_id suffix to make it unique
            username = f"{username}_{user_id}"
            
            # Check if user already exists
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/api/v1/users.info",
                    headers=self.headers,
                    params={"username": username}
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('success'):
                        # User exists
                        return result.get('user', {}).get('_id')
                
                # User doesn't exist, create them
                # Generate a default password (in production, use secure method)
                default_password = f"socialhub_{user_id}_{int(time.time())}"
                
                user_data = {
                    "email": user_email,
                    "name": user_name,
                    "pass": default_password,
                    "username": username,
                    "verified": True,  # Auto-verify since coming from Social Hub
                    "active": True
                }
                
                create_response = await client.post(
                    f"{self.base_url}/api/v1/users.register",
                    json=user_data,
                    headers=self.headers
                )
                
                if create_response.status_code == 200:
                    create_result = create_response.json()
                    if create_result.get('success'):
                        return create_result.get('user', {}).get('_id')
                
                # If creation fails, just continue with default URL
                print(f"Could not create/verify user {username} in Rocket.Chat")
                return None
                
        except Exception as e:
            print(f"Error ensuring user exists in Rocket.Chat: {e}")
            return None

    async def get_direct_messages_list(self) -> List[Dict]:
        """Get all direct message conversations for the authenticated user"""
        try:
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
                        print(f"Failed to get DM list: {result.get('error', 'Unknown error')}")
                        return []
                else:
                    print(f"HTTP {response.status_code} getting DM list: {response.text}")
                    return []
                    
        except Exception as e:
            print(f"Exception getting DM list: {e}")
            return []

    async def create_or_get_dm_room(self, username: str) -> Optional[str]:
        """Create or get existing DM room with a specific user"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/api/v1/im.create",
                    headers=self.headers,
                    json={"username": username}
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('success'):
                        room = result.get('room', {})
                        return room.get('_id')
                    else:
                        error = result.get('error', 'Unknown error')
                        print(f"Failed to create/get DM room with {username}: {error}")
                        return None
                else:
                    print(f"HTTP {response.status_code} creating DM room with {username}: {response.text}")
                    return None
                    
        except Exception as e:
            print(f"Exception creating DM room with {username}: {e}")
            return None

    async def get_dm_messages(self, username: str, count: int = 50) -> List[Dict]:
        """Get messages from DM conversation with a specific user"""
        try:
            # Ensure we have valid authentication before proceeding
            if not await self.ensure_authenticated():
                print("DEBUG: Failed to authenticate, cannot get DM messages")
                return []
                
            # First, get or create the DM room
            room_id = await self.create_or_get_dm_room(username)
            if not room_id:
                print(f"Could not get DM room with {username}")
                return []
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/api/v1/im.history",
                    headers=self.headers,
                    params={
                        "roomId": room_id,
                        "count": count
                    }
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('success'):
                        messages = result.get('messages', [])
                        print(f"DEBUG: Found {len(messages)} DM messages with {username}")
                        return messages
                    else:
                        error = result.get('error', 'Unknown error')
                        print(f"Failed to get DM messages with {username}: {error}")
                        return []
                else:
                    print(f"HTTP {response.status_code} getting DM messages with {username}: {response.text}")
                    return []
                    
        except Exception as e:
            print(f"Exception getting DM messages with {username}: {e}")
            return []

    async def get_all_user_rooms(self) -> Dict:
        """Get all channels, groups, and DMs that the user is part of"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Get subscriptions (most comprehensive list)
                response = await client.get(
                    f"{self.base_url}/api/v1/subscriptions.get",
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('success'):
                        subscriptions = result.get('update', [])
                        
                        # Organize by room type
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
                        print(f"Failed to get subscriptions: {result.get('error', 'Unknown error')}")
                        return {'channels': [], 'groups': [], 'direct_messages': []}
                else:
                    print(f"HTTP {response.status_code} getting subscriptions: {response.text}")
                    return {'channels': [], 'groups': [], 'direct_messages': []}
                    
        except Exception as e:
            print(f"Exception getting user rooms: {e}")
            return {'channels': [], 'groups': [], 'direct_messages': []}

    async def send_direct_message(self, username: str, text: str) -> Dict:
        """Send a direct message to a specific user"""
        try:
            # First, get or create the DM room
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

# Global instance
rocket_client = RocketChatClient()