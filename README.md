# The Broken List — Broken Team Demonlist

Geometry Dash-style demon list site (based on the Shitty List template).

## List tiers (like Pointercrate)

| Tier | Ranks | Notes |
|------|-------|--------|
| **Main** | #1 – #75 | Percentage records count toward points |
| **Extended** | #76 – #150 | Only 100% completions count |
| **Legacy** | #151+ | Old top-150 levels that fell off; no new records |

Use the **Main / Extended / Legacy** tabs on the List page to filter.

---

## How to put a level on the Legacy List

Order in `data/_list.json` **is** the ranking. Position in the array = list rank.

### Example

```json
[
  "HardestLevel",
  "SecondHardest",
  "... up to 150 entries for Main + Extended ...",
  "OldTopLevel",
  "AnotherFallenLevel"
]
```

- Entries **1–75** → Main List  
- Entries **76–150** → Extended List  
- Entries **151 and after** → **Legacy List**

### Steps to move a level to Legacy

1. Open `data/_list.json`.
2. Find the level filename (without `.json`), e.g. `"Bloodbath"`.
3. **Cut** that entry from its current position.
4. **Paste** it **after** the 150th entry (or at the end if you have fewer than 150).
5. Save. GitHub Pages will rebuild; the level appears under the **Legacy** tab.
6. Optional: keep its `data/Bloodbath.json` file — records stay visible, but the site will show “does not accept new records.”

### Adding a brand-new Main List level

1. Create `data/YourLevel.json` (copy a sample file).
2. Add `"YourLevel"` near the **top** of `_list.json` (e.g. position 1–75).
3. Everything below shifts down one rank. If something was #150, it becomes #151 → **Legacy** automatically.

### Notes

- Legacy levels award **0 points** on the leaderboard.
- After a level falls to Legacy, the site rules say records are accepted for **24 hours**, then never again (enforce this when reviewing submissions).
- Filenames in `_list.json` must match the JSON files in `data/` (no `.json` extension in the list).

---

## FAQ

**Website isn’t loading?**  
Check the browser console, or wait for GitHub Pages. Invalid JSON in `data/` will break the list.

**How do I add records?**  
Edit the level’s JSON `records` array. Use `"mobile": true` for mobile completions.

**Credits**  
Layout based on [TheShittyList](https://tsl.pages.dev/).
