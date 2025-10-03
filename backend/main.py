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
from database import get_db, create_tables, User
from schemas import UserRegistration, UserLogin, UserResponse, Token, Message, GoogleAuthRequest, UserProfileUpdate
from crud import create_user, authenticate_user, get_user_by_email, get_user_by_id, create_google_user, get_user_by_google_id
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
        profile_picture_url = f"http://localhost:8001/uploads/profile_pictures/{unique_filename}"
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
        messages = await rocket_client.get_channel_messages(channel_name)
        
        # Transform messages for frontend
        formatted_messages = []
        for msg in messages:
            user_data = msg.get("u", {})
            formatted_messages.append({
                "id": msg["_id"],
                "text": msg["msg"],
                "user": {
                    "id": user_data.get("_id", "unknown"),
                    "username": user_data.get("username", "Unknown"),
                    "name": user_data.get("name") or user_data.get("username", "Unknown User")
                },
                "timestamp": msg["ts"]
            })
        
        return {"messages": formatted_messages}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Get messages failed: {str(e)}")

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
