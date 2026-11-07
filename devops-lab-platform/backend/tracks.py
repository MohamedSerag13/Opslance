"""Certification track registry for the dashboard.

A track is an ordered group of modules rendered as either a learning path
(kind="path": several small labs per module) or a certification syllabus
(kind="certification": week-by-week, typically one large timed lab per week).

Tracks are pure data: add CKAD (or any future track) here once its labs
exist and /progress/dashboard picks it up automatically — module numbers
must match the module_number values stored on Lab rows (metadata.json).
"""

TRACKS = [
    {
        "key": "linux-path",
        "kind": "path",
        "title": "Linux Fundamentals Path",
        "tagline": "From first commands to server troubleshooting — 15 hands-on modules.",
        "icon": "linux",
        "accent": "primary",
        "module_numbers": list(range(1, 16)),
    },
    {
        "key": "cka",
        "kind": "certification",
        "title": "CKA — Certified Kubernetes Administrator",
        "tagline": "Week-by-week drills modeled on the real CNCF exam, ending in a timed mock.",
        "icon": "kubernetes",
        "accent": "accent",
        "module_numbers": list(range(21, 29)),
    },
]
