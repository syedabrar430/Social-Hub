#!/usr/bin/env python3
"""
Helper script to reset a user's password
Usage: python3 reset_password.py <email> <new_password>
"""

import sys
from database import SessionLocal, User
from auth import get_password_hash

def reset_password(email: str, new_password: str):
    """Reset a user's password"""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            print(f"❌ User with email '{email}' not found")
            return False
        
        if user.auth_provider.value != 'local':
            print(f"❌ User '{email}' uses {user.auth_provider.value} authentication, password cannot be reset")
            return False
        
        # Hash the new password
        new_hashed_password = get_password_hash(new_password)
        
        # Update the user's password
        user.hashed_password = new_hashed_password
        db.commit()
        
        print(f"✅ Password successfully reset for user '{email}'")
        print(f"   Name: {user.full_name}")
        print(f"   New password: {new_password}")
        return True
        
    except Exception as e:
        print(f"❌ Error resetting password: {e}")
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python3 reset_password.py <email> <new_password>")
        print("\nExample:")
        print("  python3 reset_password.py syed.abrar430@gmail.com newpassword123")
        sys.exit(1)
    
    email = sys.argv[1]
    new_password = sys.argv[2]
    
    print(f"🔄 Resetting password for '{email}'...")
    reset_password(email, new_password)
