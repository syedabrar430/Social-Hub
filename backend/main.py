from fastapi import FastAPI, HTTPException, Depends, status, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
from typing import Optional, List
import os
import uuid
import shutil
from pathlib import Path
from google.oauth2 import id_token
from google.auth.transport import requests

from database import get_db, create_tables, User, ChatMessage, Group, GroupMember
from schemas import UserRegistration, UserLogin, UserResponse, Token, Message, GoogleAuthRequest, UserProfileUpdate, ChatMessageCreate, ChatMessageResponse, GroupCreate, GroupUpdate, GroupMemberAdd, GroupMemberRemove, GroupResponse, GroupMemberResponse, UserSearchResponse
from crud import create_user, authenticate_user, get_user_by_email, get_user_by_id, create_google_user, get_user_by_google_id, create_chat_message, get_recent_chat_messages, create_group, get_group_by_id, get_user_groups, add_member_to_group, remove_member_from_group, get_group_members, search_users, is_user_in_group, update_group, delete_group
from auth import create_access_token, verify_token, ACCESS_TOKEN_EXPIRE_MINUTES
from rocket_chat_local import rocket_client

# Create FastAPI app
app = FastAPI(
    title="Social Hub API",
    description="Backend API for Social Hub - A Social Media Platform",
    version="1.0.0"
)

# Create uploads directory if it doesn't exist
UPLOAD_DIR = Path("uploads/profile_pictures")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Mount static files to serve uploaded images
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://localhost:3000", 
        "http://localhost:8000", 
        "http://localhost:8080",
        "http://localhost:8081",  # Add the current frontend port
        "https://accounts.google.com"  # Add Google's domain
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Security
security = HTTPBearer()

# Create database tables on startup
@app.on_event("startup")
async def startup_event():
    create_tables()

# Root endpoint
@app.get("/", response_model=Message)
async def root():
    return {"message": "Welcome to Social Hub API"}

# Health check endpoint
@app.get("/health", response_model=Message)
async def health_check():
    return {"message": "API is healthy and running!"}

# Register endpoint
@app.post("/auth/register", response_model=Token)
async def register(user: UserRegistration, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = get_user_by_email(db, user.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    try:
        db_user = create_user(db, user)
        # Provision Rocket.Chat user
        import asyncio
        try:
            # Use email as username (before @)
            username = user.email.split('@')[0]
            # Call Rocket.Chat user creation (async)
            rc_result = await rocket_client.create_user_account(
                email=user.email,
                username=username,
                password=user.password,
                full_name=user.full_name
            )
            if not rc_result.get('success'):
                # Rollback Social Hub user if Rocket.Chat fails
                db.delete(db_user)
                db.commit()
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to create Rocket.Chat user: {rc_result.get('error', 'Unknown error')}"
                )
        except Exception as rc_exc:
            # Rollback Social Hub user if Rocket.Chat fails
            db.delete(db_user)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create Rocket.Chat user: {str(rc_exc)}"
            )

        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": db_user.email}, expires_delta=access_token_expires
        )
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": UserResponse.from_orm(db_user)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user"
        )

# Login endpoint
@app.post("/auth/login", response_model=Token)
async def login(user: UserLogin, db: Session = Depends(get_db)):
    # Authenticate user
    db_user = authenticate_user(db, user.email, user.password)
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_user.email}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse.from_orm(db_user)
    }

# Google OAuth endpoint
@app.post("/auth/google", response_model=Token)
async def google_auth(google_request: GoogleAuthRequest, db: Session = Depends(get_db)):
    try:
        print(f"Received Google token: {google_request.token[:50]}...")  # Print first 50 chars
        
        # Get Google Client ID from environment
        GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
        print(f"Using Google Client ID: {GOOGLE_CLIENT_ID}")
        
        if not GOOGLE_CLIENT_ID:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Google OAuth not configured"
            )
        
        # Verify the Google token with clock skew tolerance
        idinfo = id_token.verify_oauth2_token(
            google_request.token, 
            requests.Request(), 
            GOOGLE_CLIENT_ID,
            clock_skew_in_seconds=10  # Allow 10 seconds of clock skew
        )
        
        # Extract user information from Google
        google_id = idinfo['sub']
        email = idinfo['email']
        full_name = idinfo.get('name', '')
        profile_picture = idinfo.get('picture', '')
        
        # Check if user exists by email or google_id
        existing_user = get_user_by_email(db, email)
        
        if existing_user:
            # User exists - update with Google info if needed
            if not existing_user.google_id:
                existing_user.google_id = google_id
                existing_user.auth_provider = "google"
                if profile_picture:
                    existing_user.profile_picture_url = profile_picture
                db.commit()
                db.refresh(existing_user)
            
            db_user = existing_user
        else:
            # Create new Google user
            db_user = create_google_user(db, {
                "full_name": full_name,
                "email": email,
                "google_id": google_id,
                "profile_picture_url": profile_picture
            })
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": db_user.email}, expires_delta=access_token_expires
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": UserResponse.from_orm(db_user)
        }
        
    except ValueError as e:
        print(f"Google token verification failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid Google token: {str(e)}"
        )
    except Exception as e:
        print(f"Google auth error: {str(e)}")
        print(f"Error type: {type(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to authenticate with Google: {str(e)}"
        )

# Get current user (protected endpoint)
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    token = credentials.credentials
    email = verify_token(token)
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = get_user_by_email(db, email)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user

# Get user profile (protected endpoint)
@app.get("/auth/me", response_model=UserResponse)
async def get_user_profile(current_user: User = Depends(get_current_user)):
    return UserResponse.from_orm(current_user)

# Update user profile (protected endpoint)
@app.put("/auth/profile", response_model=UserResponse)
async def update_user_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    print(f"Updating profile for user {current_user.email} with data: {profile_data}")
    
    # Update the user fields (email is not editable)
    current_user.full_name = profile_data.full_name
    if profile_data.bio is not None:
        current_user.bio = profile_data.bio
    if profile_data.education_school is not None:
        current_user.education_school = profile_data.education_school
    if profile_data.education_degree is not None:
        current_user.education_degree = profile_data.education_degree
    if profile_data.location is not None:
        current_user.location = profile_data.location
    if profile_data.phone is not None:
        current_user.phone = profile_data.phone
    
    try:
        db.commit()
        db.refresh(current_user)
        result = UserResponse.from_orm(current_user)
        print(f"Profile update successful, returning: {result}")
        return result
    except Exception as e:
        print(f"Error updating profile: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile"
        )

# Upload profile picture endpoint
@app.post("/auth/upload-profile-picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Validate file type
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed."
        )
    
    # Validate file size (limit to 5MB)
    if file.size and file.size > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size too large. Maximum size is 5MB."
        )
    
    try:
        # Generate unique filename
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
        unique_filename = f"{current_user.id}_{uuid.uuid4().hex}.{file_extension}"
        file_path = UPLOAD_DIR / unique_filename
        
        # Save the file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Update user's profile picture URL
        profile_picture_url = f"http://localhost:8000/uploads/profile_pictures/{unique_filename}"
        current_user.profile_picture_url = profile_picture_url
        
        db.commit()
        db.refresh(current_user)
        
        return {
            "message": "Profile picture uploaded successfully",
            "profile_picture_url": profile_picture_url
        }
        
    except Exception as e:
        db.rollback()
        # Clean up file if it was created
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload profile picture"
        )

# Logout endpoint (client-side token removal)
@app.post("/auth/logout", response_model=Message)
async def logout():
    return {"message": "Successfully logged out"}

# Search users endpoint

# ==================== ROCKET.CHAT ENDPOINTS ====================

@app.post("/chat/setup")
async def setup_chat(current_user: User = Depends(get_current_user)):
    """Setup Rocket.Chat integration"""
    try:
        # Test connection
        connection_ok = await rocket_client.test_connection()
        if not connection_ok:
            raise HTTPException(status_code=503, detail="Rocket.Chat server not available")
        
        # Get main channel
        channel_id = await rocket_client.get_or_create_channel("social-hub-general")
        
        return {
            "success": True,
            "channel_id": channel_id,
            "channel_name": "social-hub-general"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Setup failed: {str(e)}")

@app.post("/chat/send-to-channel")
async def send_to_channel(
    message_data: dict,
    current_user: User = Depends(get_current_user)
):
    """Send message to channel"""
    try:
        channel_name = message_data.get("channel_name", "121")
        text = message_data.get("text")
        
        if not text:
            raise HTTPException(status_code=400, detail="Message text is required")
        
        result = await rocket_client.send_message_to_channel(channel_name, text)
        
        if result.get("success", True):
            return {"success": True, "message": result}
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "Failed to send message"))
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Send failed: {str(e)}")

@app.get("/chat/channel-messages")
async def get_channel_messages(
    channel_name: str = "social-hub-general",
    current_user: User = Depends(get_current_user)
):
    """Get messages from channel"""
    try:
        messages = await rocket_client.get_channel_messages(channel_name)
        
        # Transform messages for frontend
        formatted_messages = []
        for msg in messages:
            try:
                if not isinstance(msg, dict):
                    continue
                    
                user_data = msg.get("u", {})
                formatted_message = {
                    "id": msg.get("_id", ""),
                    "text": msg.get("msg", ""),
                    "user": {
                        "id": user_data.get("_id", "unknown"),
                        "username": user_data.get("username", "Unknown"),
                        "name": user_data.get("name") or user_data.get("username", "Unknown User")
                    },
                    "timestamp": msg.get("ts", ""),
                    "edited_at": msg.get("_updatedAt") if msg.get("_updatedAt") else None,
                    "reactions": msg.get("reactions", {}),
                    "thread_count": msg.get("tcount", 0),
                    "thread_ts": msg.get("tmid")
                }
                formatted_messages.append(formatted_message)
            except Exception:
                continue
        return {"messages": formatted_messages}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Get messages failed: {str(e)}")

@app.get("/chat/thread-messages")
async def get_thread_messages(
    parent_message_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get thread messages for a parent message"""
    try:
        messages = await rocket_client.get_thread_messages(parent_message_id)
        
        # Transform messages for frontend
        formatted_messages = []
        for message in messages:
            try:
                user_info = message.get("u", {})
                
                # Handle timestamp - Rocket.Chat thread messages have different format
                timestamp = message.get("ts", "")
                if isinstance(timestamp, dict):
                    timestamp = timestamp.get("$date", "")
                
                # Handle _updatedAt timestamp
                updated_at = message.get("_updatedAt")
                if updated_at and isinstance(updated_at, dict):
                    updated_at = updated_at.get("$date")
                    
                formatted_message = {
                    "id": message.get("_id", ""),
                    "text": message.get("msg", ""),
                    "user": {
                        "id": user_info.get("_id", ""),
                        "username": user_info.get("username", "unknown"),
                        "name": user_info.get("name", user_info.get("username", "Unknown User"))
                    },
                    "timestamp": timestamp,
                    "edited_at": updated_at,
                    "reactions": message.get("reactions", {}),
                    "thread_count": message.get("tcount", 0),
                    "thread_ts": message.get("tmid")
                }
                formatted_messages.append(formatted_message)
            except Exception:
                continue
        
        return {"messages": formatted_messages}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get thread messages: {str(e)}")

@app.post("/chat/send-thread-message")
async def send_thread_message(
    message_data: dict,
    current_user: User = Depends(get_current_user)
):
    """Send a message in a thread"""
    try:
        channel_name = message_data.get("channel_name", "121")
        parent_message_id = message_data.get("parent_message_id")
        text = message_data.get("text")
        
        if not text:
            raise HTTPException(status_code=400, detail="Message text is required")
        if not parent_message_id:
            raise HTTPException(status_code=400, detail="Parent message ID is required")
        
        result = await rocket_client.send_thread_message(channel_name, parent_message_id, text)
        
        if result.get("success", True):
            return {"success": True, "message": result}
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "Failed to send thread message"))
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Thread message send failed: {str(e)}")

@app.post("/chat/add-reaction")
async def add_reaction(
    request_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add reaction to a message"""
    try:
        message_id = request_data.get('message_id')
        emoji = request_data.get('emoji')
        
        if not message_id or not emoji:
            raise HTTPException(status_code=400, detail="message_id and emoji are required")
        
        # Get user-specific headers for API calls (works for both channels and DMs)
        user_headers = await rocket_client.get_user_headers(
            social_hub_user_email=current_user.email,
            social_hub_user_name=current_user.full_name,
            social_hub_user_id=str(current_user.id),
            db_session=db
        )
        
        if not user_headers:
            raise HTTPException(status_code=401, detail="Failed to get user authentication headers")
        
        # Use user-specific authentication for reactions
        result = await rocket_client.add_reaction_with_headers(message_id, emoji, user_headers)
        
        if result.get("success"):
            return {"success": True}
        else:
            raise HTTPException(status_code=400, detail=result.get("error", "Failed to add reaction"))
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Add reaction failed: {str(e)}")

@app.post("/chat/remove-reaction")
async def remove_reaction(
    request_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove reaction from a message"""
    try:
        message_id = request_data.get('message_id')
        emoji = request_data.get('emoji')
        
        if not message_id or not emoji:
            raise HTTPException(status_code=400, detail="message_id and emoji are required")
        
        # Get user-specific headers for API calls (works for both channels and DMs)
        user_headers = await rocket_client.get_user_headers(
            social_hub_user_email=current_user.email,
            social_hub_user_name=current_user.full_name,
            social_hub_user_id=str(current_user.id),
            db_session=db
        )
        
        if not user_headers:
            raise HTTPException(status_code=401, detail="Failed to get user authentication headers")
        
        # Use user-specific authentication for reactions
        result = await rocket_client.remove_reaction_with_headers(message_id, emoji, user_headers)
        
        if result.get("success"):
            return {"success": True}
        else:
            raise HTTPException(status_code=400, detail=result.get("error", "Failed to remove reaction"))
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Remove reaction failed: {str(e)}")

@app.get("/chat/test-connection")
async def test_rocket_chat_connection():
    """Test Rocket.Chat connection"""
    try:
        connection_ok = await rocket_client.test_connection()
        if connection_ok:
            return {"status": "connected", "message": "Rocket.Chat is accessible"}
        else:
            return {"status": "disconnected", "message": "Cannot connect to Rocket.Chat"}
    except Exception as e:
        return {"status": "error", "message": f"Connection error: {str(e)}"}

@app.post("/chat/create-test-user")
async def create_test_user():
    """Create a test Rocket.Chat user"""
    try:
        result = await rocket_client.create_user_account(
            email="test@example.com",
            username="test",
            password="testpassword",
            full_name="Test User"
        )
        return result
    except Exception as e:
        return {"success": False, "error": str(e)}

# Rocket.Chat endpoints
@app.get("/api/rocket-chat/general-messages")
async def get_general_messages(
    limit: int = 50,
    current_user: User = Depends(get_current_user)
):
    """Get messages from Rocket.Chat general channel"""
    try:
        print(f"DEBUG: Fetching general channel messages for user: {current_user.email}")
        
        # Get messages from general channel
        messages = await rocket_client.get_channel_messages("general", limit)
        print(f"DEBUG: Raw messages received: {messages}")
        print(f"DEBUG: Messages type: {type(messages)}, length: {len(messages) if messages else 0}")
        
        # Convert Rocket.Chat messages to frontend format
        formatted_messages = []
        
        if not messages:
            print("DEBUG: No messages found in general channel, creating sample message")
            # If no messages, create a welcome message
            formatted_messages = [{
                "id": "welcome-msg",
                "sender": "System",
                "content": "",
                "timestamp": "2024-01-01T00:00:00.000Z",
                "isOwn": False,
                "avatar": None,
                "reactions": {},
                "thread_count": 0,
                "thread_messages": []
            }]
        else:
            for i, msg in enumerate(messages):
                print(f"DEBUG: Processing message {i}: {msg}")
                if not isinstance(msg, dict):
                    print(f"DEBUG: Skipping non-dict message {i}")
                    continue
                    
                user_data = msg.get("u", {})
                
                # Handle timestamp
                timestamp = msg.get("ts", "")
                if isinstance(timestamp, dict):
                    # Rocket.Chat timestamp format
                    timestamp = timestamp.get("$date", "")
                elif timestamp:
                    # If it's already a string, use as-is
                    timestamp = str(timestamp)
                else:
                    timestamp = "2024-01-01T00:00:00.000Z"
                
                # Handle system vs user messages
                sender_type = msg.get("sender_type", "user")
                is_system = sender_type == "system"
                
                # Get thread count and check if we should include thread messages
                thread_count = msg.get("tcount", 0)
                thread_messages = []
                
                print(f"DEBUG: General Message {msg.get('_id')} - thread_count: {thread_count}, raw tcount: {msg.get('tcount')}")
                
                # Only fetch thread messages if there are more than 0 messages in the thread
                if thread_count > 0:
                    try:
                        # Temporarily use admin headers instead of user headers for debugging
                        thread_response = await rocket_client.get_thread_messages(msg.get("_id", ""))
                        if thread_response:
                            for thread_msg in thread_response:
                                if isinstance(thread_msg, dict):
                                    thread_user_data = thread_msg.get("u", {})
                                    thread_timestamp = thread_msg.get("ts", "")
                                    if isinstance(thread_timestamp, dict):
                                        thread_timestamp = thread_timestamp.get("$date", "")
                                    elif thread_timestamp:
                                        thread_timestamp = str(thread_timestamp)
                                    else:
                                        thread_timestamp = "2024-01-01T00:00:00.000Z"
                                    
                                    thread_messages.append({
                                        "id": thread_msg.get("_id", ""),
                                        "text": thread_msg.get("msg", ""),
                                        "user": {
                                            "id": thread_user_data.get("_id", ""),
                                            "username": thread_user_data.get("username", "unknown"),
                                            "name": thread_user_data.get("name", thread_user_data.get("username", "Unknown User"))
                                        },
                                        "timestamp": thread_timestamp,
                                        "edited_at": thread_msg.get("_updatedAt"),
                                        "reactions": thread_msg.get("reactions", {}),
                                        "is_thread_message": True
                                    })
                    except Exception as e:
                        print(f"DEBUG: Failed to fetch thread messages for {msg.get('_id', '')}: {e}")
                
                # Convert reactions format
                reactions = {}
                if msg.get("reactions"):
                    for emoji, reaction_data in msg["reactions"].items():
                        # Convert colon format back to unicode for display
                        emoji_display_map = {
                            ":+1:": "👍",
                            ":heart:": "❤️", 
                            ":joy:": "😂",
                            ":open_mouth:": "😮",
                            ":cry:": "😢",
                            ":rage:": "😡",
                            ":thumbsup:": "👍",
                            ":thumbsdown:": "👎",
                            ":fire:": "🔥",
                            ":100:": "💯"
                        }
                        display_emoji = emoji_display_map.get(emoji, emoji)
                        reactions[display_emoji] = reaction_data.get("usernames", [])
                
                formatted_message = {
                    "id": msg.get("_id", f"msg-{i}"),
                    "sender": "System" if is_system else (user_data.get("name") or user_data.get("username", "Unknown")),
                    "content": msg.get("msg", ""),
                    "timestamp": timestamp,
                    "isOwn": not is_system and user_data.get("username") == "ankush1",  # System messages are never own
                    "avatar": None,  # Rocket.Chat doesn't provide avatar URLs directly
                    "type": "system" if is_system else "message",
                    "reactions": reactions,
                    "thread_count": thread_count,
                    "thread_messages": thread_messages
                }
                formatted_messages.append(formatted_message)
                print(f"DEBUG: Formatted message {i}: {formatted_message}")
        
        # Reverse to show oldest first (like chat history)
        formatted_messages.reverse()
        
        print(f"DEBUG: Returning {len(formatted_messages)} messages from general channel")
        return formatted_messages
        
    except Exception as e:
        print(f"Error getting general channel messages: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get messages: {str(e)}")

@app.post("/api/rocket-chat/send-message")
async def send_message_to_general(
    message_data: dict,
    current_user: User = Depends(get_current_user)
):
    """Send message to Rocket.Chat general channel"""
    try:
        print(f"DEBUG: Sending message to general channel from user: {current_user.email}")
        
        # Send message to general channel (authentication handled internally)
        result = await rocket_client.send_message_to_channel("general", message_data.get("content", ""))
        print(f"DEBUG: Send message result: {result}")
        
        if result.get('success'):
            return {"success": True, "message": "Message sent successfully"}
        else:
            raise HTTPException(status_code=500, detail=f"Failed to send message: {result.get('error', 'Unknown error')}")
            
    except Exception as e:
        print(f"Error sending message to general channel: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send message: {str(e)}")

@app.get("/api/rocket-chat/dm-messages")
async def get_dm_messages(
    username: str,
    limit: int = 1000,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get DM messages with a specific user"""
    try:
        print(f"DEBUG: Fetching DM messages with {username} for user: {current_user.email}")
        
        # Get user-specific headers for API calls
        user_headers = await rocket_client.get_user_headers(
            social_hub_user_email=current_user.email,
            social_hub_user_name=current_user.full_name,
            social_hub_user_id=str(current_user.id),
            db_session=db
        )
        
        messages = await rocket_client.get_dm_messages(username, limit, user_headers)
        print(f"DEBUG: Got {len(messages)} DM messages with {username}")
        
        # Convert to frontend format
        formatted_messages = []
        for i, msg in enumerate(messages):
            if not isinstance(msg, dict):
                continue
                
            user_data = msg.get("u", {})
            print(f"DEBUG: User data for message {i}: {user_data}")
            print(f"DEBUG: Username: {user_data.get('username')}, Name: {user_data.get('name')}")
            timestamp = msg.get("ts", "")
            
            if isinstance(timestamp, dict):
                timestamp = timestamp.get("$date", "")
            elif timestamp:
                timestamp = str(timestamp)
            else:
                timestamp = "2024-01-01T00:00:00.000Z"
            
            # Convert reactions format (same as channel messages)
            reactions = {}
            if msg.get("reactions"):
                for emoji, reaction_data in msg["reactions"].items():
                    # Convert colon format back to unicode for display
                    emoji_display_map = {
                        ":+1:": "👍",
                        ":heart:": "❤️", 
                        ":joy:": "😂",
                        ":open_mouth:": "😮",
                        ":cry:": "😢",
                        ":rage:": "😡",
                        ":thumbsup:": "👍",
                        ":thumbsdown:": "👎",
                        ":fire:": "🔥",
                        ":100:": "💯"
                    }
                    display_emoji = emoji_display_map.get(emoji, emoji)
                    reactions[display_emoji] = reaction_data.get("usernames", [])
            
            # Map display names to usernames for consistent display
            display_name = user_data.get("name", "Unknown")
            username = user_data.get("username", "")
            
            # If we have a display name but no username, try to map it
            if display_name and not username:
                # Map known display names to usernames
                name_to_username_map = {
                    "AI_SE": "cs23mtech15009",
                    "Ankush Chhabra": "ankush8"
                }
                username = name_to_username_map.get(display_name, display_name)
            
            # Use username if available, otherwise fall back to display name
            sender_name = username or display_name
            
            # Get thread count and check if we should include thread messages
            thread_count = msg.get("tcount", 0)
            thread_messages = []
            
            print(f"DEBUG: DM Message {msg.get('_id')} - thread_count: {thread_count}")
            print(f"DEBUG: user_headers is None: {user_headers is None}")
            
            # Only fetch thread messages if there are more than 0 messages in the thread
            if thread_count > 0:
                try:
                    # Use user-specific headers for DM thread messages (required for DMs)
                    print(f"DEBUG: Calling get_thread_messages with user_headers: {user_headers is not None}")
                    thread_response = await rocket_client.get_thread_messages(msg.get("_id", ""), user_headers)
                    if thread_response:
                        for thread_msg in thread_response:
                            if isinstance(thread_msg, dict):
                                thread_user_data = thread_msg.get("u", {})
                                thread_timestamp = thread_msg.get("ts", "")
                                if isinstance(thread_timestamp, dict):
                                    thread_timestamp = thread_timestamp.get("$date", "")
                                elif thread_timestamp:
                                    thread_timestamp = str(thread_timestamp)
                                else:
                                    thread_timestamp = "2024-01-01T00:00:00.000Z"
                                
                                thread_messages.append({
                                    "id": thread_msg.get("_id", ""),
                                    "text": thread_msg.get("msg", ""),
                                    "user": {
                                        "id": thread_user_data.get("_id", ""),
                                        "username": thread_user_data.get("username", "unknown"),
                                        "name": thread_user_data.get("name", thread_user_data.get("username", "Unknown User"))
                                    },
                                    "timestamp": thread_timestamp,
                                    "edited_at": thread_msg.get("_updatedAt"),
                                    "reactions": thread_msg.get("reactions", {}),
                                    "is_thread_message": True
                                })
                except Exception as e:
                    print(f"DEBUG: Failed to fetch thread messages for {msg.get('_id', '')}: {e}")
            
            # Parse attachments from Rocket.Chat message
            attachments = []
            if msg.get("attachments"):
                rocket_url = os.getenv('ROCKET_CHAT_URL', 'http://10.68.0.49:30082')
                for att in msg["attachments"]:
                    image_url = att.get("title_link") or att.get("image_url") or att.get("url")
                    # Convert to full Rocket.Chat URLs
                    if image_url and not image_url.startswith("http"):
                        image_url = f"{rocket_url}{image_url if image_url.startswith('/') else '/' + image_url}"
                    elif image_url and image_url.startswith("http"):
                        # Already full URL, use as is
                        pass
                    
                    attachments.append({
                        "id": att.get("_id", ""),
                        "title": att.get("title", ""),
                        "filename": att.get("title") or att.get("filename", ""),
                        "url": image_url,
                        "type": att.get("image_type") or att.get("type", "application/octet-stream"),
                        "size": att.get("image_size") or att.get("size") or 0,
                        "preview": f"data:image/jpeg;base64,{att.get('image_preview')}" if att.get('image_preview') else None
                    })
            
            # Also check for file field (single file uploads)
            if msg.get("file"):
                rocket_url = os.getenv('ROCKET_CHAT_URL', 'http://10.68.0.49:30082')
                file_data = msg["file"]
                file_url = file_data.get("url", "")
                if file_url and not file_url.startswith("http"):
                    file_url = f"{rocket_url}{file_url if file_url.startswith('/') else '/' + file_url}"
                
                attachments.append({
                    "id": file_data.get("_id", ""),
                    "title": file_data.get("name", ""),
                    "filename": file_data.get("name", ""),
                    "url": file_url,
                    "type": file_data.get("type", "application/octet-stream"),
                    "size": file_data.get("size", 0),
                    "preview": None
                })
            
            formatted_message = {
                "id": msg.get("_id", f"dm-{i}"),
                "sender": sender_name,
                "content": msg.get("msg", ""),
                "timestamp": timestamp,
                "isOwn": user_data.get("username") == "ankush1",
                "avatar": None,
                "type": "message",
                "reactions": reactions,
                "thread_count": thread_count,
                "thread_ts": msg.get("tmid"),
                "thread_messages": thread_messages,  # Include thread messages
                "attachments": attachments if attachments else None
            }
            formatted_messages.append(formatted_message)
        
        formatted_messages.reverse()
        return formatted_messages
        
    except Exception as e:
        print(f"Error getting DM messages with {username}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get DM messages: {str(e)}")

@app.get("/api/rocket-chat/dm-list")
async def get_dm_list(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all DM conversations"""
    try:
        print(f"DEBUG: Fetching DM list for user: {current_user.email}")
        
        # Test connection first
        connection_ok = await rocket_client.test_connection()
        if not connection_ok:
            raise HTTPException(
                status_code=503, 
                detail="Rocket.Chat server not accessible or authentication failed. Please check your credentials in .env file."
            )
        
        # Get user-specific headers for API calls
        user_headers = await rocket_client.get_user_headers(
            social_hub_user_email=current_user.email,
            social_hub_user_name=current_user.full_name,
            social_hub_user_id=str(current_user.id),
            db_session=db
        )
        
        if not user_headers:
            raise HTTPException(
                status_code=401, 
                detail="Failed to get user authentication. Please check your credentials."
            )
        
        # Use user-specific headers to get rooms
        rooms = await rocket_client.get_all_user_rooms(user_headers=user_headers)
        return {"dms": rooms['direct_messages']}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting DM list: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get DM list: {str(e)}")

@app.post("/api/rocket-chat/send-dm")
async def send_dm_message(
    message_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a direct message with optional file attachments"""
    try:
        print(f"DEBUG: Sending DM for user: {current_user.email}")
        
        username = message_data.get("username")
        message = message_data.get("message")
        attachments = message_data.get("attachments", [])
        
        if not username:
            raise HTTPException(status_code=400, detail="Username is required")
        
        # Get user-specific headers for API calls
        user_headers = await rocket_client.get_user_headers(
            social_hub_user_email=current_user.email,
            social_hub_user_name=current_user.full_name,
            social_hub_user_id=str(current_user.id),
            db_session=db
        )
        
        result = await rocket_client.send_direct_message(username, message, user_headers, attachments)
        
        if result.get("success"):
            return {"success": True, "message": "DM sent successfully"}
        else:
            raise HTTPException(status_code=500, detail=f"Failed to send DM: {result.get('error', 'Unknown error')}")
            
    except Exception as e:
        print(f"Error sending DM: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send DM: {str(e)}")

@app.get("/api/rocket-chat/user-rooms")
async def get_user_rooms(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all rooms the user is part of"""
    try:
        # Get user-specific headers for API calls
        user_headers = await rocket_client.get_user_headers(
            social_hub_user_email=current_user.email,
            social_hub_user_name=current_user.full_name,
            social_hub_user_id=str(current_user.id),
            db_session=db
        )
        
        if not user_headers:
            raise HTTPException(status_code=401, detail="Failed to get user authentication")
        
        # Use user-specific headers to get rooms
        rooms = await rocket_client.get_all_user_rooms(user_headers=user_headers)
        return rooms
    except Exception as e:
        print(f"Error getting user rooms: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get user rooms: {str(e)}")

@app.get("/api/rocket-chat/test-rooms")
async def test_rooms_api(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Test the rooms.get API to see what rooms the user is part of"""
    try:
        print(f"DEBUG: Testing rooms.get API for user: {current_user.email}")
        
        # Get user-specific headers for API calls
        user_headers = await rocket_client.get_user_headers(
            social_hub_user_email=current_user.email,
            social_hub_user_name=current_user.full_name,
            social_hub_user_id=str(current_user.id),
            db_session=db
        )
        
        # Test the rooms.get API
        rooms_result = await rocket_client.get_rooms_list(user_headers)
        
        print(f"DEBUG: rooms.get result: {rooms_result}")
        
        return {
            "success": True,
            "user": current_user.email,
            "rooms": rooms_result,
            "message": "rooms.get API test completed"
        }
        
    except Exception as e:
        print(f"Error testing rooms API: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to test rooms API: {str(e)}")

@app.get("/api/rocket-chat/find-group/{group_name}")
async def find_group_by_name(group_name: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Find a group in Rocket.Chat by name and get its details"""
    try:
        print(f"DEBUG: Searching for group '{group_name}' for user: {current_user.email}")
        
        # Get user-specific headers for API calls
        user_headers = await rocket_client.get_user_headers(
            social_hub_user_email=current_user.email,
            social_hub_user_name=current_user.full_name,
            social_hub_user_id=str(current_user.id),
            db_session=db
        )
        
        # Search for group in Rocket.Chat
        group_search = await rocket_client.find_group_by_name(group_name, user_headers)
        
        return {
            "success": True,
            "user": current_user.email,
            "group_name": group_name,
            "found_in_rocketchat": group_search.get("found", False),
            "group_info": group_search.get("group"),
            "group_id": group_search.get("id"),
            "group_members": group_search.get("members", []),
            "error": group_search.get("error") if not group_search.get("found") else None
        }
        
    except Exception as e:
        print(f"Error searching for group: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to search for group: {str(e)}")

@app.post("/api/rocket-chat/sync-group/{group_id}")
async def sync_group_with_rocketchat(group_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Sync a local group with its Rocket.Chat counterpart"""
    try:
        print(f"DEBUG: Syncing group {group_id} for user: {current_user.email}")
        
        # Get the group from local database
        group = get_group_by_id(db, int(group_id))
        if not group:
            raise HTTPException(status_code=404, detail="Group not found in local database")
        
        # Convert group name to Rocket.Chat format
        rocket_name = group.name.lower().replace('_', '-').replace(' ', '-')
        import re
        rocket_name = re.sub(r'[^a-z0-9-]', '', rocket_name)
        rocket_name = rocket_name.strip('-')
        
        print(f"DEBUG: Searching for Rocket.Chat group: '{rocket_name}'")
        
        # Get user-specific headers for API calls
        user_headers = await rocket_client.get_user_headers(
            social_hub_user_email=current_user.email,
            social_hub_user_name=current_user.full_name,
            social_hub_user_id=str(current_user.id),
            db_session=db
        )
        
        # Search for group in Rocket.Chat
        group_search = await rocket_client.find_group_by_name(rocket_name, user_headers)
        
        if group_search.get("found"):
            # Update the group's Rocket.Chat ID in our database
            new_rocket_id = group_search.get("id")
            old_rocket_id = group.rocket_chat_group_id
            group.rocket_chat_group_id = new_rocket_id
            db.commit()
            
            return {
                "success": True,
                "message": f"Group '{group.name}' synced with Rocket.Chat",
                "local_group_id": group.id,
                "old_rocket_id": old_rocket_id,
                "new_rocket_id": new_rocket_id,
                "group_name": group.name,
                "rocket_name": rocket_name,
                "rocket_members": group_search.get("members", [])
            }
        else:
            raise HTTPException(
                status_code=404, 
                detail=f"Group '{rocket_name}' not found in Rocket.Chat: {group_search.get('error', 'Unknown error')}"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error syncing group: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to sync group: {str(e)}")

@app.post("/api/rocket-chat/recreate-group/{group_id}")
async def recreate_group_in_rocketchat(group_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Recreate a group in Rocket.Chat that exists in local database but not in Rocket.Chat"""
    try:
        print(f"DEBUG: Recreating group {group_id} for user: {current_user.email}")
        
        # Get the group from local database
        group = get_group_by_id(db, int(group_id))
        if not group:
            raise HTTPException(status_code=404, detail="Group not found in local database")
        
        # Get all members of the group
        members = get_group_members(db, group.id)
        member_usernames = []
        
        for member in members:
            username = member.user.email.split('@')[0]
            member_usernames.append(username)
            print(f"DEBUG: Adding member: {member.user.full_name} ({username})")
        
        # Get user-specific headers for API calls
        user_headers = await rocket_client.get_user_headers(
            social_hub_user_email=current_user.email,
            social_hub_user_name=current_user.full_name,
            social_hub_user_id=str(current_user.id),
            db_session=db
        )
        
        # Recreate the group in Rocket.Chat
        result = await rocket_client.recreate_group_in_rocketchat(
            group_name=group.name,
            members=member_usernames,
            user_headers=user_headers
        )
        
        if result.get('success'):
            # Update the group's Rocket.Chat ID in our database
            new_rocket_id = result.get('group_id')
            group.rocket_chat_group_id = new_rocket_id
            db.commit()
            
            return {
                "success": True,
                "message": f"Group '{group.name}' recreated successfully in Rocket.Chat",
                "old_rocket_id": group_id,
                "new_rocket_id": new_rocket_id,
                "group_name": group.name,
                "members": member_usernames
            }
        else:
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to recreate group in Rocket.Chat: {result.get('error', 'Unknown error')}"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error recreating group: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to recreate group: {str(e)}")

@app.get("/api/rocket-chat/check-group/{group_id}")
async def check_group_exists(group_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Check if a group exists in Rocket.Chat and get its details"""
    try:
        print(f"DEBUG: Checking if group {group_id} exists for user: {current_user.email}")
        
        # Get user-specific headers for API calls
        user_headers = await rocket_client.get_user_headers(
            social_hub_user_email=current_user.email,
            social_hub_user_name=current_user.full_name,
            social_hub_user_id=str(current_user.id),
            db_session=db
        )
        
        # Check if group exists in Rocket.Chat
        group_check = await rocket_client.check_group_exists(group_id, user_headers)
        
        # Check local database membership
        user_groups = get_user_groups(db, current_user.id)
        user_group_rocket_ids = {group.rocket_chat_group_id for group in user_groups if group.rocket_chat_group_id}
        is_member_locally = group_id in user_group_rocket_ids
        
        return {
            "success": True,
            "user": current_user.email,
            "group_id": group_id,
            "exists_in_rocketchat": group_check.get("exists", False),
            "group_info": group_check.get("group"),
            "group_members": group_check.get("members", []),
            "is_member_locally": is_member_locally,
            "error": group_check.get("error") if not group_check.get("exists") else None
        }
        
    except Exception as e:
        print(f"Error checking group existence: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to check group existence: {str(e)}")

@app.get("/api/rocket-chat/test-specific-group/{group_id}")
async def test_specific_group(group_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Test if a specific group exists and if the user can access it"""
    try:
        print(f"DEBUG: Testing specific group {group_id} for user: {current_user.email}")
        
        # Get user-specific headers for API calls
        user_headers = await rocket_client.get_user_headers(
            social_hub_user_email=current_user.email,
            social_hub_user_name=current_user.full_name,
            social_hub_user_id=str(current_user.id),
            db_session=db
        )
        
        # Test the rooms.get API
        rooms_result = await rocket_client.get_rooms_list(user_headers)
        
        # Check if the specific group is in the results
        target_group = None
        for group in rooms_result.get('groups', []):
            if group.get('id') == group_id:
                target_group = group
                break
        
        # Check local database membership
        user_groups = get_user_groups(db, current_user.id)
        user_group_rocket_ids = {group.rocket_chat_group_id for group in user_groups if group.rocket_chat_group_id}
        is_member_locally = group_id in user_group_rocket_ids
        
        return {
            "success": True,
            "user": current_user.email,
            "group_id": group_id,
            "group_found_in_rocketchat": target_group is not None,
            "group_data": target_group,
            "is_member_locally": is_member_locally,
            "all_user_groups": list(user_group_rocket_ids),
            "all_rocketchat_groups": [g.get('id') for g in rooms_result.get('groups', [])]
        }
        
    except Exception as e:
        print(f"Error testing specific group: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to test specific group: {str(e)}")

@app.get("/api/rocket-chat/channels")
async def get_all_channels(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all available channels and private groups"""
    try:
        print(f"DEBUG: Fetching all channels for user: {current_user.email}")
        
        # Test connection first
        connection_ok = await rocket_client.test_connection()
        if not connection_ok:
            raise HTTPException(
                status_code=503, 
                detail="Rocket.Chat server not accessible or authentication failed. Please check your credentials in .env file."
            )
        
        # Ensure authentication with Social Hub user info
        authenticated = await rocket_client.ensure_authenticated(
            social_hub_user_email=current_user.email,
            social_hub_user_name=current_user.full_name,
            social_hub_user_id=str(current_user.id)
        )
        
        if not authenticated:
            raise HTTPException(
                status_code=401, 
                detail="Failed to authenticate with Rocket.Chat. Please check your credentials."
            )
        
        rooms = await rocket_client.get_all_user_rooms()
        
        # Security fix: Filter groups to only show groups the user is actually a member of
        # This prevents users from seeing groups they shouldn't have access to
        if 'groups' in rooms and rooms['groups']:
            print(f"DEBUG: Filtering {len(rooms['groups'])} groups by user membership")
            
            # Get user's group memberships from local database
            user_groups = get_user_groups(db, current_user.id)
            user_group_rocket_ids = {group.rocket_chat_group_id for group in user_groups if group.rocket_chat_group_id}
            
            print(f"DEBUG: User is member of {len(user_group_rocket_ids)} groups: {user_group_rocket_ids}")
            print(f"DEBUG: Rocket.Chat returned {len(rooms['groups'])} groups: {[g.get('id') for g in rooms['groups']]}")
            
            # Special debug for ankush16 user
            if current_user.email == "ankush16@gmail.com":
                print(f"DEBUG: Special debug for ankush16 - should see group: 68fdfe8f5c7739709cadc576")
                print(f"DEBUG: Rocket.Chat groups: {[g.get('id') for g in rooms['groups']]}")
                print(f"DEBUG: User group memberships: {user_group_rocket_ids}")
            
            # Filter groups to only include those the user is a member of
            filtered_groups = []
            for group in rooms['groups']:
                if group.get('id') in user_group_rocket_ids:
                    filtered_groups.append(group)
                    print(f"DEBUG: Including group: {group.get('name')} (ID: {group.get('id')})")
                else:
                    print(f"DEBUG: Excluding group: {group.get('name')} (ID: {group.get('id')}) - user not a member")
            
            rooms['groups'] = filtered_groups
            print(f"DEBUG: Filtered groups count: {len(filtered_groups)}")
        
        print(f"DEBUG: Returning rooms: {rooms}")
        return rooms
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting channels: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get channels: {str(e)}")

@app.get("/api/rocket-chat/channel-messages/{channel_identifier}")
async def get_channel_messages_by_id(
    channel_identifier: str,
    limit: int = 1000,
    channel_type: str = "channel",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get messages from any channel or private group by ID or name"""
    try:
        print(f"DEBUG: Fetching messages for {channel_type}: {channel_identifier} (user: {current_user.email})")
        
        # Get user-specific headers for API calls
        user_headers = await rocket_client.get_user_headers(
            social_hub_user_email=current_user.email,
            social_hub_user_name=current_user.full_name,
            social_hub_user_id=str(current_user.id),
            db_session=db
        )
        
        # Get messages from the specified channel
        messages = await rocket_client.get_channel_messages(channel_identifier, limit, channel_type, user_headers)
        print(f"DEBUG: Raw messages received: {len(messages) if messages else 0} messages")
        
        # Convert Rocket.Chat messages to frontend format
        formatted_messages = []
        
        if not messages:
            print("DEBUG: No messages found, returning empty list")
            return []
        
        for i, msg in enumerate(messages):
            if not isinstance(msg, dict):
                print(f"DEBUG: Skipping non-dict message {i}")
                continue
                
            user_data = msg.get("u", {})
            
            # Handle timestamp
            timestamp = msg.get("ts", "")
            if isinstance(timestamp, dict):
                timestamp = timestamp.get("$date", "")
            elif timestamp:
                timestamp = str(timestamp)
            else:
                timestamp = "2024-01-01T00:00:00.000Z"
            
            # Handle system vs user messages
            sender_type = msg.get("sender_type", "user")
            is_system = sender_type == "system"
            
            # Get thread count and check if we should include thread messages
            thread_count = msg.get("tcount", 0)
            thread_messages = []
            
            # Only fetch thread messages if there are more than 0 messages in the thread
            if thread_count > 0:
                try:
                    # Temporarily use admin headers instead of user headers for debugging
                    thread_response = await rocket_client.get_thread_messages(msg.get("_id", ""))
                    if thread_response:
                        for thread_msg in thread_response:
                            if isinstance(thread_msg, dict):
                                thread_user_data = thread_msg.get("u", {})
                                thread_timestamp = thread_msg.get("ts", "")
                                if isinstance(thread_timestamp, dict):
                                    thread_timestamp = thread_timestamp.get("$date", "")
                                elif thread_timestamp:
                                    thread_timestamp = str(thread_timestamp)
                                else:
                                    thread_timestamp = "2024-01-01T00:00:00.000Z"
                                
                                thread_messages.append({
                                    "id": thread_msg.get("_id", ""),
                                    "text": thread_msg.get("msg", ""),
                                    "user": {
                                        "id": thread_user_data.get("_id", ""),
                                        "username": thread_user_data.get("username", "unknown"),
                                        "name": thread_user_data.get("name", thread_user_data.get("username", "Unknown User"))
                                    },
                                    "timestamp": thread_timestamp,
                                    "edited_at": thread_msg.get("_updatedAt"),
                                    "reactions": thread_msg.get("reactions", {}),
                                    "is_thread_message": True
                                })
                except Exception as e:
                    print(f"DEBUG: Failed to fetch thread messages for {msg.get('_id', '')}: {e}")
            
            # Convert reactions format
            reactions = {}
            if msg.get("reactions"):
                for emoji, reaction_data in msg["reactions"].items():
                    # Convert colon format back to unicode for display
                    emoji_display_map = {
                        ":+1:": "👍",
                        ":heart:": "❤️", 
                        ":joy:": "😂",
                        ":open_mouth:": "😮",
                        ":cry:": "😢",
                        ":rage:": "😡",
                        ":thumbsup:": "👍",
                        ":thumbsdown:": "👎",
                        ":fire:": "🔥",
                        ":100:": "💯"
                    }
                    display_emoji = emoji_display_map.get(emoji, emoji)
                    reactions[display_emoji] = reaction_data.get("usernames", [])
            
            # Debug: Print all message keys and values
            print(f"\n{'='*50}")
            print(f"DEBUG: Message {i} details:")
            print(f"  ID: {msg.get('_id')}")
            print(f"  Type (t): {msg.get('t')}")
            print(f"  User (u): {msg.get('u')}")
            print(f"  Message text (msg): '{msg.get('msg', '')[:50]}'")
            print(f"  Has attachments: {bool(msg.get('attachments'))}")
            print(f"{'='*50}\n")
            
            # Check if this is a system event (like "user joined")
            event_type = msg.get("t")
            is_system_event = event_type and event_type in ["uj", "ul", "r", "au", "ru"]  # user_joined, user_left, room_changed, user_added, user_removed
            
            # Get message text - handle system events differently
            message_text = msg.get("msg", "")
            
            # Generate custom messages for system events
            if is_system_event and not message_text:
                username = msg.get("u", {}).get("username", "Unknown")
                print(f"🔄 DEBUG: Processing system event '{event_type}' for user '{username}'")
                if event_type == "uj":
                    message_text = f"{username} joined the channel"
                elif event_type == "ul":
                    message_text = f"{username} left the channel"
                elif event_type == "r":
                    message_text = f"Room changed"
                elif event_type == "au":
                    message_text = f"{username} was added"
                elif event_type == "ru":
                    message_text = f"{username} was removed"
                print(f"✅ DEBUG: Generated custom message: '{message_text}'")
            
            # If msg is still empty and it's a system event, check attachments for the text
            if not message_text and is_system_event and msg.get("attachments"):
                for att in msg.get("attachments", []):
                    if att.get("text"):
                        message_text = att.get("text")
                        print(f"DEBUG: Found system event text in attachment: '{message_text}' (event type: {event_type})")
                        break
            
            # Parse attachments from Rocket.Chat message
            attachments = []
            if msg.get("attachments"):
                print(f"DEBUG: Message has {len(msg['attachments'])} attachment(s)")
                for idx, att in enumerate(msg["attachments"]):
                    print(f"DEBUG: Attachment {idx}: {att}")
                    
                    # Extract image URL from various possible fields
                    image_url = att.get("title_link") or att.get("image_url") or att.get("image_preview") or att.get("url") or att.get("link")
                    
                    print(f"DEBUG: Extracted image_url: {image_url}")
                    
                    # Convert to full Rocket.Chat URLs
                    rocket_url = os.getenv('ROCKET_CHAT_URL', 'http://10.68.0.49:30082')
                    if image_url and not image_url.startswith("http"):
                        # Convert to full Rocket.Chat URL
                        image_url = f"{rocket_url}{image_url if image_url.startswith('/') else '/' + image_url}"
                        print(f"DEBUG: Converted to full URL: {image_url}")
                    elif image_url and image_url.startswith("http"):
                        # Already full URL, use as is
                        print(f"DEBUG: Using full URL as is: {image_url}")
                    print(f"DEBUG: Final image_url: {image_url}")
                    
                    # Get file type and size - use image_type if available
                    attachment_type = att.get("image_type") or att.get("type", "application/octet-stream")
                    attachment_size = att.get("image_size") or att.get("size") or att.get("size_bytes") or att.get("sizeLength") or 0
                    
                    # Check if we have a base64 preview
                    image_preview = att.get("image_preview")
                    
                    attachment_data = {
                        "id": att.get("_id", ""),
                        "title": att.get("title", ""),
                        "filename": att.get("title") or att.get("filename", ""),
                        "url": image_url,
                        "type": attachment_type,  # Use image_type to correctly identify images
                        "size": attachment_size,
                        "preview": f"data:image/jpeg;base64,{image_preview}" if image_preview else None
                    }
                    
                    print(f"DEBUG: Attachment data: {attachment_data}")
                    attachments.append(attachment_data)
            
            # Also check for file field (single file uploads)
            if msg.get("file"):
                rocket_url = os.getenv('ROCKET_CHAT_URL', 'http://10.68.0.49:30082')
                file_data = msg["file"]
                file_url = file_data.get("url", "")
                if file_url and not file_url.startswith("http"):
                    file_url = f"{rocket_url}{file_url if file_url.startswith('/') else '/' + file_url}"
                
                attachments.append({
                    "id": file_data.get("_id", ""),
                    "title": file_data.get("name", ""),
                    "filename": file_data.get("name", ""),
                    "url": file_url,
                    "type": file_data.get("type", "application/octet-stream"),
                    "size": file_data.get("size", 0),
                    "preview": None
                })
            
            formatted_message = {
                "id": msg.get("_id", f"msg-{i}"),
                "text": message_text,
                "user": {
                    "id": user_data.get("_id", "unknown"),
                    "username": user_data.get("username", "Unknown"),
                    "name": user_data.get("name") or user_data.get("username", "Unknown User")
                },
                "timestamp": timestamp,
                "edited_at": msg.get("_updatedAt") if msg.get("_updatedAt") else None,
                "reactions": reactions,
                "thread_count": thread_count,
                "thread_ts": msg.get("tmid"),
                "thread_messages": thread_messages,  # Include thread messages
                "type": "system" if is_system_event else "message",
                "attachments": attachments if attachments else None
            }
            formatted_messages.append(formatted_message)
        
        # Reverse to show oldest first (like chat history)
        formatted_messages.reverse()
        
        print(f"DEBUG: Returning {len(formatted_messages)} formatted messages with threads and reactions")
        return formatted_messages
        
    except Exception as e:
        print(f"Error getting channel messages: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get messages: {str(e)}")

@app.post("/api/rocket-chat/send-channel-message/{channel_identifier}")
async def send_message_to_any_channel(
    channel_identifier: str,
    message_data: dict,
    channel_type: str = "channel",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send message to any channel or private group"""
    try:
        print(f"DEBUG: Sending message to {channel_type}: {channel_identifier} from user: {current_user.email}")
        print(f"DEBUG: Message data received: {message_data}")
        
        # Get user-specific headers for API calls
        user_headers = await rocket_client.get_user_headers(
            social_hub_user_email=current_user.email,
            social_hub_user_name=current_user.full_name,
            social_hub_user_id=str(current_user.id),
            db_session=db
        )
        
        # Send message to the specified channel
        message_text = message_data.get("text", message_data.get("content", ""))
        attachments = message_data.get("attachments", [])
        print(f"DEBUG: Extracted message text: '{message_text}'")
        print(f"DEBUG: Attachments: {len(attachments)} file(s)")
        print(f"DEBUG: Attachment data: {attachments}")
        result = await rocket_client.send_message_to_channel(channel_identifier, message_text, user_headers, attachments, channel_type)
        print(f"DEBUG: Send message result: {result}")
        
        if result.get('success'):
            return {"success": True, "message": "Message sent successfully"}
        else:
            raise HTTPException(status_code=500, detail=f"Failed to send message: {result.get('error', 'Unknown error')}")
            
    except Exception as e:
        print(f"Error sending message to channel: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send message: {str(e)}")

# Rocket.Chat SSO endpoint
@app.post("/api/rocket-chat/sso-url")
async def generate_rocket_chat_sso_url(
    sso_request: dict,
    current_user: User = Depends(get_current_user)
):
    """
    Generate SSO URL for user to auto-login to Rocket.Chat
    Creates user in Rocket.Chat if they don't exist
    """
    try:
        user_email = current_user.email
        user_name = current_user.full_name
        user_id = str(current_user.id)
        
        print(f"Generating SSO URL for user: {user_email}")
        
        # First ensure the user is authenticated with Rocket.Chat
        authenticated = await rocket_client.ensure_authenticated(
            social_hub_user_email=user_email,
            social_hub_user_name=user_name,
            social_hub_user_id=user_id
        )
        
        if not authenticated:
            raise HTTPException(status_code=401, detail="Failed to authenticate with Rocket.Chat")
        
        # Generate SSO URL using Rocket.Chat client
        result = await rocket_client.generate_sso_url(user_email, user_name, user_id)
        
        if result.get('success'):
            return {
                "success": True,
                "rocketChatUrl": result.get('url'),
                "message": "SSO URL generated successfully"
            }
        else:
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to generate SSO URL: {result.get('error', 'Unknown error')}"
            )
            
    except Exception as e:
        print(f"Error generating SSO URL: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to generate SSO URL: {str(e)}"
        )

# Enhanced Rocket.Chat endpoints for the widget

@app.post("/api/rocket-chat/send-post-message")
async def send_post_message(
    message_data: dict,
    current_user: User = Depends(get_current_user)
):
    """Send a post message to a room"""
    try:
        room_id = message_data.get("roomId")
        content = message_data.get("content")
        attachments = message_data.get("attachments", [])
        
        if not room_id or not content:
            raise HTTPException(status_code=400, detail="Room ID and content are required")
        
        result = await rocket_client.send_post_message(room_id, content, attachments)
        
        if result.get('success'):
            return {"success": True, "message": "Post message sent successfully"}
        else:
            raise HTTPException(status_code=500, detail=f"Failed to send post message: {result.get('error', 'Unknown error')}")
            
    except Exception as e:
        print(f"Error sending post message: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send post message: {str(e)}")

@app.post("/api/rocket-chat/send-thread-message")
async def send_thread_message(
    message_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a message to a thread"""
    try:
        print(f"DEBUG: Sending thread message for user: {current_user.email}")
        
        room_id = message_data.get("roomId")
        thread_id = message_data.get("threadId")
        content = message_data.get("content")
        
        if not room_id or not thread_id or not content:
            raise HTTPException(status_code=400, detail="Room ID, thread ID, and content are required")
        
        # Get user-specific headers for API calls
        user_headers = await rocket_client.get_user_headers(
            social_hub_user_email=current_user.email,
            social_hub_user_name=current_user.full_name,
            social_hub_user_id=str(current_user.id),
            db_session=db
        )
        
        result = await rocket_client.send_thread_message(room_id, thread_id, content, user_headers)
        
        if result.get('success'):
            return {"success": True, "message": "Thread message sent successfully"}
        else:
            raise HTTPException(status_code=500, detail=f"Failed to send thread message: {result.get('error', 'Unknown error')}")
            
    except Exception as e:
        print(f"Error sending thread message: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send thread message: {str(e)}")

@app.post("/api/rocket-chat/add-reaction")
async def add_reaction(
    reaction_data: dict,
    current_user: User = Depends(get_current_user)
):
    """Add a reaction to a message"""
    try:
        message_id = reaction_data.get("messageId")
        emoji = reaction_data.get("emoji")
        
        if not message_id or not emoji:
            raise HTTPException(status_code=400, detail="Message ID and emoji are required")
        
        result = await rocket_client.add_reaction(message_id, emoji)
        
        if result.get('success'):
            return {"success": True, "message": "Reaction added successfully"}
        else:
            raise HTTPException(status_code=500, detail=f"Failed to add reaction: {result.get('error', 'Unknown error')}")
            
    except Exception as e:
        print(f"Error adding reaction: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to add reaction: {str(e)}")

@app.post("/api/rocket-chat/remove-reaction")
async def remove_reaction(
    reaction_data: dict,
    current_user: User = Depends(get_current_user)
):
    """Remove a reaction from a message"""
    try:
        message_id = reaction_data.get("messageId")
        emoji = reaction_data.get("emoji")
        
        if not message_id or not emoji:
            raise HTTPException(status_code=400, detail="Message ID and emoji are required")
        
        result = await rocket_client.remove_reaction(message_id, emoji)
        
        if result.get('success'):
            return {"success": True, "message": "Reaction removed successfully"}
        else:
            raise HTTPException(status_code=500, detail=f"Failed to remove reaction: {result.get('error', 'Unknown error')}")
            
    except Exception as e:
        print(f"Error removing reaction: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to remove reaction: {str(e)}")

@app.get("/api/rocket-chat/thread-messages")
async def get_thread_messages(
    room_id: str,
    thread_id: str,
    limit: int = 50,
    current_user: User = Depends(get_current_user)
):
    """Get messages from a thread"""
    try:
        messages = await rocket_client.get_thread_messages(room_id, thread_id, limit)
        
        # Format messages for frontend
        formatted_messages = []
        for msg in messages:
            if not isinstance(msg, dict):
                continue
                
            user_data = msg.get("u", {})
            timestamp = msg.get("ts", "")
            
            if isinstance(timestamp, dict):
                timestamp = timestamp.get("$date", "")
            elif timestamp:
                timestamp = str(timestamp)
            else:
                timestamp = "2024-01-01T00:00:00.000Z"
            
            formatted_message = {
                "id": msg.get("_id", f"msg_{len(formatted_messages)}"),
                "content": msg.get("msg", ""),
                "user": {
                    "id": user_data.get("_id", ""),
                    "name": user_data.get("name", "Unknown"),
                    "username": user_data.get("username", "unknown")
                },
                "timestamp": timestamp,
                "reactions": msg.get("reactions", {}),
                "thread_id": msg.get("tmid"),
                "is_thread": bool(msg.get("tmid"))
            }
            formatted_messages.append(formatted_message)
        
        return {"messages": formatted_messages}
        
    except Exception as e:
        print(f"Error getting thread messages: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get thread messages: {str(e)}")

@app.post("/api/rocket-chat/authenticate")
async def authenticate_rocket_chat(
    auth_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Authenticate user with Rocket.Chat and return credentials for popup"""
    try:
        print(f"DEBUG: Authenticating user {current_user.email} with Rocket.Chat")
        
        # First, try to ensure the user exists in Rocket.Chat
        authenticated = await rocket_client.ensure_authenticated(
            social_hub_user_email=current_user.email,
            social_hub_user_name=current_user.full_name,
            social_hub_user_id=str(current_user.id)
        )
        
        if not authenticated:
            print(f"DEBUG: Failed to authenticate user {current_user.email} with Rocket.Chat")
            raise HTTPException(status_code=401, detail="Failed to authenticate with Rocket.Chat")
        
        # Get user-specific headers for authentication
        user_headers = await rocket_client.get_user_headers(
            social_hub_user_email=current_user.email,
            social_hub_user_name=current_user.full_name,
            social_hub_user_id=str(current_user.id),
            db_session=db
        )
        
        if not user_headers:
            raise HTTPException(status_code=401, detail="Failed to get user credentials")
        
        # Extract username and auth token from headers
        username = user_headers.get('X-User-Id', current_user.username or current_user.email.split('@')[0])
        auth_token = user_headers.get('X-Auth-Token', '')
        
        if not auth_token:
            raise HTTPException(status_code=401, detail="No auth token available")
        
        print(f"DEBUG: Authentication successful for user {username}")
        
        return {
            "success": True,
            "username": username,
            "token": auth_token,
            "server_url": "http://10.68.0.49:30082"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error authenticating with Rocket.Chat: {e}")
        raise HTTPException(status_code=500, detail=f"Authentication failed: {str(e)}")

@app.post("/api/rocket-chat/upload-files")
async def upload_files(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload files and return file information"""
    try:
        # Parse form data to get files
        form = await request.form()
        files = []
        
        # Extract files from form data (file_0, file_1, etc.)
        for key, value in form.items():
            if key.startswith('file_') and hasattr(value, 'filename'):
                files.append(value)
        
        print(f"DEBUG: Uploading {len(files)} files for user {current_user.email}")
        
        uploaded_files = []
        
        for file in files:
            # Validate file size (10MB limit)
            if file.size > 10 * 1024 * 1024:
                raise HTTPException(status_code=400, detail=f"File {file.filename} is too large (max 10MB)")
            
            # Generate unique filename
            import uuid
            file_extension = file.filename.split('.')[-1] if '.' in file.filename else ''
            unique_filename = f"{uuid.uuid4()}.{file_extension}"
            
            # Save file to uploads directory
            upload_dir = "uploads/chat_images"
            os.makedirs(upload_dir, exist_ok=True)
            file_path = os.path.join(upload_dir, unique_filename)
            
            with open(file_path, "wb") as buffer:
                content = await file.read()
                buffer.write(content)
            
            # Create file info with full URL
            file_info = {
                "id": str(uuid.uuid4()),
                "filename": file.filename,
                "size": file.size,
                "url": f"http://localhost:8000/uploads/chat_images/{unique_filename}",
                "type": file.content_type or "application/octet-stream",
                "uploaded_at": datetime.utcnow().isoformat()
            }
            
            uploaded_files.append(file_info)
            print(f"DEBUG: File uploaded: {file.filename} -> {file_path}")
        
        return {
            "success": True,
            "files": uploaded_files,
            "message": f"Successfully uploaded {len(uploaded_files)} file(s)"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error uploading files: {e}")
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

@app.get("/api/rocket-chat/search-messages")
async def search_messages(
    query: str,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Search for messages across all channels and DMs using Social Hub's built-in search"""
    try:
        print(f"DEBUG: Searching for '{query}' for user: {current_user.email}")
        
        # Get user-specific headers for API calls
        user_headers = await rocket_client.get_user_headers(
            social_hub_user_email=current_user.email,
            social_hub_user_name=current_user.full_name,
            social_hub_user_id=str(current_user.id),
            db_session=db
        )
        
        if not user_headers:
            raise HTTPException(status_code=401, detail="Failed to get user authentication")
        
        # Get all rooms the user has access to
        rooms = await rocket_client.get_all_user_rooms(user_headers=user_headers)
        
        # Search through all channels and DMs
        all_messages = []
        
        # Search in channels
        for channel in rooms.get('channels', []):
            try:
                channel_name = channel.get('name')
                channel_id = channel.get('id')
                messages = await rocket_client.get_channel_messages(channel_name, count=200)
                for msg in messages:
                    msg['room_id'] = channel_id
                    msg['room_name'] = channel.get('name', '')
                    msg['room_type'] = 'channel'
                    all_messages.append(msg)
            except Exception as e:
                print(f"DEBUG: Error getting messages from channel {channel.get('name')}: {e}")
                continue
        
        # Search in groups (private groups)
        for group in rooms.get('groups', []):
            try:
                group_name = group.get('name')
                group_id = group.get('id')
                messages = await rocket_client.get_channel_messages(group_name, count=200, channel_type='private_group')
                for msg in messages:
                    msg['room_id'] = group_id
                    msg['room_name'] = group.get('name', '')
                    msg['room_type'] = 'private_group'
                    all_messages.append(msg)
            except Exception as e:
                print(f"DEBUG: Error getting messages from group {group.get('name')}: {e}")
                continue
        
        # Search in DMs
        for dm in rooms.get('direct_messages', []):
            try:
                dm_name = dm.get('name')
                dm_id = dm.get('id')
                messages = await rocket_client.get_dm_messages(dm_name, count=200, user_headers=user_headers)
                for msg in messages:
                    msg['room_id'] = dm_id
                    msg['room_name'] = dm.get('display_name', '')
                    msg['room_type'] = 'direct_message'
                    all_messages.append(msg)
            except Exception as e:
                print(f"DEBUG: Error getting messages from DM {dm.get('name')}: {e}")
                continue
        
        # Filter messages by search query
        query_lower = query.lower()
        matching_messages = []
        
        for msg in all_messages:
            message_text = msg.get('msg', '').lower()
            if query_lower in message_text:
                # Format message for frontend
                user_data = msg.get("u", {})
                timestamp = msg.get("ts", "")
                
                if isinstance(timestamp, dict):
                    timestamp = timestamp.get("$date", "")
                elif timestamp:
                    timestamp = str(timestamp)
                else:
                    timestamp = "2024-01-01T00:00:00.000Z"
                
                formatted_message = {
                    "id": msg.get("_id", ""),
                    "text": msg.get("msg", ""),
                    "content": msg.get("msg", ""),
                    "sender": user_data.get("username", "unknown"),
                    "user": {
                        "id": user_data.get("_id", ""),
                        "username": user_data.get("username", "unknown"),
                        "name": user_data.get("name", user_data.get("username", "Unknown User"))
                    },
                    "timestamp": timestamp,
                    "edited_at": msg.get("_updatedAt"),
                    "reactions": msg.get("reactions", {}),
                    "thread_count": msg.get("tcount", 0),
                    "room_id": msg.get("room_id", ""),
                    "room_name": msg.get("room_name", ""),
                    "room_type": msg.get("room_type", "")
                }
                
                matching_messages.append(formatted_message)
        
        # Sort by timestamp (most recent first) and limit results
        matching_messages.sort(key=lambda x: x['timestamp'], reverse=True)
        matching_messages = matching_messages[:limit]
        
        print(f"DEBUG: Found {len(matching_messages)} messages matching '{query}'")
        
        return {
            "success": True,
            "messages": matching_messages,
            "count": len(matching_messages)
        }
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error searching messages: {e}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

# Group Management Endpoints

@app.post("/groups", response_model=GroupResponse)
async def create_group_endpoint(
    group_data: GroupCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new private group"""
    try:
        # Get user-specific headers for Rocket.Chat API calls
        user_headers = await rocket_client.get_user_headers(
            social_hub_user_email=current_user.email,
            social_hub_user_name=current_user.full_name,
            social_hub_user_id=str(current_user.id),
            db_session=db
        )
        
        # Create the group in Rocket.Chat first
        rocket_group_result = await rocket_client.create_private_group(
            group_name=group_data.name,
            members=[],  # Start with empty members, add creator later
            user_headers=user_headers
        )
        
        if not rocket_group_result.get('success'):
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to create Rocket.Chat group: {rocket_group_result.get('error', 'Unknown error')}"
            )
        
        # Create the group in our database with Rocket.Chat group ID
        rocket_group_id = rocket_group_result.get('group_id')
        group = create_group(db, group_data.dict(), current_user.id, rocket_group_id)
        
        # Add the creator to the Rocket.Chat group so they can see it in their subscriptions
        creator_username = current_user.email.split('@')[0]
        add_creator_result = await rocket_client.add_member_to_group(
            group_id=rocket_group_id,
            username=creator_username,
            user_headers=user_headers
        )
        
        if not add_creator_result.get('success'):
            print(f"⚠️ Warning: Failed to add creator to Rocket.Chat group: {add_creator_result.get('error', 'Unknown error')}")
        else:
            print(f"✅ Successfully added creator '{creator_username}' to Rocket.Chat group")
        
        # Get group members for response
        members = get_group_members(db, group.id)
        member_responses = [UserResponse.from_orm(member.user) for member in members]
        
        return GroupResponse(
            id=group.id,
            name=group.name,
            description=group.description,
            created_by=group.created_by,
            created_at=group.created_at,
            members=member_responses,
            member_count=len(member_responses)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create group: {str(e)}")

@app.get("/groups", response_model=List[GroupResponse])
def get_user_groups_endpoint(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all groups for the current user"""
    try:
        groups = get_user_groups(db, current_user.id)
        group_responses = []
        
        for group in groups:
            members = get_group_members(db, group.id)
            member_responses = [UserResponse.from_orm(member.user) for member in members]
            
            group_responses.append(GroupResponse(
                id=group.id,
                name=group.name,
                description=group.description,
                created_by=group.created_by,
                created_at=group.created_at,
                members=member_responses,
                member_count=len(member_responses)
            ))
        
        return group_responses
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get groups: {str(e)}")

@app.get("/groups/{group_id}", response_model=GroupResponse)
def get_group_endpoint(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific group by ID"""
    try:
        group = get_group_by_id(db, group_id)
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")
        
        # Check if user is a member
        if not is_user_in_group(db, group_id, current_user.id):
            raise HTTPException(status_code=403, detail="Access denied: You are not a member of this group")
        
        members = get_group_members(db, group.id)
        member_responses = [UserResponse.from_orm(member.user) for member in members]
        
        return GroupResponse(
            id=group.id,
            name=group.name,
            description=group.description,
            created_by=group.created_by,
            created_at=group.created_at,
            members=member_responses,
            member_count=len(member_responses)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get group: {str(e)}")

@app.put("/groups/{group_id}", response_model=GroupResponse)
def update_group_endpoint(
    group_id: int,
    group_data: GroupUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update group information (only by creator)"""
    try:
        group = get_group_by_id(db, group_id)
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")
        
        # Check if user is the creator
        if group.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied: Only the group creator can update the group")
        
        # Update the group
        updated_group = update_group(db, group_id, group_data.dict(exclude_unset=True))
        if not updated_group:
            raise HTTPException(status_code=404, detail="Group not found")
        
        # Get updated group members
        members = get_group_members(db, updated_group.id)
        member_responses = [UserResponse.from_orm(member.user) for member in members]
        
        return GroupResponse(
            id=updated_group.id,
            name=updated_group.name,
            description=updated_group.description,
            created_by=updated_group.created_by,
            created_at=updated_group.created_at,
            members=member_responses,
            member_count=len(member_responses)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update group: {str(e)}")

@app.delete("/groups/{group_id}")
def delete_group_endpoint(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a group (only by creator)"""
    try:
        group = get_group_by_id(db, group_id)
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")
        
        # Check if user is the creator
        if group.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied: Only the group creator can delete the group")
        
        success = delete_group(db, group_id)
        if not success:
            raise HTTPException(status_code=404, detail="Group not found")
        
        return {"message": "Group deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete group: {str(e)}")

@app.post("/groups/{group_id}/members", response_model=GroupMemberResponse)
async def add_member_to_group_endpoint(
    group_id: int,
    member_data: GroupMemberAdd,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a member to a group"""
    try:
        group = get_group_by_id(db, group_id)
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")
        
        # Check if current user is a member of the group
        if not is_user_in_group(db, group_id, current_user.id):
            raise HTTPException(status_code=403, detail="Access denied: You are not a member of this group")
        
        # Find the user to add
        user_to_add = get_user_by_email(db, member_data.user_email)
        if not user_to_add:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get user-specific headers for Rocket.Chat API calls
        user_headers = await rocket_client.get_user_headers(
            social_hub_user_email=current_user.email,
            social_hub_user_name=current_user.full_name,
            social_hub_user_id=str(current_user.id),
            db_session=db
        )
        
        # Add the user to the Rocket.Chat group if we have the group ID
        if group.rocket_chat_group_id:
            # Get the user's Rocket.Chat username
            rocket_username = user_to_add.email.split('@')[0]
            
            # Add member to Rocket.Chat group
            rocket_result = await rocket_client.add_member_to_group(
                group_id=group.rocket_chat_group_id,
                username=rocket_username,
                user_headers=user_headers
            )
            
            if not rocket_result.get('success'):
                raise HTTPException(
                    status_code=500, 
                    detail=f"Failed to add member to Rocket.Chat group: {rocket_result.get('error', 'Unknown error')}"
                )
        
        # Add the user to the group in our database
        member = add_member_to_group(db, group_id, user_to_add.id)
        if not member:
            raise HTTPException(status_code=400, detail="User is already a member of this group")
        
        return GroupMemberResponse(
            id=member.id,
            group_id=member.group_id,
            user_id=member.user_id,
            joined_at=member.joined_at,
            user=UserResponse.from_orm(member.user)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add member: {str(e)}")

@app.delete("/groups/{group_id}/members/{user_id}")
def remove_member_from_group_endpoint(
    group_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a member from a group"""
    try:
        group = get_group_by_id(db, group_id)
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")
        
        # Check if current user is the creator or the member being removed
        if group.created_by != current_user.id and current_user.id != user_id:
            raise HTTPException(status_code=403, detail="Access denied: Only the group creator or the member themselves can remove members")
        
        # Check if the user is actually a member
        if not is_user_in_group(db, group_id, user_id):
            raise HTTPException(status_code=404, detail="User is not a member of this group")
        
        # Prevent creator from removing themselves
        if group.created_by == user_id:
            raise HTTPException(status_code=400, detail="Group creator cannot remove themselves from the group")
        
        success = remove_member_from_group(db, group_id, user_id)
        if not success:
            raise HTTPException(status_code=404, detail="User is not a member of this group")
        
        return {"message": "Member removed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to remove member: {str(e)}")

@app.get("/groups/{group_id}/members", response_model=List[GroupMemberResponse])
def get_group_members_endpoint(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all members of a group"""
    try:
        group = get_group_by_id(db, group_id)
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")
        
        # Check if user is a member
        if not is_user_in_group(db, group_id, current_user.id):
            raise HTTPException(status_code=403, detail="Access denied: You are not a member of this group")
        
        members = get_group_members(db, group_id)
        return [
            GroupMemberResponse(
                id=member.id,
                group_id=member.group_id,
                user_id=member.user_id,
                joined_at=member.joined_at,
                user=UserResponse.from_orm(member.user)
            )
            for member in members
        ]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get group members: {str(e)}")

@app.get("/users/search", response_model=List[UserSearchResponse])
def search_users_endpoint(
    query: str,
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Search for users by name or email"""
    try:
        if len(query.strip()) < 2:
            raise HTTPException(status_code=400, detail="Query must be at least 2 characters long")
        
        users = search_users(db, query.strip(), limit)
        return [
            UserSearchResponse(
                id=user.id,
                full_name=user.full_name,
                email=user.email,
                profile_picture_url=user.profile_picture_url
            )
            for user in users
        ]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to search users: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
