from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, Enum, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os
import enum
import uuid

# Database URL - using SQLite for simplicity
DATABASE_URL = "sqlite:///./social_hub.db"

# Create engine
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

# Create session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

# Auth provider enum
class AuthProvider(enum.Enum):
    LOCAL = "local"
    GOOGLE = "google"

# User model
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    bio = Column(String(500), nullable=True)  # User bio/description
    hashed_password = Column(String(255), nullable=True)  # Nullable for Google users
    google_id = Column(String(255), unique=True, nullable=True, index=True)  # Google user ID
    auth_provider = Column(Enum(AuthProvider), default=AuthProvider.LOCAL)  # Track auth method
    profile_picture_url = Column(String(500), nullable=True)  # For Google profile pics
    
    # Rocket.Chat credentials for SSO
    rocket_chat_username = Column(String(255), nullable=True)  # Rocket.Chat username
    rocket_chat_password = Column(String(255), nullable=True)  # Rocket.Chat password (same as Social Hub)
    
    # Additional profile fields
    education_school = Column(String(255), nullable=True)  # School/University
    education_degree = Column(String(255), nullable=True)  # Degree/Field of study
    location = Column(String(255), nullable=True)  # Location/City
    phone = Column(String(20), nullable=True)  # Phone number
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Chat Message model
class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationship to user
    user = relationship("User", back_populates="chat_messages")

# Group model
class Group(Base):
    __tablename__ = "groups"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    rocket_chat_group_id = Column(String(255), nullable=True)  # Rocket.Chat group ID
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    members = relationship("GroupMember", back_populates="group", cascade="all, delete-orphan")

# Group Member model
class GroupMember(Base):
    __tablename__ = "group_members"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    joined_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    group = relationship("Group", back_populates="members")
    user = relationship("User")
    
    # Ensure unique user per group
    __table_args__ = ({"extend_existing": True},)

# Pinned Message model
class PinnedMessage(Base):
    __tablename__ = "pinned_messages"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    message_id = Column(String(255), nullable=False, index=True)  # Rocket.Chat message ID
    room_id = Column(String(255), nullable=False, index=True)  # Rocket.Chat room ID
    room_name = Column(String(255), nullable=False)  # Room name (channel/group name)
    room_type = Column(String(50), nullable=False)  # 'channel', 'group', or 'dm'
    pinned_by = Column(Integer, ForeignKey("users.id"), nullable=False)  # Who pinned it
    message_text = Column(Text, nullable=True)  # Store message text for quick display
    pinned_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    pinner = relationship("User", foreign_keys=[pinned_by])
    
    # Ensure unique message per room
    __table_args__ = ({"extend_existing": True},)

# Add relationship to User model
User.chat_messages = relationship("ChatMessage", back_populates="user", order_by=ChatMessage.created_at)
User.groups = relationship("GroupMember", back_populates="user")
User.pinned_messages = relationship("PinnedMessage", foreign_keys=[PinnedMessage.pinned_by])

# Create tables
def create_tables():
    Base.metadata.create_all(bind=engine)

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
