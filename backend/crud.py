from sqlalchemy.orm import Session
from sqlalchemy import desc
from database import User, ChatMessage, AuthProvider
from auth import get_password_hash, verify_password
from schemas import UserRegistration, ChatMessageCreate
from typing import Optional, Dict, Any, List
from datetime import datetime

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Get user by email"""
    return db.query(User).filter(User.email == email).first()

def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    """Get user by ID"""
    return db.query(User).filter(User.id == user_id).first()

def get_user_by_google_id(db: Session, google_id: str) -> Optional[User]:
    """Get user by Google ID"""
    return db.query(User).filter(User.google_id == google_id).first()

def create_user(db: Session, user: UserRegistration) -> User:
    """Create a new user"""
    hashed_password = get_password_hash(user.password)
    db_user = User(
        full_name=user.full_name,
        email=user.email,
        hashed_password=hashed_password,
        auth_provider=AuthProvider.LOCAL
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def create_google_user(db: Session, user_data: Dict[str, Any]) -> User:
    """Create a new Google user"""
    db_user = User(
        full_name=user_data["full_name"],
        email=user_data["email"],
        google_id=user_data["google_id"],
        profile_picture_url=user_data.get("profile_picture_url"),
        auth_provider=AuthProvider.GOOGLE,
        hashed_password=None  # No password for Google users
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """Authenticate user with email and password"""
    user = get_user_by_email(db, email)
    if not user:
        return None
    if user.auth_provider == AuthProvider.GOOGLE:
        return None  # Google users can't login with password
    if not user.hashed_password or not verify_password(password, user.hashed_password):
        return None
    return user

# Chat CRUD operations
def create_chat_message(db: Session, user_id: int, message_data: ChatMessageCreate) -> ChatMessage:
    """Create a new chat message"""
    db_message = ChatMessage(
        user_id=user_id,
        message=message_data.content
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return db_message

def get_recent_chat_messages(db: Session, limit: int = 50) -> List[ChatMessage]:
    """Get recent chat messages"""
    return db.query(ChatMessage).order_by(desc(ChatMessage.created_at)).limit(limit).all()

def get_chat_messages_after(db: Session, after_timestamp: datetime, limit: int = 100) -> List[ChatMessage]:
    """Get chat messages after a specific timestamp"""
    return (db.query(ChatMessage)
            .filter(ChatMessage.created_at > after_timestamp)
            .order_by(ChatMessage.created_at)
            .limit(limit)
            .all())
