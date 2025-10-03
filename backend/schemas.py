from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional
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

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class Message(BaseModel):
    message: str
