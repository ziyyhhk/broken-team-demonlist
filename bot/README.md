# Broken List Discord Bot

Multi-purpose bot + demon list submissions system.

## Security

All secrets live in a local `.env` file.  
The real `.env` is gitignored and must never be committed.

1. Copy `.env.example` to `.env`
2. Put your real tokens in `.env`
3. Run the bot

## Setup

```bash
cd bot
python -m venv venv
# Windows: venv\Scripts\activate
# Linux/Mac: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# edit .env with your tokens
python bot.py
```

## Submissions

- Website sends a message to the submissions channel (webhook).
- Bot detects it, writes the entry into `data/_submissions.json` on GitHub.
- Bot posts an embed with **Accept** / **Reject** buttons.
- Accept → status `accepted` + adds the record to the level (if level is already on the list).
- Reject → status `rejected`.
- Player sees the status on the Submit page.

No emojis are used in status labels.
