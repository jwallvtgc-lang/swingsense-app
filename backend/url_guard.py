"""
SSRF guard for user-supplied URLs (AI-151).

The /analyze endpoint downloads a video from a URL sent in the request body.
Without a host allowlist an attacker can point that URL at internal targets the
backend can reach but the internet cannot — cloud metadata endpoints
(169.254.169.254), internal Render services, localhost admin ports — and use
the backend as a proxy.

This module is deliberately stdlib-only (no fastapi / cv2 / tflite imports) so
it can be unit-tested without the full backend dependency set installed.
"""

import os
from typing import Optional
from urllib.parse import urlparse

# Swing videos are served over signed HTTPS URLs from Supabase Storage.
ALLOWED_SCHEMES = ("https",)
ALLOWED_PORTS = (None, 443)


class UnsafeURLError(ValueError):
    """Raised when a user-supplied URL is not safe to fetch."""


def allowed_video_hosts(env: Optional[dict] = None) -> set[str]:
    """
    Hostnames the backend may download swing videos from.

    Read from config, never hardcoded:
      - SUPABASE_URL        the project's storage domain (primary source)
      - ALLOWED_VIDEO_HOSTS optional comma-separated extras (staging, CDN)

    Returns an empty set when nothing is configured, which makes
    validate_video_url fail closed rather than allow everything.
    """
    environ = os.environ if env is None else env
    hosts: set[str] = set()

    supabase_url = (environ.get("SUPABASE_URL") or "").strip()
    if supabase_url:
        host = urlparse(supabase_url).hostname
        if host:
            hosts.add(host.lower())

    for extra in (environ.get("ALLOWED_VIDEO_HOSTS") or "").split(","):
        extra = extra.strip().lower()
        if extra:
            hosts.add(extra)

    return hosts


def validate_video_url(video_url: str, env: Optional[dict] = None) -> str:
    """
    Confirm video_url points at an allowed Supabase storage host.

    Returns the URL unchanged when it is safe; raises UnsafeURLError otherwise.
    Callers translate that into an HTTP 400.
    """
    allowed = allowed_video_hosts(env)
    if not allowed:
        raise UnsafeURLError(
            "no allowed video hosts configured (set SUPABASE_URL or ALLOWED_VIDEO_HOSTS)"
        )

    if not isinstance(video_url, str) or not video_url.strip():
        raise UnsafeURLError("video_url is empty")

    try:
        parsed = urlparse(video_url.strip())
        hostname = parsed.hostname
        port = parsed.port  # raises ValueError on a malformed port
    except ValueError as e:
        raise UnsafeURLError(f"video_url is not a parseable URL: {e}") from e

    if parsed.scheme.lower() not in ALLOWED_SCHEMES:
        raise UnsafeURLError(f"scheme {parsed.scheme!r} not allowed")

    if not hostname:
        raise UnsafeURLError("video_url has no hostname")

    # Exact match only. Substring/suffix matching would let
    # evil-supabase.co or supabase.co.attacker.net through.
    if hostname.lower() not in allowed:
        raise UnsafeURLError(f"host {hostname!r} not allowed")

    if port not in ALLOWED_PORTS:
        raise UnsafeURLError(f"port {port} not allowed")

    return video_url
