from sqlalchemy.orm import Session
from database import User, AuthProvider
from auth import get_password_hash, verify_password
from schemas import UserRegistration
from typing import Optional, Dict, Any

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
