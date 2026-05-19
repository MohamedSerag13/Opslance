import os
from database import SessionLocal, engine
from models import Base, Group

def seed():
    db = SessionLocal()
    
    # 2. Confirm env vars
    admin_email = os.getenv("ADMIN_EMAIL")
    admin_password = os.getenv("ADMIN_PASSWORD")
    
    if not admin_email or not admin_password:
        print("ERROR: ADMIN_EMAIL or ADMIN_PASSWORD environment variable is missing.")
        db.close()
        exit(1)
        
    print(f"Admin credentials configured successfully for: {admin_email}")
    
    # 3. Create Default Group
    default_group = db.query(Group).filter_by(name="Default Group").first()
    if not default_group:
        default_group = Group(name="Default Group")
        db.add(default_group)
        db.commit()
        print("Created 'Default Group'.")
    else:
        print("'Default Group' already exists.")
        
    db.close()
    print("\\n✅ Database seeded successfully.")
    print("You can now log in at http://localhost with your admin credentials.")

if __name__ == "__main__":
    seed()
