#!/usr/bin/env python3
"""
HTTP check for every url in data/links.json (follow redirects; flag failures).
"""

from __future__ import annotations

import json
import ssl
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LINKS_PATH = ROOT / "data" / "links.json"
TIMEOUT_SEC = 25
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 "
    "EcosystemStatusHub-LinkCheck/1.0"
)


def http_code(url: str, method: str, ctx: ssl.SSLContext) -> int | None:
    req = urllib.request.Request(
        url,
        method=method,
        headers={"User-Agent": USER_AGENT, "Accept": "*/*"},
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT_SEC, context=ctx) as resp:
            return resp.getcode()
    except urllib.error.HTTPError as e:
        return e.code
    except Exception:
        raise


def check_url(url: str, ctx: ssl.SSLContext) -> int | None:
    try:
        code = http_code(url, "HEAD", ctx)
    except Exception:
        code = None
    if code is None or code in (403, 405):
        try:
            code = http_code(url, "GET", ctx)
        except Exception:
            raise
    return code


def main() -> int:
    raw = json.loads(LINKS_PATH.read_text(encoding="utf-8"))
    links = raw.get("links")
    if not isinstance(links, list):
        print("Invalid links.json: missing links array", file=sys.stderr)
        return 1

    insecure = "--insecure" in sys.argv
    ctx = ssl.create_default_context()
    if insecure:
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

    failures: list[tuple[str, str, str]] = []

    for item in links:
        uid = item.get("id", "?")
        url = item.get("url")
        if not url:
            failures.append((uid, "", "missing url"))
            continue
        try:
            code = check_url(url, ctx)
        except Exception as e:
            failures.append((uid, url, str(e)))
            continue

        if code is None or code < 200 or code >= 400:
            failures.append((uid, url, f"HTTP {code}"))

    if failures:
        print("Failures:", file=sys.stderr)
        for uid, url, reason in failures:
            print(f"  {uid}: {url or '(n/a)'} — {reason}", file=sys.stderr)
        return 1

    print(f"OK: {len(links)} URLs")
    return 0


if __name__ == "__main__":
    sys.exit(main())
