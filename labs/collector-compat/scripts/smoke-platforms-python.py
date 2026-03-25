from __future__ import annotations

import asyncio
import json
import subprocess
import sys
import urllib.request
from pathlib import Path

import requests


def fetch_json(url: str):
    with urllib.request.urlopen(url, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def check_youtube_comments() -> tuple[str, str]:
    tmp_dir = Path("tmp")
    tmp_dir.mkdir(exist_ok=True)
    out_file = tmp_dir / "yt-comments.jsonl"
    cmd = [
        str(Path(".venv/Scripts/youtube-comment-downloader.exe")),
        "--youtubeid",
        "dQw4w9WgXcQ",
        "--limit",
        "3",
        "--output",
        str(out_file),
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
    if proc.returncode != 0:
        return "fail", proc.stderr[:200]
    lines = out_file.read_text(encoding="utf-8").strip().splitlines()
    return ("pass", f"comments={len(lines)}") if lines else ("warn", "no comments written")


def check_reddit_public() -> tuple[str, str]:
    headers = {"User-Agent": "openfons-collector-compat/0.1"}
    resp = requests.get(
        "https://www.reddit.com/r/Python/hot.json?limit=1&raw_json=1",
        headers=headers,
        timeout=30,
    )
    if resp.status_code != 200:
        return "warn", f"status={resp.status_code}"
    data = resp.json()
    title = data["data"]["children"][0]["data"]["title"]
    return "pass", title


def check_praw_without_creds() -> tuple[str, str]:
    import praw

    try:
        reddit = praw.Reddit(client_id="", client_secret="", user_agent="openfons-collector-compat/0.1")
        items = list(reddit.subreddit("Python").hot(limit=1))
        return "pass", items[0].title if items else "no items"
    except Exception as exc:
        return "warn", f"{type(exc).__name__}: {exc}"


async def check_tiktok_api() -> tuple[str, str]:
    from TikTokApi import TikTokApi

    try:
        async with TikTokApi() as api:
            await asyncio.wait_for(
                api.create_sessions(
                    num_sessions=1,
                    headless=True,
                    sleep_after=2,
                    browser="chromium",
                    allow_partial_sessions=True,
                ),
                timeout=45,
            )
            data = await asyncio.wait_for(api.user(username="tiktok").info(), timeout=30)
            user = data.get("userInfo", {}).get("user", {})
            return "pass", f"{user.get('uniqueId')} | {user.get('nickname')}"
    except Exception as exc:
        return "warn", f"{type(exc).__name__}: {exc}"


def check_twscrape_without_accounts() -> tuple[str, str]:
    cmd = [str(Path(".venv/Scripts/twscrape.exe")), "search", "openai", "--limit", "1"]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    combined = (proc.stdout + proc.stderr).strip().replace("\n", " ")
    if "No active accounts" in combined:
        return "warn", "No active accounts"
    if proc.returncode == 0:
        return "pass", combined[:200] or "search command returned"
    return "fail", combined[:200]


def check_facebook_public() -> tuple[str, str]:
    from facebook_scraper import get_page_info

    try:
        info = get_page_info("Meta", timeout=20)
        name = info.get("Name") or info.get("name")
        likes = info.get("Likes") or info.get("likes")
        if name or likes:
            return "pass", f"name={name} likes={likes}"
        return "warn", "public page info returned empty fields"
    except Exception as exc:
        return "warn", f"{type(exc).__name__}: {exc}"


async def main():
    checks = [
        ("YouTube / comments", check_youtube_comments),
        ("Reddit / public JSON", check_reddit_public),
        ("Reddit / PRAW without creds", check_praw_without_creds),
        ("TikTok / TikTokApi public user", check_tiktok_api),
        ("X / twscrape without accounts", check_twscrape_without_accounts),
        ("Facebook / public page", check_facebook_public),
    ]

    results: list[tuple[str, str, str]] = []

    for name, fn in checks:
        try:
            if asyncio.iscoroutinefunction(fn):
                status, detail = await fn()
            else:
                status, detail = fn()
            results.append((name, status, detail))
        except Exception as exc:
            results.append((name, "fail", f"{type(exc).__name__}: {exc}"))

    for name, status, detail in results:
        print(f"{status.upper()} {name}: {detail}")

    if any(status == "fail" for _, status, _ in results):
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
