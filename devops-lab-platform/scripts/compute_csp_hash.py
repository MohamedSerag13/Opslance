#!/usr/bin/env python3
"""Compute the CSP script-src hash for the inline theme bootstrap in
frontend/index.html, exactly as a browser would hash the tag's text content."""
import base64
import hashlib
import re
import sys

import os
HTML = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "index.html")

html = open(HTML, encoding="utf-8").read()
m = re.search(r"<script>\n(.*?)\n\s*</script>", html, re.S)
if not m:
    sys.exit("inline <script> block not found")
content = m.group(0)
# text content spans from after "<script>" to before "</script>"
inner = content[len("<script>"):-len("</script>")]
digest = hashlib.sha256(inner.encode("utf-8")).digest()
print("sha256-" + base64.b64encode(digest).decode())
