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
                username = f"{social_hub_user_email.split('@')[0]}_{social_hub_user_id}"
                # Special case for test user
                if username == "test_1" and social_hub_user_email == "test@example.com":
                    username = "test"
                    password = "testpassword"
                    print(f"🔐 Using test user credentials: {username}")
                else:
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
            username = f"{email.split('@')[0]}_{user_id}"  # Use email prefix + user ID as username
            
            # Use actual password for known users, otherwise generate one
            if username == "ankush8_8":  # Updated to match new username format
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
            username = f"{email.split('@')[0]}_{user_id}"  # Use email prefix + user ID as username
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
            
            username = f"{email.split('@')[0]}_{user_id}"  # Use email prefix + user ID as username
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
        """Get channel ID by name or ID"""
        try:
            # Use user-specific headers if provided, otherwise use default headers
            headers = user_headers if user_headers else self.headers
            
            # Check if the input is already a Rocket.Chat ID (24 character hex string)
            import re
            if re.match(r'^[a-f0-9]{24}$', channel_name):
                print(f"🔍 Input appears to be a Rocket.Chat ID: {channel_name}")
                # If it's already an ID, return it directly
                return channel_name
            
            # Normalize group name for Rocket.Chat format
            if channel_type == "group":
                normalized_name = channel_name.lower().replace(' ', '-').replace('_', '-')
                normalized_name = re.sub(r'[^a-z0-9-]', '', normalized_name)
                normalized_name = normalized_name.strip('-')
                print(f"🔍 Looking for group with normalized name: {normalized_name}")
            else:
                normalized_name = channel_name
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                if channel_type == "channel":
                    response = await client.get(
                        f"{self.base_url}/api/v1/channels.info",
                        headers=headers,
                        params={"roomName": normalized_name}
                    )
                else:
                    response = await client.get(
                        f"{self.base_url}/api/v1/groups.info",
                        headers=headers,
                        params={"roomName": normalized_name}
                    )
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('success'):
                        channel_id = result.get('channel', {}).get('_id') or result.get('group', {}).get('_id')
                        if channel_id:
                            print(f"✅ Found {channel_type} '{normalized_name}' with ID: {channel_id}")
                        return channel_id
                    else:
                        print(f"❌ {channel_type.title()} '{normalized_name}' not found: {result.get('error', 'Unknown error')}")
                        return None
                else:
                    print(f"❌ Failed to get {channel_type} info - HTTP {response.status_code}: {response.text}")
                    return None
                    
        except Exception as e:
            print(f"Exception getting {channel_type} ID: {e}")
            return None

    async def create_private_group(self, group_name: str, members: List[str] = None, user_headers: Dict = None) -> Dict:
        """Create a private group in Rocket.Chat"""
        try:
            if not user_headers:
                print("❌ User headers required for creating private groups")
                return {"success": False, "error": "User authentication required"}
            
            # Convert group name to valid Rocket.Chat format (lowercase, no spaces, special chars)
            valid_name = group_name.lower().replace(' ', '-').replace('_', '-')
            # Remove any other special characters except hyphens
            import re
            valid_name = re.sub(r'[^a-z0-9-]', '', valid_name)
            # Ensure it doesn't start or end with hyphen
            valid_name = valid_name.strip('-')
            
            group_data = {
                "name": valid_name,
                "type": "p",  # Private group
                "members": members or []
            }
            
            print(f"🔧 Creating private group '{group_name}' with members: {members}")
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/api/v1/groups.create",
                    headers=user_headers,
                    json=group_data
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('success'):
                        group_id = result.get('group', {}).get('_id')
                        print(f"✅ Successfully created private group '{group_name}' with ID: {group_id}")
                        return {
                            "success": True,
                            "group_id": group_id,
                            "group": result.get('group', {})
                        }
                    else:
                        error_msg = result.get('error', 'Unknown error')
                        print(f"❌ Failed to create private group: {error_msg}")
                        return {"success": False, "error": error_msg}
                else:
                    print(f"❌ Failed to create private group - HTTP {response.status_code}: {response.text}")
                    return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}
                    
        except Exception as e:
            print(f"Exception creating private group: {e}")
            return {"success": False, "error": str(e)}

    async def add_member_to_group(self, group_id: str, username: str, user_headers: Dict = None) -> Dict:
        """Add a member to a Rocket.Chat group"""
        try:
            if not user_headers:
                print("❌ User headers required for adding members to groups")
                return {"success": False, "error": "User authentication required"}
            
            member_data = {
                "roomId": group_id,
                "username": username
            }
            
            print(f"🔧 Adding member '{username}' to group '{group_id}'")
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/api/v1/groups.invite",
                    headers=user_headers,
                    json=member_data
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('success'):
                        print(f"✅ Successfully added member '{username}' to group")
                        return {"success": True, "group": result.get('group', {})}
                    else:
                        error_msg = result.get('error', 'Unknown error')
                        print(f"❌ Failed to add member: {error_msg}")
                        return {"success": False, "error": error_msg}
                else:
                    print(f"❌ Failed to add member - HTTP {response.status_code}: {response.text}")
                    return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}
                    
        except Exception as e:
            print(f"Exception adding member to group: {e}")
            return {"success": False, "error": str(e)}

    async def send_message_to_channel(self, channel_name: str, text: str, user_headers: Dict = None, attachments: List[Dict] = None, channel_type: str = "channel") -> Dict:
        """Send message to a channel or group with optional file attachments"""
        try:
            # Use user-specific headers if provided, otherwise use default headers
            headers = user_headers if user_headers else self.headers
            
            # If we have user headers, we're already authenticated as that user
            if user_headers:
                print(f"✅ Using user-specific headers for message sending")
            else:
                if not await self.ensure_authenticated():
                    return {"success": False, "error": "Failed to authenticate with Rocket.Chat"}
            
            # Get channel/group ID based on type
            if channel_type == "group":
                channel_id = await self.get_channel_id_by_name(channel_name, "group", user_headers)
            else:
                channel_id = await self.get_or_create_channel(channel_name, user_headers)
            
            if not channel_id:
                return {"success": False, "error": f"{channel_type.title()} '{channel_name}' not found"}

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
                
                print(f"DEBUG: Rocket.Chat postMessage response status: {response.status_code}")
                print(f"DEBUG: Rocket.Chat postMessage response text: {response.text}")
                
                if response.status_code == 200:
                    result = response.json()
                    print(f"DEBUG: Rocket.Chat response: {result}")
                    if result.get('success'):
                        return {"success": True, "message": result.get('message')}
                    else:
                        error_msg = result.get('error', 'Unknown error')
                        print(f"❌ Rocket.Chat error: '{error_msg}' (type: {type(error_msg)})")
                        return {"success": False, "error": error_msg}
                else:
                    error_text = response.text
                    print(f"❌ Rocket.Chat HTTP error {response.status_code}: {error_text}")
                    return {"success": False, "error": f"HTTP {response.status_code}: {error_text}"}
                    
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def get_channel_messages(self, channel_identifier: str, count: int = 50, channel_type: str = "channel", user_headers: Dict = None) -> List[Dict]:
        """Get messages from a channel with pagination to fetch all messages"""
        try:
            # Use user-specific headers if provided, otherwise use admin headers
            headers = user_headers if user_headers else self.headers
            if user_headers:
                print("✅ Using user-specific headers for message retrieval")
            else:
                if not await self.ensure_authenticated():
                    return []
                print("⚠️ Using admin headers for message retrieval (fallback)")
            
            room_id = await self.get_channel_id_by_name(channel_identifier, channel_type, user_headers)
            if not room_id:
                return []
            
            all_messages = []
            offset = 0
            batch_size = 100  # Fetch in batches of 100
            
            # Choose the correct API endpoint based on channel type
            api_endpoint = "/api/v1/groups.messages" if channel_type == "group" else "/api/v1/channels.messages"
            print(f"DEBUG: Using API endpoint {api_endpoint} for {channel_type}: {channel_identifier} (room_id: {room_id})")
            
            async with httpx.AsyncClient(timeout=60.0) as client:
                while True:
                    response = await client.get(
                        f"{self.base_url}{api_endpoint}",
                        headers=headers,
                        params={
                            "roomId": room_id,
                            "count": batch_size,
                            "offset": offset
                        }
                    )
                    
                    if response.status_code == 200:
                        result = response.json()
                        if result.get('success'):
                            messages = result.get('messages', [])
                            if not messages:
                                # No more messages
                                break
                            all_messages.extend(messages)
                            
                            # Check if we got fewer messages than requested (last batch)
                            if len(messages) < batch_size:
                                break
                            
                            offset += batch_size
                        else:
                            break
                    else:
                        print(f"Failed to fetch messages: HTTP {response.status_code}")
                        break
            
            print(f"✅ Fetched {len(all_messages)} total messages from {channel_identifier}")
            return all_messages
                    
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

    async def add_reaction_with_headers(self, message_id: str, emoji: str, user_headers: Dict) -> Dict:
        """Add reaction to a message using user-specific headers"""
        try:
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
                    headers=user_headers
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

    async def remove_reaction_with_headers(self, message_id: str, emoji: str, user_headers: Dict) -> Dict:
        """Remove reaction from a message using user-specific headers"""
        try:
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
                    headers=user_headers
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

    async def get_thread_messages(self, parent_message_id: str, user_headers: Dict = None) -> List[Dict]:
        """Get thread messages for a parent message"""
        try:
            print(f"DEBUG: Getting thread messages for parent message: {parent_message_id}")
            print(f"DEBUG: user_headers provided: {user_headers is not None}")
            
            # Use user-specific headers if provided, otherwise use admin headers
            if user_headers:
                headers = user_headers
                print(f"DEBUG: Using user-specific headers for thread messages")
                print(f"DEBUG: User headers X-User-Id: {headers.get('X-User-Id', 'N/A')}")
            else:
                if not await self.ensure_authenticated():
                    return []
                headers = self.headers
                print(f"DEBUG: Using admin headers for thread messages")
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/api/v1/chat.getThreadMessages",
                    headers=headers,
                    params={
                        "tmid": parent_message_id,
                        "count": 50
                    }
                )
                
                print(f"DEBUG: Thread messages API response status: {response.status_code}")
                
                if response.status_code == 200:
                    result = response.json()
                    print(f"DEBUG: Thread messages API response: {result}")
                    if result.get('success'):
                        messages = result.get('messages', [])
                        print(f"DEBUG: Found {len(messages)} thread messages")
                        return messages
                    else:
                        print(f"DEBUG: Thread messages API failed: {result.get('error', 'Unknown error')}")
                        return []
                else:
                    print(f"DEBUG: Thread messages API error: HTTP {response.status_code}")
                    print(f"DEBUG: Error response: {response.text}")
                    return []
                    
        except Exception as e:
            print(f"Exception getting thread messages: {e}")
            return []

    async def send_thread_message(self, channel_name: str, parent_message_id: str, text: str, user_headers: Dict = None) -> Dict:
        """Send a message to a thread"""
        try:
            print(f"DEBUG: send_thread_message called with channel_name: {channel_name}, parent_message_id: {parent_message_id}, text: {text}")
            
            # Use user-specific headers if provided, otherwise use default headers
            headers = user_headers if user_headers else self.headers
            
            if not await self.ensure_authenticated():
                return {"success": False, "error": "Authentication failed"}
            
            # For thread messages, we need to determine if it's a channel or group
            # Try group first (most common for private groups), then channel
            print(f"DEBUG: Looking for group with name: {channel_name}")
            channel_id = await self.get_channel_id_by_name(channel_name, "group", user_headers)
            if not channel_id:
                print(f"DEBUG: Group not found, trying channel with name: {channel_name}")
                channel_id = await self.get_channel_id_by_name(channel_name, "channel", user_headers)
            
            if not channel_id:
                print(f"DEBUG: Neither group nor channel found for: {channel_name}")
                return {"success": False, "error": f"Channel/Group '{channel_name}' not found"}
            
            print(f"DEBUG: Found channel/group ID: {channel_id}")
            
            message_data = {
                "roomId": channel_id,
                "text": text,
                "tmid": parent_message_id,
                "tshow": True  # Show thread message in main channel as well
            }
            
            print(f"DEBUG: Sending thread message with data: {message_data}")
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/api/v1/chat.postMessage",
                    json=message_data,
                    headers=headers
                )
                
                print(f"DEBUG: Rocket.Chat response status: {response.status_code}")
                print(f"DEBUG: Rocket.Chat response text: {response.text}")
                
                if response.status_code == 200:
                    result = response.json()
                    print(f"DEBUG: Rocket.Chat result: {result}")
                    if result.get('success'):
                        return {"success": True, "message": result.get('message')}
                    else:
                        error_msg = result.get('error', 'Unknown error')
                        print(f"❌ Rocket.Chat error: {error_msg}")
                        return {"success": False, "error": error_msg}
                else:
                    error_text = response.text
                    print(f"❌ Rocket.Chat HTTP error {response.status_code}: {error_text}")
                    return {"success": False, "error": f"HTTP {response.status_code}: {error_text}"}
                    
        except Exception as e:
            print(f"Exception in send_thread_message: {e}")
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
        """Get direct messages with a specific user with pagination to fetch all messages"""
        try:
            # Must use user-specific headers - no fallback to admin
            if not user_headers:
                print("❌ No user headers provided for DM messages - cannot retrieve DMs without user authentication")
                return []
            
            # Use user-specific headers
            headers = user_headers
            print(f"✅ Using user-specific headers for DM messages")
            
            room_id = await self.create_or_get_dm_room(username, user_headers)
            if not room_id:
                print(f"❌ Could not get DM room ID with {username}")
                return []
            
            all_messages = []
            offset = 0
            batch_size = 100  # Fetch in batches of 100
            
            async with httpx.AsyncClient(timeout=60.0) as client:
                while True:
                    response = await client.get(
                        f"{self.base_url}/api/v1/im.messages",
                        headers=headers,
                        params={
                            "roomId": room_id,
                            "count": batch_size,
                            "offset": offset
                        }
                    )
                    
                    print(f"DEBUG: DM messages API response status: {response.status_code}")
                    
                    if response.status_code == 200:
                        result = response.json()
                        if result.get('success'):
                            messages = result.get('messages', [])
                            if not messages:
                                # No more messages
                                break
                            all_messages.extend(messages)
                            
                            # Check if we got fewer messages than requested (last batch)
                            if len(messages) < batch_size:
                                break
                            
                            offset += batch_size
                        else:
                            break
                    else:
                        print(f"DEBUG: DM messages API error: {response.status_code} - {response.text[:200]}")
                        break
            
            print(f"✅ Fetched {len(all_messages)} total DM messages with {username}")
            return all_messages
                    
        except Exception as e:
            print(f"Exception getting DM messages with {username}: {e}")
            import traceback
            traceback.print_exc()
            return []

    async def send_direct_message(self, username: str, text: str, user_headers: Dict = None, attachments: List[Dict] = None) -> Dict:
        """Send a direct message to a specific user with optional file attachments"""
        try:
            # Must use user-specific headers - no fallback to admin
            if not user_headers:
                print("❌ No user headers provided for DM sending - cannot send DMs without user authentication")
                return {"success": False, "error": "User authentication required"}
            
            # Use user-specific headers
            headers = user_headers
            print(f"✅ Using user-specific headers for DM sending")
            
            room_id = await self.create_or_get_dm_room(username, user_headers)
            if not room_id:
                return {"success": False, "error": f"Could not get DM room with {username}"}
            
            # If we have attachments, upload them to Rocket.Chat first
            if attachments and len(attachments) > 0:
                print(f"DEBUG: Uploading {len(attachments)} files to Rocket.Chat for DM")
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
                                print(f"DEBUG: Uploading to Rocket.Chat DM: {self.base_url}/api/v1/rooms.upload/{room_id}")
                                
                                # Remove Content-Type header for multipart upload
                                upload_headers = {k: v for k, v in headers.items() if k.lower() != 'content-type'}
                                print(f"DEBUG: Upload headers: {upload_headers}")
                                
                                async with httpx.AsyncClient(timeout=30.0) as upload_client:
                                    upload_response = await upload_client.post(
                                        f"{self.base_url}/api/v1/rooms.upload/{room_id}",
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
                                            print(f"DEBUG: Successfully uploaded file {file_name} to Rocket.Chat DM")
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
            print(f"Error sending DM: {e}")
            import traceback
            traceback.print_exc()
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

    async def recreate_group_in_rocketchat(self, group_name: str, members: List[str], user_headers: Dict = None) -> Dict:
        """Recreate a group in Rocket.Chat with the specified members"""
        try:
            print(f"🔧 Recreating group '{group_name}' in Rocket.Chat with members: {members}")
            
            if not user_headers:
                print("❌ User headers required for creating groups")
                return {"success": False, "error": "User authentication required"}
            
            # Convert group name to valid Rocket.Chat format
            valid_name = group_name.lower().replace(' ', '-').replace('_', '-')
            import re
            valid_name = re.sub(r'[^a-z0-9-]', '', valid_name)
            valid_name = valid_name.strip('-')
            
            group_data = {
                "name": valid_name,
                "type": "p",  # Private group
                "members": members
            }
            
            print(f"🔧 Creating group '{valid_name}' with members: {members}")
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/api/v1/groups.create",
                    headers=user_headers,
                    json=group_data
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('success'):
                        group_id = result.get('group', {}).get('_id')
                        print(f"✅ Successfully recreated group '{group_name}' with ID: {group_id}")
                        return {
                            "success": True,
                            "group_id": group_id,
                            "group": result.get('group', {}),
                            "new_name": valid_name
                        }
                    else:
                        error_msg = result.get('error', 'Unknown error')
                        print(f"❌ Failed to recreate group: {error_msg}")
                        return {"success": False, "error": error_msg}
                else:
                    print(f"❌ Failed to recreate group - HTTP {response.status_code}: {response.text}")
                    return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}
                    
        except Exception as e:
            print(f"Exception recreating group: {e}")
            return {"success": False, "error": str(e)}

    async def find_group_by_name(self, group_name: str, user_headers: Dict = None) -> Dict:
        """Find a group in Rocket.Chat by name"""
        try:
            print(f"🔍 Searching for group '{group_name}' in Rocket.Chat")
            
            # Use user-specific headers if provided, otherwise use admin headers
            headers = user_headers if user_headers else self.headers
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                # Try to get group info using groups.info API with roomName parameter
                response = await client.get(
                    f"{self.base_url}/api/v1/groups.info",
                    headers=headers,
                    params={"roomName": group_name}
                )
                
                print(f"DEBUG: groups.info API response status: {response.status_code}")
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('success'):
                        group_info = result.get('group', {})
                        print(f"✅ Found group '{group_name}' in Rocket.Chat: {group_info.get('_id', 'Unknown ID')}")
                        return {
                            "found": True,
                            "group": group_info,
                            "id": group_info.get('_id'),
                            "name": group_info.get('name'),
                            "members": group_info.get('usernames', [])
                        }
                    else:
                        print(f"❌ Group '{group_name}' not found: {result.get('error', 'Unknown error')}")
                        return {"found": False, "error": result.get('error', 'Unknown error')}
                else:
                    print(f"❌ Failed to search group - HTTP {response.status_code}: {response.text}")
                    return {"found": False, "error": f"HTTP {response.status_code}"}
                    
        except Exception as e:
            print(f"Exception searching for group: {e}")
            return {"found": False, "error": str(e)}

    async def check_group_exists(self, group_id: str, user_headers: Dict = None) -> Dict:
        """Check if a group exists in Rocket.Chat and get its details"""
        try:
            print(f"🔍 Checking if group {group_id} exists in Rocket.Chat")
            
            # Use user-specific headers if provided, otherwise use admin headers
            headers = user_headers if user_headers else self.headers
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                # Try to get group info using groups.info API
                response = await client.get(
                    f"{self.base_url}/api/v1/groups.info",
                    headers=headers,
                    params={"roomId": group_id}
                )
                
                print(f"DEBUG: groups.info API response status: {response.status_code}")
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('success'):
                        group_info = result.get('group', {})
                        print(f"✅ Group {group_id} exists in Rocket.Chat: {group_info.get('name', 'Unknown')}")
                        return {
                            "exists": True,
                            "group": group_info,
                            "name": group_info.get('name'),
                            "members": group_info.get('usernames', [])
                        }
                    else:
                        print(f"❌ Group {group_id} not found: {result.get('error', 'Unknown error')}")
                        return {"exists": False, "error": result.get('error', 'Unknown error')}
                else:
                    print(f"❌ Failed to check group - HTTP {response.status_code}: {response.text}")
                    return {"exists": False, "error": f"HTTP {response.status_code}"}
                    
        except Exception as e:
            print(f"Exception checking group existence: {e}")
            return {"exists": False, "error": str(e)}

    async def rename_group(self, group_id: str, new_name: str, user_headers: Dict = None) -> Dict:
        """Rename a group in Rocket.Chat"""
        try:
            print(f"✏️ Renaming group {group_id} to '{new_name}' in Rocket.Chat")
            
            # Convert group name to valid Rocket.Chat format (same as creation)
            valid_name = new_name.lower().replace(' ', '-').replace('_', '-')
            # Remove any other special characters except hyphens
            import re
            valid_name = re.sub(r'[^a-z0-9-]', '', valid_name)
            # Ensure it doesn't start or end with hyphen
            valid_name = valid_name.strip('-')
            
            print(f"DEBUG: Converted '{new_name}' to valid Rocket.Chat name: '{valid_name}'")
            
            # Use user-specific headers if provided, otherwise use admin headers
            headers = user_headers if user_headers else self.headers
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                # Use groups.rename API
                response = await client.post(
                    f"{self.base_url}/api/v1/groups.rename",
                    headers=headers,
                    json={
                        "roomId": group_id,
                        "name": valid_name
                    }
                )
                
                print(f"DEBUG: groups.rename API response status: {response.status_code}")
                print(f"DEBUG: Response text: {response.text}")
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('success'):
                        group_info = result.get('group', {})
                        print(f"✅ Successfully renamed group to '{valid_name}'")
                        return {
                            "success": True,
                            "group": group_info,
                            "new_name": group_info.get('name')
                        }
                    else:
                        print(f"❌ Failed to rename group: {result.get('error', 'Unknown error')}")
                        return {"success": False, "error": result.get('error', 'Unknown error')}
                else:
                    print(f"❌ Failed to rename group - HTTP {response.status_code}: {response.text}")
                    return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}
                    
        except Exception as e:
            print(f"Exception renaming group: {e}")
            return {"success": False, "error": str(e)}

    async def delete_group(self, group_id: str, user_headers: Dict = None) -> Dict:
        """Delete a group in Rocket.Chat"""
        try:
            print(f"🗑️ Deleting group {group_id} from Rocket.Chat")
            
            # Use user-specific headers if provided, otherwise use admin headers
            headers = user_headers if user_headers else self.headers
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                # Use groups.delete API
                response = await client.post(
                    f"{self.base_url}/api/v1/groups.delete",
                    headers=headers,
                    json={
                        "roomId": group_id
                    }
                )
                
                print(f"DEBUG: groups.delete API response status: {response.status_code}")
                print(f"DEBUG: Response text: {response.text}")
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('success'):
                        print(f"✅ Successfully deleted group from Rocket.Chat")
                        return {
                            "success": True,
                            "message": "Group deleted successfully"
                        }
                    else:
                        print(f"❌ Failed to delete group: {result.get('error', 'Unknown error')}")
                        return {"success": False, "error": result.get('error', 'Unknown error')}
                else:
                    print(f"❌ Failed to delete group - HTTP {response.status_code}: {response.text}")
                    return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}
                    
        except Exception as e:
            print(f"Exception deleting group: {e}")
            return {"success": False, "error": str(e)}

    async def remove_member_from_group(self, group_id: str, username: str, user_headers: Dict = None) -> Dict:
        """Remove a member from a group in Rocket.Chat"""
        try:
            print(f"👤➖ Removing user '{username}' from group {group_id} in Rocket.Chat")
            
            # Use user-specific headers if provided, otherwise use admin headers
            headers = user_headers if user_headers else self.headers
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                # Use groups.kick API
                response = await client.post(
                    f"{self.base_url}/api/v1/groups.kick",
                    headers=headers,
                    json={
                        "roomId": group_id,
                        "username": username
                    }
                )
                
                print(f"DEBUG: groups.kick API response status: {response.status_code}")
                print(f"DEBUG: Response text: {response.text}")
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('success'):
                        print(f"✅ Successfully removed user '{username}' from group")
                        return {
                            "success": True,
                            "message": f"User {username} removed successfully"
                        }
                    else:
                        print(f"❌ Failed to remove user: {result.get('error', 'Unknown error')}")
                        return {"success": False, "error": result.get('error', 'Unknown error')}
                else:
                    print(f"❌ Failed to remove user - HTTP {response.status_code}: {response.text}")
                    return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}
                    
        except Exception as e:
            print(f"Exception removing user from group: {e}")
            return {"success": False, "error": str(e)}

    async def get_rooms_list(self, user_headers: Dict = None) -> Dict:
        """Get all rooms (channels, groups, DMs) that the user is part of"""
        try:
            print("🔍 Fetching rooms using rooms.get API for channels/groups and im.list for DMs")
            
            # Use user-specific headers if provided, otherwise use admin headers
            headers = user_headers if user_headers else self.headers
            if user_headers:
                print("✅ Using user-specific headers")
            else:
                print("⚠️ Using admin headers (fallback)")
            
            # Get channels and groups using rooms.get API
            channels, groups = await self.get_channels_and_groups(headers)
            
            # Get DMs using im.list API for better user information
            direct_messages = await self.get_direct_messages(headers, user_headers)
            
            print(f"DEBUG: Final result - Channels: {len(channels)}, Groups: {len(groups)}, DMs: {len(direct_messages)}")
            
            return {
                'channels': channels,
                'groups': groups,
                'direct_messages': direct_messages
            }
                
        except Exception as e:
            print(f"Exception getting rooms list: {e}")
            return {'channels': [], 'groups': [], 'direct_messages': []}

    async def get_channels_and_groups(self, headers: Dict) -> tuple:
        """Get channels and groups using rooms.get API"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.base_url}/api/v1/rooms.get", headers=headers)
                
                if response.status_code != 200:
                    print(f"❌ Failed to get rooms list: HTTP {response.status_code}")
                    return [], []
                
                result = response.json()
                if not result.get('success'):
                    print(f"❌ API error: {result.get('error', 'Unknown error')}")
                    return [], []
                
                rooms = result.get('update', [])
                channels = []
                groups = []
                
                for room in rooms:
                    room_data = {
                        'id': room.get('_id'),
                        'name': room.get('name'),
                        'display_name': room.get('fname', room.get('name')),
                        'unread_count': room.get('unread', 0),
                        'type': room.get('t'),
                        'open': room.get('open', True)
                    }
                    
                    if room.get('t') == 'c':  # Channel
                        room_data['type'] = 'channel'
                        channels.append(room_data)
                    elif room.get('t') == 'p':  # Private group
                        room_data['type'] = 'private_group'
                        groups.append(room_data)
                    # Skip DMs here - we'll handle them separately
                
                print(f"DEBUG: Found {len(channels)} channels and {len(groups)} groups via rooms.get")
                return channels, groups
                
        except Exception as e:
            print(f"Exception getting channels and groups: {e}")
            return [], []

    async def get_direct_messages(self, headers: Dict, user_headers: Dict = None) -> List[Dict]:
        """Get direct messages using im.list API for better user information"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.base_url}/api/v1/im.list", headers=headers)
                
                print(f"DEBUG: im.list API response status: {response.status_code}")
                
                if response.status_code != 200:
                    print(f"❌ Failed to get DM list: HTTP {response.status_code}")
                    print(f"DEBUG: Error response: {response.text}")
                    return []
                
                result = response.json()
                print(f"DEBUG: im.list API response: {result}")
                
                if not result.get('success'):
                    print(f"❌ im.list API error: {result.get('error', 'Unknown error')}")
                    return []
                
                ims = result.get('ims', [])
                direct_messages = []
                
                # Get current user's username from headers
                current_user_id = headers.get('X-User-Id', '')
                print(f"DEBUG: Current user ID from headers: {current_user_id}")
                
                # Get current user's username dynamically
                current_username = await self.get_current_user_username(headers)
                print(f"DEBUG: Current user username: {current_username}")
                
                for im in ims:
                    # Simple: only include DMs with messages > 0
                    msg_count = im.get('msgs', 0)
                    if msg_count <= 0:
                        continue
                    
                    # Simple: get the other user (take the second username to avoid current user)
                    usernames = im.get('usernames', [])
                    other_user = None
                    if len(usernames) >= 2:
                        other_user = usernames[1]  # Take the second username
                    elif len(usernames) == 1:
                        other_user = usernames[0]  # Fallback if only one username
                    
                    if not other_user:
                        continue
                    
                    room_data = {
                        'id': im.get('_id'),
                        'name': im.get('name'),
                        'display_name': im.get('fname', im.get('name')),
                        'unread_count': im.get('unread', 0),
                        'type': 'direct_message',
                        'open': im.get('open', True),
                        'other_user': other_user,
                        'msgs': msg_count
                    }
                    
                    direct_messages.append(room_data)
                    print(f"DEBUG: Added DM: {other_user} (msgs: {msg_count})")
                
                print(f"DEBUG: Found {len(direct_messages)} DMs with messages > 0")
                return direct_messages
                
        except Exception as e:
            print(f"Exception getting direct messages: {e}")
            return []

    async def get_current_user_username(self, headers: Dict) -> str:
        """Get the current user's username from Rocket.Chat"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                # Use the users.info API to get current user info
                response = await client.get(f"{self.base_url}/api/v1/users.info", headers=headers)
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('success'):
                        user_info = result.get('user', {})
                        username = user_info.get('username', '')
                        print(f"DEBUG: Retrieved current user username: {username}")
                        return username
                
                print(f"DEBUG: Failed to get current user username, using fallback")
                # Try to extract username from X-User-Id header as fallback
                user_id = headers.get('X-User-Id', '')
                if user_id:
                    # This is a fallback - we'll use the user ID to identify self-DMs
                    return f"user_{user_id}"
                return ''
                
        except Exception as e:
            print(f"Exception getting current user username: {e}")
            return ''

    async def get_groups_list(self, user_headers: Dict = None) -> List[Dict]:
        """Get list of private groups that the user is part of using groups.list API"""
        try:
            print("🔍 Fetching groups using groups.list API")
            
            # Use user-specific headers if provided, otherwise use admin headers
            headers = user_headers if user_headers else self.headers
            if user_headers:
                print("✅ Using user-specific headers for groups.list")
            else:
                print("⚠️ Using admin headers for groups.list (fallback)")
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.base_url}/api/v1/groups.list", headers=headers)
                
                print(f"DEBUG: groups.list API response status: {response.status_code}")
                
                if response.status_code != 200:
                    print(f"❌ Failed to get groups list: HTTP {response.status_code}")
                    print(f"DEBUG: Error response: {response.text}")
                    return []
                
                result = response.json()
                print(f"DEBUG: groups.list API response: {result}")
                
                if not result.get('success'):
                    print(f"❌ API error: {result.get('error', 'Unknown error')}")
                    return []
                
                groups = result.get('groups', [])
                print(f"DEBUG: Found {len(groups)} groups via groups.list")
                
                # Convert to our format
                formatted_groups = []
                for group in groups:
                    formatted_group = {
                        'id': group.get('_id'),
                        'name': group.get('name'),
                        'display_name': group.get('fname', group.get('name')),
                        'unread_count': 0,  # groups.list doesn't provide unread count
                        'type': 'private_group',
                        'open': True
                    }
                    formatted_groups.append(formatted_group)
                
                return formatted_groups
                        
        except Exception as e:
            print(f"Exception getting groups list: {e}")
            return []

    async def get_all_user_rooms(self, user_headers: Dict = None) -> Dict:
        """Get all channels, groups, and DMs that the user is part of using rooms.get API"""
        try:
            print("🔍 Fetching real Rocket.Chat rooms data using rooms.get API")
            
            # Use the new rooms.get API for better accuracy
            return await self.get_rooms_list(user_headers)
                
        except Exception as e:
            print(f"Exception getting all conversations: {e}")
            return {'channels': [], 'groups': [], 'direct_messages': []}

# Create global instance
rocket_client = RocketChatClient()
