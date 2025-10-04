"""
Script to fix profile picture URLs that have incorrect port numbers
"""
import os
import sys
sys.path.append('/Users/ankushchhabra/Downloads/Social-Hub/backend')

try:
    from sqlalchemy import create_engine, text
    from sqlalchemy.orm import sessionmaker
    
    # Database configuration (same as in database.py)
    DATABASE_URL = "sqlite:///./social_hub.db"
    
    # Create engine and session
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    def fix_profile_picture_urls():
        """Update all profile picture URLs from port 8001 to 8000"""
        db = SessionLocal()
        try:
            # Update URLs that use port 8001 to use port 8000
            result = db.execute(text("""
                UPDATE users 
                SET profile_picture_url = REPLACE(profile_picture_url, 'localhost:8001', 'localhost:8000')
                WHERE profile_picture_url LIKE '%localhost:8001%'
            """))
            
            db.commit()
            print(f"✅ Updated {result.rowcount} profile picture URLs from port 8001 to 8000")
            
            # Show current URLs
            users_with_pics = db.execute(text("""
                SELECT id, full_name, profile_picture_url 
                FROM users 
                WHERE profile_picture_url IS NOT NULL
            """)).fetchall()
            
            print("\n📸 Current profile picture URLs:")
            for user in users_with_pics:
                print(f"  User {user[0]} ({user[1]}): {user[2]}")
                
        except Exception as e:
            db.rollback()
            print(f"❌ Error updating URLs: {e}")
        finally:
            db.close()
    
    if __name__ == "__main__":
        fix_profile_picture_urls()
        
except ImportError as e:
    print(f"❌ Missing dependencies: {e}")
    print("This script needs to be run in an environment with SQLAlchemy installed")