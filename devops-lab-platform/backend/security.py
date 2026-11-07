"""Security headers middleware for the API.

HTML pages get their full CSP from the frontend nginx (see frontend/nginx.conf,
which also flows through the port-80 proxy untouched). The API adds the
non-CSP hardening headers to every JSON response so nothing that leaves the
backend can be framed, sniffed, or over-referenced.
"""

# Applied to every API response. Values are static — no per-request state.
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "Cross-Origin-Opener-Policy": "same-origin",
}


class SecurityHeadersMiddleware:
    """Pure-ASGI middleware (no per-request task/context overhead)."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_headers(message):
            if message["type"] == "http.response.start":
                headers = message.setdefault("headers", [])
                existing = {k.lower() for k, _v in headers}
                for name, value in SECURITY_HEADERS.items():
                    if name.lower() not in existing:
                        headers.append((name.encode("latin-1"), value.encode("latin-1")))
            await send(message)

        await self.app(scope, receive, send_with_headers)
