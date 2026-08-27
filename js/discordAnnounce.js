/** Discord webhook helpers for victor / verify / list-move announcements */

export const WEBHOOK_KEY = 'bt_discord_webhook';

export const DEFAULT_MESSAGES = {
  victor: 'Congrats to {mention} for beating **{level}** and being the **{ordinal}** victor!{link_line}',
  verify: '# Congrats to {mention} for verifying `{level}` — it\'s at top **#{top}** wow.. you so pro dude... teach me... Anyways GGs myaw',
  move: '**{level}** moved from **#{old_rank}** to **#{rank}** on the list!',
  enabledVictor: true,
  enabledVerify: true,
  enabledMove: true,
};

export function ordinal(n) {
  const num = Number(n) || 0;
  const s = ['th', 'st', 'nd', 'rd'];
  const v = num % 100;
  return num + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function resolveDiscordId(playerDiscord, name) {
  if (!name || !playerDiscord) return '';
  if (playerDiscord[name]) return String(playerDiscord[name]).replace(/\D/g, '');
  const key = Object.keys(playerDiscord).find(
    (k) => k.toLowerCase() === String(name).toLowerCase(),
  );
  return key ? String(playerDiscord[key]).replace(/\D/g, '') : '';
}

export function formatMessage(template, vars) {
  let out = String(template || '');
  Object.keys(vars).forEach((k) => {
    out = out.split('{' + k + '}').join(vars[k] == null ? '' : String(vars[k]));
  });
  return out.replace(/\n{3,}/g, '\n\n').trim();
}

export function buildVars({
  player,
  discordId,
  level,
  rank,
  old_rank,
  top,
  list_rank,
  percent,
  link,
  direction,
}) {
  const mention = discordId ? '<@' + discordId + '>' : player ? '**' + player + '**' : '';
  const linkStr = link ? String(link).trim() : '';
  const topVal = top != null ? top : list_rank != null ? list_rank : rank;
  return {
    player: player || '',
    mention,
    level: level || '',
    rank: rank != null ? String(rank) : topVal != null ? String(topVal) : '',
    ordinal: rank != null ? ordinal(rank) : topVal != null ? ordinal(topVal) : '',
    old_rank: old_rank != null ? String(old_rank) : '',
    old_ordinal: old_rank != null ? ordinal(old_rank) : '',
    top: topVal != null ? String(topVal) : '',
    list_rank: topVal != null ? String(topVal) : '',
    direction: direction || '',
    percent: percent != null ? String(percent) : '',
    link: linkStr,
    link_line: linkStr ? '\n' + linkStr : '',
  };
}

export async function sendDiscordWebhook(url, content) {
  if (!url || !content) return { ok: false, error: 'Missing url or content' };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: content.slice(0, 1900) }),
    });
    if (res.ok || res.status === 204) return { ok: true };
    return { ok: false, error: 'HTTP ' + res.status };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
}

/** Compare previous level state vs new; return list of { type, ... } events */
export function diffLevelAnnouncements(prev, next) {
  const events = [];
  if (!next) return events;

  const prevVerifier = prev && prev.verifier ? String(prev.verifier).trim() : '';
  const nextVerifier = next.verifier ? String(next.verifier).trim() : '';
  if (nextVerifier && nextVerifier.toLowerCase() !== prevVerifier.toLowerCase()) {
    events.push({
      type: 'verify',
      player: nextVerifier,
      level: next.name || '',
      link: next.verification || '',
    });
  }

  const prevRecords = (prev && prev.records) || [];
  const nextRecords = next.records || [];

  const prevClears = new Set(
    prevRecords
      .filter((r) => r && r.user && Number(r.percent) === 100)
      .map((r) => String(r.user).trim().toLowerCase()),
  );

  let clearIndex = 0;
  nextRecords.forEach((r) => {
    if (!r || !r.user || Number(r.percent) !== 100) return;
    clearIndex += 1;
    const key = String(r.user).trim().toLowerCase();
    if (!prevClears.has(key)) {
      events.push({
        type: 'victor',
        player: String(r.user).trim(),
        level: next.name || '',
        rank: clearIndex,
        percent: 100,
        link: r.link || '',
      });
    }
  });

  return events;
}

/** Compare previous list order vs new; return move events for paths whose rank changed */
export function diffListOrder(prevOrder, nextOrder) {
  const events = [];
  if (!Array.isArray(prevOrder) || !Array.isArray(nextOrder)) return events;

  const prevIdx = new Map();
  prevOrder.forEach((p, i) => {
    if (p) prevIdx.set(p, i);
  });

  nextOrder.forEach((path, i) => {
    if (!path || !prevIdx.has(path)) return;
    const oldI = prevIdx.get(path);
    if (oldI === i) return;
    events.push({
      type: 'move',
      path,
      rank: i + 1,
      old_rank: oldI + 1,
      direction: i < oldI ? 'up' : 'down',
    });
  });

  events.sort(
    (a, b) =>
      Math.abs(b.old_rank - b.rank) - Math.abs(a.old_rank - a.rank) ||
      a.rank - b.rank,
  );
  return events;
}
