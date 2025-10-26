from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List
from enum import Enum

# Auth provider enum
class AuthProvider(str, Enum):
    LOCAL = "local"
    GOOGLE = "google"

# Request models
class UserRegistration(BaseModel):
    full_name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class GoogleAuthRequest(BaseModel):
    token: str  # Google ID token

class UserProfileUpdate(BaseModel):
    full_name: str
    bio: Optional[str] = None
    education_school: Optional[str] = None
    education_degree: Optional[str] = None
    location: Optional[str] = None
    phone: Optional[str] = None
    # Email is not editable - it's tied to authentication provider

# Response models
class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    bio: Optional[str] = None
    education_school: Optional[str] = None
    education_degree: Optional[str] = None
    location: Optional[str] = None
    phone: Optional[str] = None
    auth_provider: AuthProvider
    profile_picture_url: Optional[str] = None
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class RocketChatCredentials(BaseModel):
    rocket_chat_user_id: str
    rocket_chat_auth_token: str
    rocket_chat_username: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse
    rocket_chat: Optional[RocketChatCredentials] = None

class Message(BaseModel):
    message: str

# Chat-related models
class ChatMessageCreate(BaseModel):
    content: str

class ChatMessageResponse(BaseModel):
    id: str
    user_id: str
    username: str
    message: str
    timestamp: datetime
    avatar_url: Optional[str] = None
    
    class Config:
        from_attributes = True

# Group-related schemas
class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None

class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class GroupMemberAdd(BaseModel):
    user_email: str

class GroupMemberRemove(BaseModel):
    user_id: int

class GroupResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    created_by: int
    created_at: datetime
    members: List[UserResponse]
    member_count: int
    
    class Config:
        from_attributes = True

class GroupMemberResponse(BaseModel):
    id: int
    group_id: int
    user_id: int
    joined_at: datetime
    user: UserResponse
    
    class Config:
        from_attributes = True

class UserSearchResponse(BaseModel):
    id: int
    full_name: str
    email: str
    profile_picture_url: Optional[str] = None
    
    class Config:
        from_attributes = True
