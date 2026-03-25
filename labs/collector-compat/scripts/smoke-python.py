from __future__ import annotations

import importlib
import sys


def try_import(module_names: list[str]) -> tuple[bool, str]:
    errors: list[str] = []
    for module_name in module_names:
        try:
            importlib.import_module(module_name)
            return True, f"imported {module_name}"
        except Exception as exc:
            errors.append(f"{module_name}: {type(exc).__name__}: {exc}")
            continue
    return False, " | ".join(errors) if errors else f"failed imports: {', '.join(module_names)}"


checks = [
    ("camoufox", ["camoufox"]),
    ("twscrape", ["twscrape"]),
    ("TikTokApi", ["TikTokApi"]),
    ("praw", ["praw"]),
    ("facebook-scraper", ["facebook_scraper"]),
    ("youtube-comment-downloader", ["youtube_comment_downloader"]),
    ("gallery-dl", ["gallery_dl"]),
    ("ddgs", ["ddgs"]),
    ("ddddocr", ["ddddocr"]),
    ("python-amazon-paapi", ["amazon_paapi", "paapi5_python_sdk", "amazon_paapi5"])
]

results: list[tuple[str, str, str]] = []

for name, module_names in checks:
    ok, detail = try_import(module_names)
    results.append((name, "pass" if ok else "fail", detail))

for name, status, detail in results:
    print(f"{status.upper()} {name}: {detail}")

if any(status == "fail" for _, status, _ in results):
    sys.exit(1)
