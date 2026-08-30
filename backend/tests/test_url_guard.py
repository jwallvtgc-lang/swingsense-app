"""
Tests for the /analyze SSRF guard (AI-151).

Stdlib-only so it runs without the backend's heavy deps installed:
    cd backend && python3 -m unittest discover tests
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from url_guard import UnsafeURLError, allowed_video_hosts, validate_video_url

PROJECT_REF = "qwzkgyyvtqhdeqkandaf"
ENV = {"SUPABASE_URL": f"https://{PROJECT_REF}.supabase.co"}

LEGIT_URL = (
    f"https://{PROJECT_REF}.supabase.co/storage/v1/object/sign/swing-videos/"
    "user-123/swing.mp4?token=eyJhbGciOiJIUzI1NiJ9.abc"
)


class TestAllowedHosts(unittest.TestCase):
    def test_host_derived_from_supabase_url(self):
        self.assertEqual(allowed_video_hosts(ENV), {f"{PROJECT_REF}.supabase.co"})

    def test_extra_hosts_env_var(self):
        env = {**ENV, "ALLOWED_VIDEO_HOSTS": "cdn.swingsense.app, staging.supabase.co"}
        self.assertEqual(
            allowed_video_hosts(env),
            {f"{PROJECT_REF}.supabase.co", "cdn.swingsense.app", "staging.supabase.co"},
        )

    def test_no_config_returns_empty(self):
        self.assertEqual(allowed_video_hosts({}), set())


class TestLegitimateURLs(unittest.TestCase):
    def test_signed_storage_url_allowed(self):
        self.assertEqual(validate_video_url(LEGIT_URL, ENV), LEGIT_URL)

    def test_public_storage_url_allowed(self):
        url = f"https://{PROJECT_REF}.supabase.co/storage/v1/object/public/swing-videos/a.mp4"
        self.assertEqual(validate_video_url(url, ENV), url)

    def test_explicit_443_allowed(self):
        url = f"https://{PROJECT_REF}.supabase.co:443/storage/v1/object/public/a.mp4"
        self.assertEqual(validate_video_url(url, ENV), url)

    def test_host_match_is_case_insensitive(self):
        url = f"https://{PROJECT_REF.upper()}.SUPABASE.CO/storage/v1/object/public/a.mp4"
        self.assertEqual(validate_video_url(url, ENV), url)


class TestSSRFPayloadsRejected(unittest.TestCase):
    def assert_rejected(self, url, env=ENV):
        with self.assertRaises(UnsafeURLError, msg=f"should have rejected {url!r}"):
            validate_video_url(url, env)

    def test_cloud_metadata_endpoint(self):
        self.assert_rejected("http://169.254.169.254/latest/meta-data/iam/security-credentials/")

    def test_cloud_metadata_over_https(self):
        self.assert_rejected("https://169.254.169.254/latest/meta-data/")

    def test_localhost(self):
        self.assert_rejected("http://localhost/admin")
        self.assert_rejected("https://localhost:8000/admin")
        self.assert_rejected("http://127.0.0.1:8000/")
        self.assert_rejected("http://[::1]:8000/")

    def test_internal_render_service(self):
        self.assert_rejected("http://swingsense-internal:10000/admin/backfill-core5")

    def test_private_network_ranges(self):
        self.assert_rejected("https://10.0.0.5/secrets")
        self.assert_rejected("https://192.168.1.1/")

    def test_lookalike_domains(self):
        # Suffix or substring matching would let these through — exact match must not.
        self.assert_rejected(f"https://{PROJECT_REF}.supabase.co.attacker.net/a.mp4")
        self.assert_rejected(f"https://evil-{PROJECT_REF}.supabase.co.evil.io/a.mp4")
        self.assert_rejected("https://supabase.co/a.mp4")
        self.assert_rejected("https://other-project.supabase.co/storage/v1/object/public/a.mp4")

    def test_userinfo_confusion(self):
        # Real host here is 169.254.169.254, not the supabase prefix.
        self.assert_rejected(
            f"https://{PROJECT_REF}.supabase.co@169.254.169.254/latest/meta-data/"
        )

    def test_non_http_schemes(self):
        self.assert_rejected("file:///etc/passwd")
        self.assert_rejected("gopher://127.0.0.1:6379/_INFO")
        self.assert_rejected(f"ftp://{PROJECT_REF}.supabase.co/a.mp4")

    def test_plain_http_to_allowed_host(self):
        self.assert_rejected(f"http://{PROJECT_REF}.supabase.co/storage/v1/object/public/a.mp4")

    def test_non_standard_port_on_allowed_host(self):
        self.assert_rejected(f"https://{PROJECT_REF}.supabase.co:8000/admin")

    def test_malformed_and_empty(self):
        self.assert_rejected("")
        self.assert_rejected("   ")
        self.assert_rejected("not a url")
        self.assert_rejected("https://")
        self.assert_rejected(f"https://{PROJECT_REF}.supabase.co:notaport/a.mp4")

    def test_fails_closed_when_unconfigured(self):
        # An empty allowlist must reject everything, including otherwise-valid URLs.
        self.assert_rejected(LEGIT_URL, env={})


if __name__ == "__main__":
    unittest.main()
