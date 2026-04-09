import asyncio
import json
import re
import sys
from pathlib import Path
from typing import Any


USERNAME_PATTERN = re.compile(r"tiktok\.com/@([^/?#]+)", re.IGNORECASE)


def emit(payload: dict[str, Any]) -> int:
    json.dump(payload, sys.stdout, ensure_ascii=False)
    return 0


def parse_cookie_text(cookie_text: str) -> dict[str, str]:
    parsed: dict[str, str] = {}
    for part in cookie_text.split(";"):
        pair = part.strip()
        if not pair or "=" not in pair:
            continue
        key, value = pair.split("=", 1)
        key = key.strip()
        value = value.strip()
        if key and value:
            parsed[key] = value
    return parsed


def read_input() -> tuple[str, dict[str, Any], str, dict[str, str], str | None]:
    payload = json.load(sys.stdin)
    url = payload.get("url")
    auth = payload.get("auth")
    proxy = payload.get("proxy")

    if not isinstance(url, str) or not url.strip():
        raise ValueError("url is required")
    if not isinstance(auth, dict):
        raise ValueError("auth is required")

    account_file_path = auth.get("accountFilePath")
    cookie_file_path = auth.get("cookieFilePath")
    if not isinstance(account_file_path, str) or not account_file_path.strip():
        raise ValueError("auth.accountFilePath is required")
    if not isinstance(cookie_file_path, str) or not cookie_file_path.strip():
        raise ValueError("auth.cookieFilePath is required")

    account_value = json.loads(Path(account_file_path).read_text(encoding="utf-8"))
    if not isinstance(account_value, dict):
        raise ValueError("account file must contain a JSON object")

    cookie_text = Path(cookie_file_path).read_text(encoding="utf-8").strip()
    if not cookie_text:
        raise ValueError("cookie file is empty")
    cookie_map = parse_cookie_text(cookie_text)
    ms_token = cookie_map.get("ms_token") or cookie_map.get("msToken")
    if not ms_token:
        raise ValueError("cookie file must provide ms_token/msToken")

    if proxy is None:
        proxy_endpoint = None
    elif isinstance(proxy, dict) and isinstance(proxy.get("endpoint"), str):
        proxy_endpoint = proxy["endpoint"].strip() or None
    else:
        raise ValueError("proxy.endpoint must be a string")

    username_match = USERNAME_PATTERN.search(url)
    if not username_match:
        raise ValueError("url must include TikTok username path like tiktok.com/@username")

    return username_match.group(1), account_value, ms_token, cookie_map, proxy_endpoint


async def run_capture() -> dict[str, Any]:
    try:
        username, account_value, ms_token, cookie_map, proxy_endpoint = read_input()
    except Exception as exc:  # noqa: BLE001
        return {"status": "error", "error": f"invalid bridge input: {exc}"}

    try:
        from TikTokApi import TikTokApi
    except Exception as exc:  # noqa: BLE001
        return {"status": "error", "error": f"TikTokApi import failed: {exc}"}

    proxies = [{"server": proxy_endpoint}] if proxy_endpoint else None

    try:
        async with TikTokApi() as api:
            await api.create_sessions(
                ms_tokens=[ms_token],
                cookies=[cookie_map],
                proxies=proxies,
                num_sessions=1,
                sleep_after=3,
                browser="chromium",
            )
            user = api.user(username=username)
            info = await user.info()
    except Exception as exc:  # noqa: BLE001
        return {"status": "error", "error": f"TikTokApi request failed: {exc}"}

    nickname = (
        info.get("userInfo", {})
        .get("user", {})
        .get("nickname")
        if isinstance(info, dict)
        else None
    )
    summary_bits = [f"TikTok user {username} fetched via TikTokApi"]
    if isinstance(nickname, str) and nickname.strip():
        summary_bits.append(f"nickname={nickname.strip()}")
    summary_bits.append(f"account_keys={','.join(sorted(account_value.keys()))}")

    return {"status": "success", "summary": " | ".join(summary_bits)[:220]}


def main() -> int:
    payload = asyncio.run(run_capture())
    return emit(payload)


if __name__ == "__main__":
    raise SystemExit(main())
