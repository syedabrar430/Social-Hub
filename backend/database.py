from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os
import enum

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
    
    # Additional profile fields
    education_school = Column(String(255), nullable=True)  # School/University
    education_degree = Column(String(255), nullable=True)  # Degree/Field of study
    location = Column(String(255), nullable=True)  # Location/City
    phone = Column(String(20), nullable=True)  # Phone number
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

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
