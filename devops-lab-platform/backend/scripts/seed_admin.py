import os
import sys

# Add parent directory to path so we can import from backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine, SessionLocal
from models import Base, Group, Student

def seed_admin():
    # Initialize DB (create tables)
    Base.metadata.create_all(bind=engine)
    print("Database tables created.")
    
    # We do not store the admin in the DB as requested,
    # but we can initialize a default group if needed.
    # The admin credentials are in the .env file.
    
    db = SessionLocal()
    # Ensure there is at least one group
    if db.query(Group).count() == 0:
        db.add(Group(name="Default Group", description="Automatically created group"))
        db.commit()
        print("Created 'Default Group'.")
    db.close()
    
    print("Seeding complete. Admin credentials are read from environment variables.")

if __name__ == "__main__":
    seed_admin()
