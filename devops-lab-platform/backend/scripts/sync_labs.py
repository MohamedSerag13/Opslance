import os
import json
from database import SessionLocal
import models

def sync_labs():
    db = SessionLocal()
    
    # Robust path lookup fallback
    labs_dir = os.environ.get("LABS_HOST_PATH", "/labs-repo")
    if not os.path.exists(labs_dir):
        possible_paths = ["./labs", "../labs", "../../labs", "./labs-repo", "../labs-repo", "../../labs/linux/module-01-linux-fundamentals"]
        for path in possible_paths:
            if os.path.exists(path):
                labs_dir = path
                break

    print(f"🔍 Starting synchronization from: {labs_dir}")

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
                    "acceptance_criteria": json.dumps(meta.get("acceptance_criteria", [])),
                    "solution": ""
                }
                
                # Read README.md into description
                readme_path = os.path.join(root, "README.md")
                if os.path.exists(readme_path):
                    with open(readme_path, "r") as rf:
                        lab_data["description"] = rf.read()
                
                # Read SOLUTION.md into solution
                solution_path = os.path.join(root, "SOLUTION.md")
                if os.path.exists(solution_path):
                    with open(solution_path, "r") as sf:
                        lab_data["solution"] = sf.read()

                # Read check.sh into verification_script if it exists in the model
                if hasattr(models.Lab, 'verification_script'):
                    check_path = os.path.join(root, "check.sh")
                    if os.path.exists(check_path):
                        with open(check_path, "r") as cf:
                            lab_data["verification_script"] = cf.read()
                        
                if existing_lab:
                    for key, value in lab_data.items():
                        setattr(existing_lab, key, value)
                    updated += 1
                else:
                    new_lab = models.Lab(id=lab_id, **lab_data)
                    db.add(new_lab)
                    added += 1

                # Ensure this lab is visible for all groups to prevent 404 errors
                groups = db.query(models.Group).all()
                for group in groups:
                    gl = db.query(models.GroupLab).filter_by(group_id=group.id, lab_id=lab_id).first()
                    try:
                        parts = lab_id.split('-')
                        lab_num = int(parts[3])
                    except Exception:
                        lab_num = 1
                    order = meta.get("module_number", 1) * 10 + lab_num

                    if not gl:
                        new_gl = models.GroupLab(group_id=group.id, lab_id=lab_id, is_visible=True, unlock_order=order)
                        db.add(new_gl)
                    else:
                        gl.is_visible = True
                        gl.unlock_order = order
                    
            except Exception as e:
                print(f"Error parsing metadata in {root}: {e}")
                skipped += 1
                
    db.commit()
    db.close()
    
    print("\n=== Sync Summary ===")
    print(f"✅ Added:   {added}")
    print(f"🔄 Updated: {updated}")
    print(f"⏭ Skipped: {skipped}")
    print(f"🎉 Synced {added + updated} labs ({added} inserted, {updated} updated)")

if __name__ == "__main__":
    sync_labs()

