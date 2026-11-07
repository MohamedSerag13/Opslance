"""Health endpoint, security headers, and default-CORS posture."""


def test_health_ok(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
    assert r.json()["build"]  # VERSION stamp present


def test_api_responses_carry_hardening_headers(client):
    r = client.get("/api/health")
    assert r.headers["x-content-type-options"] == "nosniff"
    assert r.headers["x-frame-options"] == "DENY"
    assert r.headers["referrer-policy"] == "strict-origin-when-cross-origin"
    assert "camera=()" in r.headers["permissions-policy"]
    assert r.headers["cross-origin-opener-policy"] == "same-origin"


def test_default_cors_grants_no_cross_origin_access(client):
    """With CORS_ORIGINS unset (the shipped default) no origin gets a grant."""
    r = client.get("/api/health", headers={"Origin": "https://evil.example"})
    assert "access-control-allow-origin" not in r.headers


def test_preflight_without_allowlist_is_rejected(client):
    r = client.options("/api/health", headers={
        "Origin": "https://evil.example",
        "Access-Control-Request-Method": "GET",
    })
    assert "access-control-allow-origin" not in r.headers
