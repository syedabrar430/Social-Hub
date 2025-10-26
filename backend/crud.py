from sqlalchemy.orm import Session
from sqlalchemy import desc
from database import User, ChatMessage, AuthProvider, Group, GroupMember
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
    # Generate Rocket.Chat username from email
    rocket_chat_username = user.email.split('@')[0]
    
    db_user = User(
        full_name=user.full_name,
        email=user.email,
        hashed_password=hashed_password,
        auth_provider=AuthProvider.LOCAL,
        # Store Rocket.Chat credentials for SSO
        rocket_chat_username=rocket_chat_username,
        rocket_chat_password=user.password  # Store plain password for Rocket.Chat login
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

# Group-related CRUD functions
def create_group(db: Session, group_data: dict, creator_id: int) -> Group:
    """Create a new group"""
    db_group = Group(
        name=group_data["name"],
        description=group_data.get("description"),
        created_by=creator_id
    )
    db.add(db_group)
    db.flush()  # Get the ID
    
    # Add creator as first member
    creator_member = GroupMember(
        group_id=db_group.id,
        user_id=creator_id
    )
    db.add(creator_member)
    db.commit()
    db.refresh(db_group)
    return db_group

def get_group_by_id(db: Session, group_id: int) -> Optional[Group]:
    """Get group by ID"""
    return db.query(Group).filter(Group.id == group_id).first()

def get_user_groups(db: Session, user_id: int) -> List[Group]:
    """Get all groups for a user"""
    return (db.query(Group)
            .join(GroupMember)
            .filter(GroupMember.user_id == user_id)
            .order_by(desc(Group.created_at))
            .all())

def add_member_to_group(db: Session, group_id: int, user_id: int) -> Optional[GroupMember]:
    """Add a user to a group"""
    # Check if user is already a member
    existing_member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id
    ).first()
    
    if existing_member:
        return None  # User already in group
    
    member = GroupMember(
        group_id=group_id,
        user_id=user_id
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return member

def remove_member_from_group(db: Session, group_id: int, user_id: int) -> bool:
    """Remove a user from a group"""
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id
    ).first()
    
    if member:
        db.delete(member)
        db.commit()
        return True
    return False

def get_group_members(db: Session, group_id: int) -> List[GroupMember]:
    """Get all members of a group"""
    return (db.query(GroupMember)
            .filter(GroupMember.group_id == group_id)
            .all())

def search_users(db: Session, query: str, limit: int = 10) -> List[User]:
    """Search users by name or email"""
    search_term = f"%{query}%"
    return (db.query(User)
            .filter(
                (User.full_name.ilike(search_term)) |
                (User.email.ilike(search_term))
            )
            .filter(User.is_active == True)
            .limit(limit)
            .all())

def is_user_in_group(db: Session, group_id: int, user_id: int) -> bool:
    """Check if user is a member of the group"""
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id
    ).first()
    return member is not None

def update_group(db: Session, group_id: int, group_data: dict) -> Optional[Group]:
    """Update group information"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if group:
        if "name" in group_data:
            group.name = group_data["name"]
        if "description" in group_data:
            group.description = group_data["description"]
        group.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(group)
    return group

def delete_group(db: Session, group_id: int) -> bool:
    """Delete a group (only by creator)"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if group:
        db.delete(group)
        db.commit()
        return True
    return False
