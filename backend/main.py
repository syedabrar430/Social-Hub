from fastapi import FastAPI, HTTPException, Depends, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import Optional
import os
import uuid
import shutil
from pathlib import Path
from google.oauth2 import id_token
from google.auth.transport import requests

# Import our modules  
from database import get_db, create_tables, User, ChatMessage
from schemas import UserRegistration, UserLogin, UserResponse, Token, Message, GoogleAuthRequest, UserProfileUpdate, ChatMessageCreate, ChatMessageResponse
from crud import create_user, authenticate_user, get_user_by_email, get_user_by_id, create_google_user, get_user_by_google_id, create_chat_message, get_recent_chat_messages
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
async def get_current_user(
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
        print(f"DEBUG: Getting messages for channel: {channel_name}")
        messages = await rocket_client.get_channel_messages(channel_name)
        print(f"DEBUG: Raw messages from Rocket.Chat: {len(messages) if messages else 0} messages")
        print(f"DEBUG: First few messages: {messages[:2] if messages else 'No messages'}")
        
        # Transform messages for frontend
        formatted_messages = []
        for i, msg in enumerate(messages):
            try:
                if i < 3:  # Only debug first 3 messages
                    print(f"DEBUG: Message {i} type: {type(msg)}")
                if not isinstance(msg, dict):
                    if i < 3:
                        print(f"DEBUG: Skipping non-dict message {i}: {msg}")
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
                if i < 3:
                    print(f"DEBUG: Successfully formatted message {i}: {formatted_message['id']}")
                formatted_messages.append(formatted_message)
            except Exception as e:
                if i < 3:
                    print(f"DEBUG: Error formatting message {i}: {e}")
                    print(f"DEBUG: Message {i} that caused error: {msg}")
                continue
        
        print(f"DEBUG: Returning {len(formatted_messages)} formatted messages")
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
        print(f"DEBUG: Getting thread messages for parent ID: {parent_message_id}")
        messages = await rocket_client.get_thread_messages(parent_message_id)
        print(f"DEBUG: Raw thread messages from Rocket.Chat: {len(messages)} messages")
        if messages:
            print(f"DEBUG: First thread message: {messages[0]}")
        else:
            print("DEBUG: No thread messages found")
        
        # Transform messages for frontend (same as regular messages)
        formatted_messages = []
        for i, message in enumerate(messages):
            try:
                print(f"DEBUG: Processing thread message {i}: {message.get('_id', 'unknown')}")
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
                print(f"DEBUG: Successfully processed thread message {i}")
            except Exception as msg_error:
                print(f"ERROR: Failed to format thread message {i}: {msg_error}")
                print(f"ERROR: Message data: {message}")
                import traceback
                traceback.print_exc()
        
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
    current_user: User = Depends(get_current_user)
):
    """Add reaction to a message"""
    try:
        message_id = request_data.get('message_id')
        emoji = request_data.get('emoji')
        
        if not message_id or not emoji:
            raise HTTPException(status_code=400, detail="message_id and emoji are required")
        
        result = await rocket_client.add_reaction(message_id, emoji)
        
        if result.get("success"):
            return {"success": True}
        else:
            raise HTTPException(status_code=400, detail=result.get("error", "Failed to add reaction"))
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Add reaction failed: {str(e)}")

@app.post("/chat/remove-reaction")
async def remove_reaction(
    request_data: dict,
    current_user: User = Depends(get_current_user)
):
    """Remove reaction from a message"""
    try:
        message_id = request_data.get('message_id')
        emoji = request_data.get('emoji')
        
        if not message_id or not emoji:
            raise HTTPException(status_code=400, detail="message_id and emoji are required")
        
        result = await rocket_client.remove_reaction(message_id, emoji)
        
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
                "avatar": None
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
                
                formatted_message = {
                    "id": msg.get("_id", f"msg-{i}"),
                    "sender": "System" if is_system else (user_data.get("name") or user_data.get("username", "Unknown")),
                    "content": msg.get("msg", ""),
                    "timestamp": timestamp,
                    "isOwn": not is_system and user_data.get("username") == "ankush1",  # System messages are never own
                    "avatar": None,  # Rocket.Chat doesn't provide avatar URLs directly
                    "type": "system" if is_system else "message"
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
    limit: int = 50,
    current_user: User = Depends(get_current_user)
):
    """Get DM messages with a specific user"""
    try:
        print(f"DEBUG: Fetching DM messages with {username} for user: {current_user.email}")
        
        messages = await rocket_client.get_dm_messages(username, limit)
        print(f"DEBUG: Got {len(messages)} DM messages with {username}")
        
        # Convert to frontend format
        formatted_messages = []
        for i, msg in enumerate(messages):
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
                "id": msg.get("_id", f"dm-{i}"),
                "sender": user_data.get("name") or user_data.get("username", "Unknown"),
                "content": msg.get("msg", ""),
                "timestamp": timestamp,
                "isOwn": user_data.get("username") == "ankush1",
                "avatar": None,
                "type": "message"
            }
            formatted_messages.append(formatted_message)
        
        formatted_messages.reverse()
        return formatted_messages
        
    except Exception as e:
        print(f"Error getting DM messages with {username}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get DM messages: {str(e)}")

@app.get("/api/rocket-chat/dm-list")
async def get_dm_list(current_user: User = Depends(get_current_user)):
    """Get all DM conversations"""
    try:
        dm_list = await rocket_client.get_direct_messages_list()
        return {"dms": dm_list}
    except Exception as e:
        print(f"Error getting DM list: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get DM list: {str(e)}")

@app.post("/api/rocket-chat/send-dm")
async def send_dm_message(
    message_data: dict,
    current_user: User = Depends(get_current_user)
):
    """Send a direct message"""
    try:
        username = message_data.get("username")
        message = message_data.get("message")
        
        if not username or not message:
            raise HTTPException(status_code=400, detail="Username and message are required")
        
        result = await rocket_client.send_direct_message(username, message)
        
        if result.get("success"):
            return {"success": True, "message": "DM sent successfully"}
        else:
            raise HTTPException(status_code=500, detail=f"Failed to send DM: {result.get('error', 'Unknown error')}")
            
    except Exception as e:
        print(f"Error sending DM: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send DM: {str(e)}")

@app.get("/api/rocket-chat/user-rooms")
async def get_user_rooms(current_user: User = Depends(get_current_user)):
    """Get all rooms the user is part of"""
    try:
        rooms = await rocket_client.get_all_user_rooms()
        return rooms
    except Exception as e:
        print(f"Error getting user rooms: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get user rooms: {str(e)}")

@app.get("/api/rocket-chat/channels")
async def get_all_channels(current_user: User = Depends(get_current_user)):
    """Get all available channels and private groups"""
    try:
        print(f"DEBUG: Fetching all channels for user: {current_user.email}")
        channels = await rocket_client.get_all_conversations()
        print(f"DEBUG: Returning {len(channels)} channels")
        return channels
    except Exception as e:
        print(f"Error getting channels: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get channels: {str(e)}")

@app.get("/api/rocket-chat/channel-messages/{channel_identifier}")
async def get_channel_messages_by_id(
    channel_identifier: str,
    limit: int = 50,
    channel_type: str = "channel",
    current_user: User = Depends(get_current_user)
):
    """Get messages from any channel or private group by ID or name"""
    try:
        print(f"DEBUG: Fetching messages for {channel_type}: {channel_identifier} (user: {current_user.email})")
        
        # Get messages from the specified channel
        messages = await rocket_client.get_channel_messages(channel_identifier, limit, channel_type)
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
            
            formatted_message = {
                "id": msg.get("_id", f"msg-{i}"),
                "sender": "System" if is_system else (user_data.get("name") or user_data.get("username", "Unknown")),
                "content": msg.get("msg", ""),
                "timestamp": timestamp,
                "isOwn": not is_system and user_data.get("username") == "ankush1",
                "avatar": None,
                "type": "system" if is_system else "message"
            }
            formatted_messages.append(formatted_message)
        
        # Reverse to show oldest first (like chat history)
        formatted_messages.reverse()
        
        print(f"DEBUG: Returning {len(formatted_messages)} formatted messages")
        return formatted_messages
        
    except Exception as e:
        print(f"Error getting channel messages: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get messages: {str(e)}")

@app.post("/api/rocket-chat/send-channel-message/{channel_identifier}")
async def send_message_to_any_channel(
    channel_identifier: str,
    message_data: dict,
    channel_type: str = "channel",
    current_user: User = Depends(get_current_user)
):
    """Send message to any channel or private group"""
    try:
        print(f"DEBUG: Sending message to {channel_type}: {channel_identifier} from user: {current_user.email}")
        
        # Send message to the specified channel
        result = await rocket_client.send_message_to_channel(channel_identifier, message_data.get("content", ""))
        print(f"DEBUG: Send message result: {result}")
        
        if result.get('success'):
            return {"success": True, "message": "Message sent successfully"}
        else:
            raise HTTPException(status_code=500, detail=f"Failed to send message: {result.get('error', 'Unknown error')}")
            
    except Exception as e:
        print(f"Error sending message to channel: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send message: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
