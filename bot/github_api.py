"""GitHub helpers for writing submissions and level records."""

import os
import base64
import json
from typing import Any, Dict, List, Optional, Tuple

import aiohttp

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "").strip()
GITHUB_REPO = os.getenv("GITHUB_REPO", "ziyyhhk/broken-team-demonlist").strip()
GITHUB_BRANCH = os.getenv("GITHUB_BRANCH", "main").strip()
API = "https://api.github.com"


def _headers() -> Dict[str, str]:
    return {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "BrokenListBot",
    }


async def get_file(path: str) -> Tuple[Optional[str], Optional[str]]:
    """Return (content_text, sha) or (None, None)."""
    if not GITHUB_TOKEN:
        return None, None
    url = f"{API}/repos/{GITHUB_REPO}/contents/{path}"
    params = {"ref": GITHUB_BRANCH}
    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=_headers(), params=params) as resp:
            if resp.status != 200:
                return None, None
            data = await resp.json()
            content = base64.b64decode(data.get("content", "")).decode("utf-8")
            return content, data.get("sha")


async def put_file(path: str, content: str, message: str, sha: Optional[str] = None) -> bool:
    if not GITHUB_TOKEN:
        return False
    url = f"{API}/repos/{GITHUB_REPO}/contents/{path}"
    body: Dict[str, Any] = {
        "message": message,
        "content": base64.b64encode(content.encode("utf-8")).decode("ascii"),
        "branch": GITHUB_BRANCH,
    }
    if sha:
        body["sha"] = sha
    async with aiohttp.ClientSession() as session:
        async with session.put(url, headers=_headers(), json=body) as resp:
            return resp.status in (200, 201)


async def load_submissions() -> Tuple[List[Dict[str, Any]], Optional[str]]:
    text, sha = await get_file("data/_submissions.json")
    if text is None:
        return [], None
    try:
        data = json.loads(text)
        if isinstance(data, list):
            return data, sha
    except Exception:
        pass
    return [], sha


async def save_submissions(queue: List[Dict[str, Any]], message: str) -> bool:
    text, sha = await get_file("data/_submissions.json")
    # re-fetch sha right before write to reduce conflicts
    _, sha = await get_file("data/_submissions.json")
    content = json.dumps(queue, indent=4) + "\n"
    return await put_file("data/_submissions.json", content, message, sha)


async def add_or_update_record(level_path: str, player: str, percent: int, link: str) -> bool:
    """Add victor record to data/{level_path}.json"""
    if not level_path or level_path == "__verifying__":
        return False
    path = f"data/{level_path}.json"
    text, sha = await get_file(path)
    if text is None:
        return False
    try:
        level = json.loads(text)
    except Exception:
        return False
    records = level.get("records") if isinstance(level.get("records"), list) else []
    name = player.strip()
    existing = next(
        (i for i, r in enumerate(records) if r and str(r.get("user", "")).lower() == name.lower()),
        -1,
    )
    if existing >= 0:
        if int(records[existing].get("percent") or 0) < percent:
            records[existing]["percent"] = percent
            if link:
                records[existing]["link"] = link
    else:
        records.append({"user": name, "percent": percent, "link": link or ""})
    records.sort(key=lambda r: int(r.get("percent") or 0), reverse=True)
    level["records"] = records
    level.pop("path", None)
    content = json.dumps(level, indent=4) + "\n"
    return await put_file(path, content, f"Bot: accept {name} on {level_path}", sha)
