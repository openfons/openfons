from __future__ import annotations

import json
import subprocess
import sys
import urllib.request
from pathlib import Path


def fetch_json(url: str):
    with urllib.request.urlopen(url, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def check_hacker_news() -> tuple[bool, str]:
    top_ids = fetch_json("https://hacker-news.firebaseio.com/v0/topstories.json")
    if not top_ids:
        return False, "topstories returned empty"
    item = fetch_json(f"https://hacker-news.firebaseio.com/v0/item/{top_ids[0]}.json")
    title = item.get("title", "")
    return bool(title), f"top story {top_ids[0]}: {title}"


def check_v2ex() -> tuple[bool, str]:
    stats = fetch_json("https://www.v2ex.com/api/site/stats.json")
    hot = fetch_json("https://www.v2ex.com/api/topics/hot.json")
    title = hot[0]["title"] if hot else ""
    return bool(stats.get("topic_max") and hot), f"topic_max={stats.get('topic_max')} first_hot={title}"


def check_amazon_review_scraper() -> tuple[bool, str]:
    script = Path("repos/amazon-review-scraper/skills/amazon-review-scraper/scripts/amazon_review_scraper.py")
    if not script.exists():
        return False, "amazon review scraper script missing"

    cmd = [sys.executable, str(script), "B0BLCBRBVZ", "--mode", "basic", "--summary"]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
    if proc.returncode != 0:
        return False, f"exit={proc.returncode}: {proc.stderr[:200]}"

    try:
        data = json.loads(proc.stdout)
    except json.JSONDecodeError as exc:
        return False, f"invalid json: {exc}"

    total = data.get("total_reviews", 0)
    return total > 0, f"summary reviews={total}"


checks = [
    ("HackerNews/API", check_hacker_news),
    ("V2EX API", check_v2ex),
    ("amazon-review-scraper", check_amazon_review_scraper),
]

results: list[tuple[str, str, str]] = []

for name, fn in checks:
    try:
        ok, detail = fn()
        results.append((name, "pass" if ok else "fail", detail))
    except Exception as exc:
        results.append((name, "fail", f"{type(exc).__name__}: {exc}"))

for name, status, detail in results:
    print(f"{status.upper()} {name}: {detail}")

if any(status == "fail" for _, status, _ in results):
    sys.exit(1)
