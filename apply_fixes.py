import os
import re

md_path = "/Users/mohamedserag/Desktop/Opslance/fixes_output.md"
base_dir = "/Users/mohamedserag/Desktop/Opslance/devops-lab-platform"
labs_dir = "/Users/mohamedserag/Desktop/Opslance/labs"

with open(md_path, "r") as f:
    content = f.read()

# Pattern looks for:
# --- FILE: relative/path/to/file ---
# ```language
# content
# ```
pattern = r"--- FILE: (.*?) ---\n```\w*\n(.*?)```"
matches = re.finditer(pattern, content, re.DOTALL)

count = 0
for match in matches:
    rel_path = match.group(1).strip()
    file_content = match.group(2).strip() + "\n"
    
    # Determine absolute path
    if rel_path.startswith("labs/"):
        abs_path = os.path.join("/Users/mohamedserag/Desktop/Opslance", rel_path)
    elif rel_path.startswith(".env") or rel_path.startswith("backend/"):
        abs_path = os.path.join(base_dir, rel_path)
    else:
        abs_path = os.path.join(base_dir, rel_path)
        
    os.makedirs(os.path.dirname(abs_path), exist_ok=True)
    with open(abs_path, "w") as out_f:
        out_f.write(file_content)
    
    print(f"Applied: {abs_path}")
    count += 1

print(f"Successfully applied {count} files.")
