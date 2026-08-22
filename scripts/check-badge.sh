#!/usr/bin/env bash
set -euo pipefail

site_dir="${1:-.}"
rendered_dir="${2:-$site_dir/_site}"

python3 - "$site_dir" "$rendered_dir" <<'PY'
from __future__ import annotations

import hashlib
import pathlib
import re
import sys

site = pathlib.Path(sys.argv[1]).resolve()
rendered = pathlib.Path(sys.argv[2]).resolve()
manifest = site / "_includes" / "ks-badge.sha256"

if not manifest.is_file():
    raise SystemExit(f"FAIL: missing checksum manifest: {manifest}")

expected: dict[str, str] = {}
for raw in manifest.read_text(encoding="utf-8").splitlines():
    raw = raw.strip()
    if not raw or raw.startswith("#"):
        continue
    match = re.fullmatch(r"([0-9a-f]{64})\s+\*?(.+)", raw, re.I)
    if not match:
        raise SystemExit(f"FAIL: malformed checksum line: {raw}")
    expected[match.group(2).strip()] = match.group(1).lower()

required = (
    "_includes/ks-badge.html",
    "_sass/components/_ks-badge.scss",
    "assets/js/ks-badge.js",
)
for rel in required:
    path = site / rel
    if not path.is_file():
        raise SystemExit(f"FAIL: missing badge file: {rel}")
    wanted = expected.get(rel)
    if not wanted:
        raise SystemExit(f"FAIL: checksum manifest has no entry for {rel}")
    actual = hashlib.sha256(path.read_bytes()).hexdigest()
    if actual != wanted:
        raise SystemExit(
            f"FAIL: checksum mismatch for {rel} (expected {wanted}, got {actual})"
        )

if not rendered.is_dir():
    raise SystemExit(
        f"FAIL: rendered site not found at {rendered}; build the site before running this guard"
    )

pages = sorted(rendered.rglob("*.html"))
if not pages:
    raise SystemExit(f"FAIL: no rendered HTML found below {rendered}")

badge_re = re.compile(r'<a\b[^>]*class=["\'][^"\']*\bsite-footer__badge\b', re.I)
script_re = re.compile(r'<script\b[^>]*src=["\'][^"\']*ks-badge\.js(?:\?[^"\']*)?["\']', re.I)
duplicate_pages: list[str] = []
badge_pages: list[pathlib.Path] = []
for page in pages:
    html = page.read_text(encoding="utf-8", errors="replace")
    count = len(badge_re.findall(html))
    allowed = 3 if "data-ahstatic-root" in html else 1
    if count:
        badge_pages.append(page)
    if count > allowed:
        duplicate_pages.append(str(page.relative_to(rendered)))

if not badge_pages:
    raise SystemExit("FAIL: canonical badge is not connected to any rendered page")
if duplicate_pages:
    raise SystemExit("FAIL: duplicate rendered badges: " + ", ".join(duplicate_pages))

home = rendered / "index.html"
if not home.is_file():
    raise SystemExit("FAIL: rendered homepage index.html is missing")
home_html = home.read_text(encoding="utf-8", errors="replace")
home_count = len(badge_re.findall(home_html))
home_allowed = 3 if "data-ahstatic-root" in home_html else 1
if home_count < 1 or home_count > home_allowed:
    raise SystemExit(f"FAIL: rendered homepage has {home_count} badges; allowed 1-{home_allowed}")
if not script_re.search(home_html):
    raise SystemExit("FAIL: rendered homepage does not load ks-badge.js")

css_files = sorted(rendered.rglob("*.css"))
if not any(".site-footer__badge" in p.read_text(encoding="utf-8", errors="replace") for p in css_files):
    raise SystemExit("FAIL: rendered CSS does not contain the canonical badge selector")

print(f"PASS: canonical K&S badge checksums and rendered integration ({len(badge_pages)} pages)")
PY
