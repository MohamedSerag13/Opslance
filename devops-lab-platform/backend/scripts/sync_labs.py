import os
import sys
import json

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, engine
from models import Base, Lab

def sync_labs():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    labs_dir = "/labs-repo"
    if not os.path.exists(labs_dir):
        print(f"Directory {labs_dir} does not exist. Is the volume mounted?")
        db.close()
        return

    added = 0
    updated = 0
    for root_dir, _, files in os.walk(labs_dir):
        if "docker-compose.yml" in files:
            meta = {}
            if "metadata.json" in files:
                meta_path = os.path.join(root_dir, "metadata.json")
                try:
                    with open(meta_path) as f:
                        meta = json.load(f)
                except Exception as e:
                    print(f"Error parsing {meta_path}: {e}")
            
            item = os.path.basename(root_dir)
            lab_id = meta.get("id", item)
            lab = db.query(Lab).filter_by(id=lab_id).first()
            
            if not lab:
                title = meta.get("title")
                if not title:
                    title = item.replace("-", " ").title()
                    
                lab = Lab(
                    id=lab_id,
                    module_number=meta.get("module_number", 0),
                    module_title=meta.get("module_title", "Uncategorized"),
                    title=title,
                    difficulty=meta.get("difficulty", "beginner"),
                    estimated_minutes=meta.get("estimated_minutes", 30),
                    points=meta.get("points", 10),
                    category=meta.get("category", "linux"),
                    description=meta.get("description", "")
                )
                db.add(lab)
                added += 1
            else:
                if "title" in meta:
                    lab.title = meta["title"]
                updated += 1
    db.commit()
    db.close()
    print(f"Sync complete: {added} added, {updated} updated.")

if __name__ == "__main__":
    sync_labs()
