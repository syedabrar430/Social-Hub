import httpx
import os
import time
import json
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
                # First test basic connectivity
                response = await client.get(f"{self.base_url}/api/v1/info")
                if response.status_code != 200:
                    print(f"❌ Rocket.Chat server not accessible: HTTP {response.status_code}")
                    return False
                
                # Then test authentication
                response = await client.get(f"{self.base_url}/api/v1/me", headers=self.headers)
                if response.status_code == 200:
                    return True
                elif response.status_code == 401:
                    print("❌ Rocket.Chat authentication failed - invalid credentials")
                    print("   Please check your ROCKET_CHAT_USER_ID and ROCKET_CHAT_AUTH_TOKEN in .env")
                    return False
                else:
                    print(f"❌ Rocket.Chat authentication failed: HTTP {response.status_code}")
                    return False
        except Exception as e:
            print(f"❌ Rocket.Chat connection failed: {e}")
            return False

    async def ensure_authenticated(self, social_hub_user_email: str = None, social_hub_user_name: str = None, social_hub_user_id: str = None) -> bool:
        """Ensure we have valid authentication credentials for the current Social Hub user"""
        try:
            # If we have Social Hub user info, try to authenticate as that user
            if social_hub_user_email and social_hub_user_name and social_hub_user_id:
                print(f"🔐 Attempting to authenticate Social Hub user: {social_hub_user_email}")
                user_auth_success = await self._authenticate_user(social_hub_user_email, social_hub_user_name, social_hub_user_id)
                if user_auth_success:
                    return True
                else:
                    print(f"⚠️ User authentication failed, falling back to admin credentials")
            
            # Fallback to admin credentials for system operations
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.base_url}/api/v1/me", headers=self.headers)
                if response.status_code == 200:
                    print(f"✅ Rocket.Chat authentication successful with admin credentials")
                    return True
                else:
                    print(f"❌ Rocket.Chat authentication failed: HTTP {response.status_code}")
                    return False
                    
        except Exception as e:
            print(f"Error ensuring authentication: {e}")
            return False

    async def get_user_headers(self, social_hub_user_email: str, social_hub_user_name: str, social_hub_user_id: str, db_session=None) -> Dict:
        """Get user-specific headers for API calls"""
        try:
            # Try to get user credentials from database
            username = None
            password = None
            
            if db_session:
                from database import User
                user = db_session.query(User).filter(User.email == social_hub_user_email).first()
                if user and user.rocket_chat_username and user.rocket_chat_password:
                    username = user.rocket_chat_username
                    password = user.rocket_chat_password
                    print(f"🔐 Found stored credentials for user: {username}")
            
            # Fallback to generating credentials if not found in database
            if not username or not password:
                username = social_hub_user_email.split('@')[0]
                password = f"socialhub_{social_hub_user_id}"
                print(f"🔐 Using generated credentials for user: {username}")
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                # Try to login with username and password
                login_data = {
                    "user": username,
                    "password": password
                }
                
                print(f"🔐 Getting user headers for: {username}")
                response = await client.post(
                    f"{self.base_url}/api/v1/login",
                    json=login_data,
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('status') == 'success':
                        auth_token = result['data']['authToken']
                        user_id = result['data']['userId']
                        print(f"✅ Successfully authenticated user: {username}")
                        return {
                            "X-Auth-Token": auth_token,
                            "X-User-Id": user_id,
                            "Content-Type": "application/json"
                        }
                    else:
                        print(f"❌ Login failed: {result.get('error', 'Unknown error')}")
                        return self.headers  # Fallback to admin headers
                else:
                    print(f"❌ HTTP error: {response.status_code}")
                    return self.headers  # Fallback to admin headers
                    
        except Exception as e:
            print(f"Error getting user headers: {e}")
            return self.headers  # Fallback to admin headers

    async def _authenticate_user(self, email: str, full_name: str, user_id: str) -> bool:
        """Authenticate a user with their Social Hub credentials"""
        try:
            # Generate username and password based on Social Hub data
            username = email.split('@')[0]  # Use email prefix as username
            
            # Use actual password for known users, otherwise generate one
            if username == "ankush8":
                password = "Ankushsocial@2"
            else:
                password = f"socialhub_{user_id}"
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                # Try to login with username and password
                login_data = {
                    "user": username,
                    "password": password
                }
                
                print(f"🔐 Attempting to authenticate user: {username}")
                response = await client.post(
                    f"{self.base_url}/api/v1/login",
                    json=login_data,
                    headers={"Content-Type": "application/json"}
                )
                
                print(f"   Login response status: {response.status_code}")
                if response.status_code == 200:
                    result = response.json()
                    print(f"   Login response: {result}")
                    if result.get('status') == 'success':
                        # Update our headers with the new auth token
                        self.auth_token = result['data']['authToken']
                        self.user_id = result['data']['userId']
                        self.headers = {
                            "X-Auth-Token": self.auth_token,
                            "X-User-Id": self.user_id,
                            "Content-Type": "application/json"
                        }
                        print(f"✅ Successfully authenticated user: {username}")
                        return True
                    else:
                        print(f"❌ Login failed: {result.get('error', 'Unknown error')}")
                        # If login fails, try to create the user
                        return await self._create_and_authenticate_user(email, full_name, user_id)
                else:
                    print(f"❌ HTTP error: {response.status_code}")
                    # If login fails, try to create the user
                    return await self._create_and_authenticate_user(email, full_name, user_id)
                
        except Exception as e:
            print(f"Error authenticating user: {e}")
            return False

    async def _find_user_by_email(self, email: str) -> Optional[str]:
        """Find a user in Rocket.Chat by email address"""
        try:
            # First try to authenticate as admin to search for users
            admin_auth = await self._authenticate_as_admin()
            if not admin_auth:
                return None
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.base_url}/api/v1/users.list",
                    headers=self.headers,
                    params={"query": json.dumps({"emails.address": email})}
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('success') and result.get('users'):
                        user = result['users'][0]
                        return user.get('username')
                return None
                
        except Exception as e:
            print(f"Error finding user by email: {e}")
            return None

    async def _create_and_authenticate_user(self, email: str, full_name: str, user_id: str) -> bool:
        """Create a new user in Rocket.Chat and authenticate them"""
        try:
            # Try to create user without admin authentication first
            username = email.split('@')[0]  # Use email prefix as username
            password = f"socialhub_{user_id}"
            
            user_data = {
                "name": full_name,
                "email": email,
                "password": password,
                "username": username,
                "verified": True
            }
            
            print(f"🔧 Attempting to create user: {username}")
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Try to create user without authentication (if registration is open)
                response = await client.post(
                    f"{self.base_url}/api/v1/users.create",
                    json=user_data,
                    headers={"Content-Type": "application/json"}
                )
                
                print(f"   Create user response status: {response.status_code}")
                if response.status_code == 200:
                    result = response.json()
                    print(f"   Create user response: {result}")
                    if result.get('success'):
                        print(f"✅ User created successfully: {username}")
                        # Now try to authenticate with the newly created user
                        return await self._authenticate_user(email, full_name, user_id)
                    else:
                        print(f"❌ Failed to create user: {result.get('error', 'Unknown error')}")
                        return False
                else:
                    print(f"❌ HTTP error creating user: {response.status_code}")
                    return False
                    
        except Exception as e:
            print(f"Error creating and authenticating user: {e}")
            return False

    async def _create_rocket_chat_user(self, email: str, full_name: str, user_id: str) -> Optional[str]:
        """Create a new user in Rocket.Chat"""
        try:
            # First try to authenticate as admin
            admin_auth = await self._authenticate_as_admin()
            if not admin_auth:
                return None
            
            username = email.split('@')[0]  # Use email prefix as username
            password = f"socialhub_{user_id}"
            
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
                        return username
                    else:
                        print(f"Failed to create user: {result.get('error', 'Unknown error')}")
                        return None
                else:
                    print(f"HTTP error creating user: {response.status_code}")
                    return None
                    
        except Exception as e:
            print(f"Error creating Rocket.Chat user: {e}")
            return None

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

    async def get_or_create_channel(self, channel_name: str = "social-hub-general", user_headers: Dict = None) -> Optional[str]:
        """Get or create a channel"""
        try:
            # Use user-specific headers if provided, otherwise use default headers
            headers = user_headers if user_headers else self.headers
            
            # First try to find existing channel
            channel_id = await self.get_channel_id_by_name(channel_name, "channel", user_headers)
            if channel_id:
                print(f"✅ Found existing channel '{channel_name}' with ID: {channel_id}")
                return channel_id
            
            # If channel doesn't exist, try to create it
            print(f"🔧 Channel '{channel_name}' not found, attempting to create...")
            channel_data = {
                "name": channel_name,
                "type": "c",  # Public channel
                "members": []
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/api/v1/channels.create",
                    json=channel_data,
                    headers=headers
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('success'):
                        channel_id = result.get('channel', {}).get('_id')
                        print(f"✅ Successfully created channel '{channel_name}' with ID: {channel_id}")
                        return channel_id
                    else:
                        error_msg = result.get('error', 'Unknown error')
                        print(f"❌ Failed to create channel: {error_msg}")
                        # If it's a duplicate channel error, try to get the existing channel again
                        if "duplicate" in error_msg.lower():
                            print(f"🔄 Channel exists but wasn't found earlier, trying to get it again...")
                            return await self.get_channel_id_by_name(channel_name, "channel", user_headers)
                        return None
                else:
                    print(f"❌ Failed to create channel - HTTP {response.status_code}: {response.text}")
                    # If it's a duplicate channel error, try to get the existing channel again
                    if response.status_code == 400 and "duplicate" in response.text.lower():
                        print(f"🔄 Channel exists but wasn't found earlier, trying to get it again...")
                        return await self.get_channel_id_by_name(channel_name, "channel", user_headers)
                    return None
                    
        except Exception as e:
            print(f"Exception getting or creating channel: {e}")
            return None

    async def get_channel_id_by_name(self, channel_name: str, channel_type: str = "channel", user_headers: Dict = None) -> Optional[str]:
        """Get channel ID by name"""
        try:
            # Use user-specific headers if provided, otherwise use default headers
            headers = user_headers if user_headers else self.headers
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                if channel_type == "channel":
                    response = await client.get(
                        f"{self.base_url}/api/v1/channels.info",
                        headers=headers,
                        params={"roomName": channel_name}
                    )
                else:
                    response = await client.get(
                        f"{self.base_url}/api/v1/groups.info",
                        headers=headers,
                        params={"roomName": channel_name}
                    )
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('success'):
                        channel_id = result.get('channel', {}).get('_id') or result.get('group', {}).get('_id')
                        if channel_id:
                            print(f"✅ Found channel '{channel_name}' with ID: {channel_id}")
                        return channel_id
                    else:
                        print(f"❌ Channel '{channel_name}' not found: {result.get('error', 'Unknown error')}")
                        return None
                else:
                    print(f"❌ Failed to get channel info - HTTP {response.status_code}: {response.text}")
                    return None
                    
        except Exception as e:
            print(f"Exception getting channel ID: {e}")
            return None

    async def send_message_to_channel(self, channel_name: str, text: str, user_headers: Dict = None, attachments: List[Dict] = None) -> Dict:
        """Send message to a channel with optional file attachments"""
        try:
            # Use user-specific headers if provided, otherwise use default headers
            headers = user_headers if user_headers else self.headers
            
            # If we have user headers, we're already authenticated as that user
            if user_headers:
                print(f"✅ Using user-specific headers for message sending")
            else:
                if not await self.ensure_authenticated():
                    return {"success": False, "error": "Failed to authenticate with Rocket.Chat"}
            
            channel_id = await self.get_or_create_channel(channel_name, user_headers)
            if not channel_id:
                return {"success": False, "error": f"Channel '{channel_name}' not found"}

            # If we have attachments, upload them to Rocket.Chat first
            if attachments and len(attachments) > 0:
                print(f"DEBUG: Uploading {len(attachments)} files to Rocket.Chat")
                uploaded_file_ids = []
                
                for att in attachments:
                    try:
                        print(f"DEBUG: Processing attachment: {att}")
                        # Download the file from our server
                        async with httpx.AsyncClient(timeout=30.0) as client:
                            print(f"DEBUG: Downloading file from: {att.get('url')}")
                            file_response = await client.get(att.get("url", ""))
                            print(f"DEBUG: File download response status: {file_response.status_code}")
                            if file_response.status_code == 200:
                                file_content = file_response.content
                                file_name = att.get("filename", "attachment")
                                file_size = len(file_content)
                                print(f"DEBUG: Downloaded file: {file_name}, size: {file_size} bytes")
                                
                                # Upload to Rocket.Chat using rooms.upload endpoint
                                files = {"file": (file_name, file_content, att.get("type", "application/octet-stream"))}
                                data = {
                                    "msg": text,
                                    "description": f"Uploaded file: {file_name}"
                                }
                                print(f"DEBUG: Uploading to Rocket.Chat: {self.base_url}/api/v1/rooms.upload/{channel_id}")
                                
                                # Remove Content-Type header for multipart upload
                                upload_headers = {k: v for k, v in headers.items() if k.lower() != 'content-type'}
                                print(f"DEBUG: Upload headers: {upload_headers}")
                                
                                async with httpx.AsyncClient(timeout=30.0) as upload_client:
                                    upload_response = await upload_client.post(
                                        f"{self.base_url}/api/v1/rooms.upload/{channel_id}",
                                        files=files,
                                        data=data,
                                        headers=upload_headers
                                    )
                                    print(f"DEBUG: Rocket.Chat upload response status: {upload_response.status_code}")
                                    print(f"DEBUG: Rocket.Chat upload response: {upload_response.text}")
                                    
                                    if upload_response.status_code == 200:
                                        upload_result = upload_response.json()
                                        if upload_result.get('success'):
                                            uploaded_file_ids.append(upload_result.get('file', {}).get('_id'))
                                            print(f"DEBUG: Successfully uploaded file {file_name} to Rocket.Chat")
                                        else:
                                            print(f"DEBUG: Failed to upload file {file_name}: {upload_result.get('error')}")
                                    else:
                                        print(f"DEBUG: Upload failed with status {upload_response.status_code}: {upload_response.text}")
                            else:
                                print(f"DEBUG: Failed to download file from {att.get('url')}")
                    except Exception as e:
                        print(f"DEBUG: Error uploading file {att.get('filename')}: {e}")
                
                # If we successfully uploaded files, return success
                if uploaded_file_ids:
                    return {"success": True, "message": f"Message with {len(uploaded_file_ids)} file(s) sent successfully"}
                else:
                    # Fall back to sending text message without files
                    print("DEBUG: No files uploaded successfully, sending text message only")
            
            # Send text message (either no attachments or fallback)
            message_data = {
                "roomId": channel_id,
                "text": text
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/api/v1/chat.postMessage",
                    json=message_data,
                    headers=headers
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
            
            # Convert Unicode emojis to colon format
            emoji_map = {
                "👍": ":thumbsup:",
                "❤️": ":heart:",
                "😂": ":joy:",
                "😮": ":open_mouth:",
                "😢": ":cry:",
                "😡": ":rage:",
                "🔥": ":fire:",
                "💯": ":100:"
            }
            
            # Use colon format if available, otherwise use the emoji as-is
            colon_emoji = emoji_map.get(emoji, emoji)
            
            reaction_data = {
                "messageId": message_id,
                "emoji": colon_emoji
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/api/v1/chat.react",
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
            
            # Convert Unicode emojis to colon format
            emoji_map = {
                "👍": ":thumbsup:",
                "❤️": ":heart:",
                "😂": ":joy:",
                "😮": ":open_mouth:",
                "😢": ":cry:",
                "😡": ":rage:",
                "🔥": ":fire:",
                "💯": ":100:"
            }
            
            # Use colon format if available, otherwise use the emoji as-is
            colon_emoji = emoji_map.get(emoji, emoji)
            
            reaction_data = {
                "messageId": message_id,
                "emoji": colon_emoji
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/api/v1/chat.react",
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

    async def send_thread_message(self, channel_name: str, parent_message_id: str, text: str, user_headers: Dict = None) -> Dict:
        """Send a message to a thread"""
        try:
            # Use user-specific headers if provided, otherwise use default headers
            headers = user_headers if user_headers else self.headers
            
            if not await self.ensure_authenticated():
                return {"success": False, "error": "Authentication failed"}
            
            channel_id = await self.get_or_create_channel(channel_name, user_headers)
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
                    headers=headers
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

    async def create_or_get_dm_room(self, username: str, user_headers: Dict = None) -> Optional[str]:
        """Create or get DM room with a user"""
        try:
            # Use user-specific headers if provided, otherwise use default headers
            headers = user_headers if user_headers else self.headers
            
            if not await self.ensure_authenticated():
                return None
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/api/v1/im.create",
                    json={"username": username},
                    headers=headers
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

    async def get_dm_messages(self, username: str, count: int = 50, user_headers: Dict = None) -> List[Dict]:
        """Get direct messages with a specific user"""
        try:
            # Use user-specific headers if provided, otherwise use default headers
            headers = user_headers if user_headers else self.headers
            
            # If we have user headers, we're already authenticated as that user
            if user_headers:
                print(f"✅ Using user-specific headers for DM messages")
            else:
                if not await self.ensure_authenticated():
                    return []
            
            room_id = await self.create_or_get_dm_room(username, user_headers)
            if not room_id:
                return []
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/api/v1/im.messages",
                    headers=headers,
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

    async def send_direct_message(self, username: str, text: str, user_headers: Dict = None) -> Dict:
        """Send a direct message to a specific user"""
        try:
            # Use user-specific headers if provided, otherwise use default headers
            headers = user_headers if user_headers else self.headers
            
            # If we have user headers, we're already authenticated as that user
            if user_headers:
                print(f"✅ Using user-specific headers for DM sending")
            else:
                if not await self.ensure_authenticated():
                    return {"success": False, "error": "Failed to authenticate with Rocket.Chat"}
            
            room_id = await self.create_or_get_dm_room(username, user_headers)
            if not room_id:
                return {"success": False, "error": f"Could not get DM room with {username}"}
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/api/v1/chat.sendMessage",
                    headers=headers,
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
            print("🔍 Fetching real Rocket.Chat rooms data")
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                # Get user subscriptions (channels, groups, DMs)
                response = await client.get(f"{self.base_url}/api/v1/subscriptions.get", headers=self.headers)
                
                if response.status_code != 200:
                    print(f"❌ Failed to get subscriptions: HTTP {response.status_code}")
                    return {'channels': [], 'groups': [], 'direct_messages': []}
                
                subscriptions = response.json()
                if not subscriptions.get('success'):
                    print(f"❌ API error: {subscriptions.get('error', 'Unknown error')}")
                    return {'channels': [], 'groups': [], 'direct_messages': []}
                
                # Parse the subscriptions
                channels = []
                groups = []
                direct_messages = []
                
                for sub in subscriptions.get('update', []):
                    room_data = {
                        'id': sub.get('rid'),
                        'name': sub.get('name'),
                        'display_name': sub.get('fname', sub.get('name')),
                        'unread_count': sub.get('unread', 0),
                        'type': sub.get('t'),
                        'open': sub.get('open', True)
                    }
                    
                    if sub.get('t') == 'c':  # Channel
                        room_data['type'] = 'channel'  # Convert 'c' to full type name
                        channels.append(room_data)
                    elif sub.get('t') == 'p':  # Private group
                        room_data['type'] = 'private_group'  # Convert 'p' to full type name
                        groups.append(room_data)
                    elif sub.get('t') == 'd':  # Direct message
                        room_data['other_user'] = sub.get('fname', sub.get('name'))
                        room_data['type'] = 'direct_message'  # Convert 'd' to full type name
                        direct_messages.append(room_data)
                
                rooms = {
                    'channels': channels,
                    'groups': groups,
                    'direct_messages': direct_messages
                }
                
                print(f"✅ Fetched real rooms: {len(channels)} channels, {len(groups)} groups, {len(direct_messages)} DMs")
                return rooms
                        
        except Exception as e:
            print(f"Exception getting user rooms: {e}")
            return {'channels': [], 'groups': [], 'direct_messages': []}

# Create global instance
rocket_client = RocketChatClient()
