import os
import json
import argparse
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models

def sync_labs():
    db = SessionLocal()
    labs_dir = os.environ.get("LABS_HOST_PATH", "./labs-repo")
    
    added = 0
    updated = 0
    skipped = 0

    for root, dirs, files in os.walk(labs_dir):
        if "docker-compose.yml" in files:
            if "metadata.json" not in files:
                print(f"⚠️  No metadata.json in {root} — skipping")
                skipped += 1
                continue
                
            try:
                with open(os.path.join(root, "metadata.json"), "r") as f:
                    meta = json.load(f)
                
                lab_id = meta["id"]
                existing_lab = db.query(models.Lab).filter_by(id=lab_id).first()
                
                lab_data = {
                    "module_number": meta.get("module_number", 0),
                    "module_title": meta.get("module_title", ""),
                    "title": meta.get("title", ""),
                    "difficulty": meta.get("difficulty", "beginner"),
                    "estimated_minutes": meta.get("estimated_minutes", 15),
                    "points": meta.get("points", 100),
                    "category": meta.get("category", ""),
                    "subcategory": meta.get("subcategory", ""),
                    "scenario": meta.get("scenario", ""),
                    "symptoms": json.dumps(meta.get("symptoms", [])),
                    "mission": meta.get("mission", ""),
                    "verification_command": meta.get("verification_command", ""),
                    "hints": json.dumps(meta.get("hints", [])),
                    "acceptance_criteria": json.dumps(meta.get("acceptance_criteria", []))
                }
                
                if existing_lab:
                    for key, value in lab_data.items():
                        setattr(existing_lab, key, value)
                    updated += 1
                else:
                    new_lab = models.Lab(id=lab_id, **lab_data)
                    db.add(new_lab)
                    added += 1
                    
            except Exception as e:
                print(f"Error parsing metadata in {root}: {e}")
                skipped += 1
                
    db.commit()
    db.close()
    
    print("=== Sync Summary ===")
    print(f"✅ Added:   {added}")
    print(f"🔄 Updated: {updated}")
    print(f"⏭ Skipped: {skipped}")

if __name__ == "__main__":
    sync_labs()
