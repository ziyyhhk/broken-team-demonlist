"""
Broken List multi-purpose Discord bot.
Secrets are loaded from environment / .env — never hardcode tokens.
"""

from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

# load .env before anything else
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent / ".env")
except ImportError:
    pass

import discord
from discord.ext import commands

DISCORD_TOKEN = os.getenv("DISCORD_TOKEN", "").strip()
OWNER_ID = int(os.getenv("OWNER_ID", "0") or 0)
PREFIX = os.getenv("PREFIX", "r!")

if not DISCORD_TOKEN:
    print("ERROR: DISCORD_TOKEN is missing. Create bot/.env from .env.example")
    sys.exit(1)

intents = discord.Intents.default()
intents.message_content = True
intents.members = True
intents.guilds = True
intents.voice_states = True

bot = commands.Bot(command_prefix=PREFIX, intents=intents)
bot.remove_command("help")


@bot.event
async def on_ready():
    print(f"Logged in as {bot.user} (id={bot.user.id})")
    try:
        synced = await bot.tree.sync()
        print(f"Synced {len(synced)} app commands")
    except Exception as e:
        print(f"Sync failed: {e}")
    await bot.change_presence(activity=discord.Game(name="/help | Broken List"))


@bot.tree.command(name="help", description="Show available commands")
async def slash_help(interaction: discord.Interaction):
    embed = discord.Embed(
        title="Broken List Bot",
        description=(
            "Multi-purpose bot + demon list submissions.\n\n"
            "**Submissions**\n"
            "Website posts go to the submissions channel.\n"
            "Bot adds them to the Admin panel and shows Accept / Reject buttons.\n\n"
            "**Admin**\n"
            "`/submissions_reload` — reload queue from GitHub\n"
        ),
        color=0x5865F2,
    )
    await interaction.response.send_message(embed=embed)


@bot.tree.command(name="ping", description="Check latency")
async def slash_ping(interaction: discord.Interaction):
    ms = round(bot.latency * 1000)
    await interaction.response.send_message(f"Pong — {ms}ms")


async def main():
    async with bot:
        # load submissions cog
        await bot.load_extension("submissions")
        await bot.start(DISCORD_TOKEN)


if __name__ == "__main__":
    asyncio.run(main())
