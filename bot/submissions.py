"""Demon list submissions: Accept / Reject buttons + GitHub sync."""

from __future__ import annotations

import json
import os
import re
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import discord
from discord.ext import commands

from github_api import (
    add_or_update_record,
    load_submissions,
    save_submissions,
)

SUBMISSIONS_CHANNEL_ID = int(os.getenv("SUBMISSIONS_CHANNEL_ID", "0") or 0)

# Plain labels only — no emojis
STATUS_PENDING = "pending"
STATUS_ACCEPTED = "accepted"
STATUS_REJECTED = "rejected"


def parse_submission_message(content: str) -> Optional[Dict[str, Any]]:
    """Parse the plain-text submission message sent by the website webhook."""
    if not content:
        return None
    lines = [ln.strip() for ln in content.splitlines() if ln.strip()]
    data: Dict[str, str] = {}
    sub_id = None
    for ln in lines:
        m = re.match(r"New record submission \(([^)]+)\)", ln, re.I)
        if m:
            sub_id = m.group(1).strip()
            continue
        if ":" in ln:
            key, _, val = ln.partition(":")
            data[key.strip().lower()] = val.strip()

    player = data.get("player")
    if not player:
        return None

    level_raw = data.get("level", "")
    verifying = "(verifying)" in level_raw.lower()
    level_name = re.sub(r"\s*\(verifying\)\s*", "", level_raw, flags=re.I).strip()

    try:
        percent = int(float(data.get("percent", "100")))
    except ValueError:
        percent = 100

    entry = {
        "id": sub_id or f"sub_bot_{int(datetime.now(timezone.utc).timestamp())}",
        "status": STATUS_PENDING,
        "mode": data.get("mode", "classic"),
        "player": player,
        "discordUser": data.get("discord", "").split("(")[0].strip(),
        "displayName": "",
        "levelPath": "__verifying__" if verifying else "",
        "levelName": level_name,
        "percent": percent,
        "link": data.get("video", ""),
        "device": data.get("device", ""),
        "modMenu": data.get("mod menu", ""),
        "customId": data.get("custom id", ""),
        "length": data.get("length", ""),
        "attempts": data.get("attempts", ""),
        "rawFootage": data.get("raw", ""),
        "notes": data.get("notes", ""),
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    # try keep display name if present in Discord line
    disc = data.get("discord", "")
    if "(" in disc and ")" in disc:
        entry["displayName"] = disc[disc.find("(") + 1 : disc.rfind(")")].strip()
    return entry


def build_submission_embed(entry: Dict[str, Any]) -> discord.Embed:
    status = (entry.get("status") or STATUS_PENDING).lower()
    if status in ("approved", "accepted"):
        color = 0x57F287
        status = STATUS_ACCEPTED
    elif status == "rejected":
        color = 0xED4245
    else:
        color = 0x5865F2
        status = STATUS_PENDING

    embed = discord.Embed(
        title="Record submission",
        color=color,
        timestamp=datetime.now(timezone.utc),
    )
    embed.add_field(name="Status", value=status, inline=True)
    embed.add_field(name="Player", value=entry.get("player") or "—", inline=True)
    embed.add_field(name="Discord", value=entry.get("discordUser") or "—", inline=True)
    embed.add_field(name="Level", value=entry.get("levelName") or entry.get("levelPath") or "—", inline=False)
    embed.add_field(name="Percent", value=str(entry.get("percent", 100)), inline=True)
    embed.add_field(name="Device", value=entry.get("device") or "—", inline=True)
    embed.add_field(name="Mod menu", value=entry.get("modMenu") or "—", inline=True)
    if entry.get("link"):
        embed.add_field(name="Video", value=entry["link"], inline=False)
    if entry.get("rawFootage"):
        embed.add_field(name="Raw", value=entry["rawFootage"], inline=False)
    if entry.get("notes"):
        embed.add_field(name="Notes", value=entry["notes"][:500], inline=False)
    embed.set_footer(text=f"id: {entry.get('id', '')}")
    return embed


class SubmissionView(discord.ui.View):
    def __init__(self, entry: Dict[str, Any], bot: commands.Bot):
        super().__init__(timeout=None)
        self.entry = entry
        self.bot = bot

    async def _update_status(self, interaction: discord.Interaction, new_status: str) -> None:
        await interaction.response.defer()
        queue, _ = await load_submissions()
        found = False
        for i, s in enumerate(queue):
            if s and s.get("id") == self.entry.get("id"):
                queue[i] = {**s, "status": new_status, "resolvedAt": datetime.now(timezone.utc).isoformat()}
                self.entry = queue[i]
                found = True
                break
        if not found:
            self.entry["status"] = new_status
            self.entry["resolvedAt"] = datetime.now(timezone.utc).isoformat()
            queue.insert(0, self.entry)

        ok = await save_submissions(queue, f"Bot: {new_status} {self.entry.get('player')}")
        if not ok:
            await interaction.followup.send("Failed to update GitHub submissions file.", ephemeral=True)
            return

        extra = ""
        if new_status == STATUS_ACCEPTED:
            path = self.entry.get("levelPath") or ""
            if path and path != "__verifying__":
                added = await add_or_update_record(
                    path,
                    self.entry.get("player", ""),
                    int(self.entry.get("percent") or 100),
                    self.entry.get("link") or "",
                )
                extra = " Record added to level." if added else " Level file not updated (path missing or verifying)."
            else:
                extra = " Level is verifying — add it in Admin first, then accept again if needed."

        embed = build_submission_embed(self.entry)
        # disable buttons
        for child in self.children:
            child.disabled = True
        await interaction.message.edit(embed=embed, view=self)
        await interaction.followup.send(f"Marked as {new_status}.{extra}", ephemeral=True)

    @discord.ui.button(label="Accept", style=discord.ButtonStyle.success, custom_id="sub_accept")
    async def accept_btn(self, interaction: discord.Interaction, button: discord.ui.Button):
        await self._update_status(interaction, STATUS_ACCEPTED)

    @discord.ui.button(label="Reject", style=discord.ButtonStyle.danger, custom_id="sub_reject")
    async def reject_btn(self, interaction: discord.Interaction, button: discord.ui.Button):
        await self._update_status(interaction, STATUS_REJECTED)


class Submissions(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @commands.Cog.listener()
    async def on_message(self, message: discord.Message):
        if message.author.bot and message.webhook_id is None:
            # allow webhooks (website) — they appear as bot-like but have webhook_id
            pass
        if message.channel.id != SUBMISSIONS_CHANNEL_ID:
            return
        # ignore our own embeds
        if message.author == self.bot.user:
            return
        content = message.content or ""
        if "New record submission" not in content and "Player:" not in content:
            return

        entry = parse_submission_message(content)
        if not entry:
            return

        # write to GitHub queue
        queue, _ = await load_submissions()
        # avoid exact duplicate id
        if not any(s and s.get("id") == entry["id"] for s in queue):
            queue.insert(0, entry)
            await save_submissions(queue, f"Bot: new submission {entry.get('player')} — {entry.get('levelName')}")

        embed = build_submission_embed(entry)
        view = SubmissionView(entry, self.bot)
        await message.channel.send(embed=embed, view=view)

    @commands.hybrid_command(name="submissions_reload", description="Reload submissions from GitHub")
    @commands.has_permissions(administrator=True)
    async def submissions_reload(self, ctx: commands.Context):
        queue, _ = await load_submissions()
        pending = sum(1 for s in queue if (s.get("status") or "pending") == "pending")
        await ctx.send(f"Loaded {len(queue)} submissions ({pending} pending).")


async def setup(bot: commands.Bot):
    await bot.add_cog(Submissions(bot))
