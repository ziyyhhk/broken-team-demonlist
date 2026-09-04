/** Discord webhook helpers for victor / verify / list-move announcements */

export const WEBHOOK_KEY = 'bt_discord_webhook';

export const DEFAULT_MESSAGES = {
  victor: 'Congrats to {mention} for beating **{level}** and being the **{ordinal}** victor!{link_line}',
  verify: '# Congrats to {mention} for verifying `{level}` — it\'s at top **#{top}** wow.. you so pro dude... teach me... Anyways GGs myaw',
  move: '**{level}** moved from **#{old_rank}** to **#{rank}** on the list!',
  acceptTitle: 'Submission accepted',
  accept: 'Accepted for **{list}**.',
  rejectTitle: 'Submission rejected',
  reject: 'Rejected for **{list}**.',
  enabledVictor: true,
  enabledVerify: true,
  enabledMove: true,
  enabledAccept: true,
  enabledReject: true,
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
      body: JSON.stringify({ content: String(content).slice(0, 1900) }),
    });
    if (res.ok || res.status === 204) return { ok: true };
    return { ok: false, error: 'HTTP ' + res.status };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
}

export async function sendDiscordEmbed(url, embed) {
  if (!url || !embed) return { ok: false, error: 'Missing url or embed' };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });
    if (res.ok || res.status === 204) return { ok: true };
    return { ok: false, error: 'HTTP ' + res.status };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
}

export function listTargetLabel(t) {
  if (t === 'impossible') return 'Impossible List';
  if (t === 'server_hardest') return 'Server Hardest';
  if (t === 'platformer') return 'Platformer List';
  return 'Main List';
}

/** Staff decision embed — includes which list. Optional msgs overrides title/description templates. */
export function buildSubmissionStatusEmbed(entry, status, msgs) {
  const accepted = status === 'accepted' || status === 'approved';
  const m = Object.assign({}, DEFAULT_MESSAGES, msgs || {});
  const listLabel = listTargetLabel(entry && entry.listTarget);
  const player = String((entry && entry.player) || '');
  const level = String((entry && (entry.levelName || entry.levelPath)) || '');
  const link = String((entry && (entry.link || entry.showcase)) || '');
  const vars = {
    player,
    mention: player ? '**' + player + '**' : '',
    level,
    list: listLabel,
    link,
    link_line: link ? '\n' + link : '',
    discord: String((entry && entry.discordUser) || ''),
  };
  const titleTpl = accepted ? (m.acceptTitle || 'Submission accepted') : (m.rejectTitle || 'Submission rejected');
  const bodyTpl = accepted ? (m.accept || DEFAULT_MESSAGES.accept) : (m.reject || DEFAULT_MESSAGES.reject);
  const title = formatMessage(titleTpl, vars) || (accepted ? 'Submission accepted' : 'Submission rejected');
  const description = formatMessage(bodyTpl, vars);
  const color = accepted ? 0x3dbb45 : 0xed4245;

  const fields = [
    { name: 'Player', value: (player || '—').slice(0, 200), inline: true },
    { name: 'Discord', value: String((entry && entry.discordUser) || '—').slice(0, 200), inline: true },
    { name: 'List', value: listLabel, inline: true },
    { name: 'Level', value: (level || '—').slice(0, 200), inline: false },
  ];
  if (link) {
    fields.push({ name: 'Link', value: link.slice(0, 300), inline: false });
  }

  return {
    title: title.slice(0, 250),
    description: (description || '').slice(0, 2000),
    color,
    fields,
    footer: { text: 'Broken Team · Submissions' },
    timestamp: new Date().toISOString(),
  };
}

export function diffLevelAnnouncements(prev, next) {
  const events = [];
  if (!next) return events;

  const prevVerifier = prev && prev.verifier ? String(prev.verifier).trim() : '';
  const nextVerifier = next.verifier ? String(next.verifier).trim() : '';
  if (nextVerifier && nextVerifier.toLowerCase() !== prevVerifier.toLowerCase()) {
    events.push({
      type: 'verify',
      player: nextVerifier,
      level: next.name,
      link: next.verification || '',
      rank: null,
      top: null,
    });
  }

  const prevRecs = (prev && prev.records) || [];
  const nextRecs = next.records || [];
  const prevUsers = new Set(prevRecs.map((r) => String(r.user || '').toLowerCase()));
  nextRecs.forEach((r) => {
    const u = String(r.user || '').toLowerCase();
    if (!u || prevUsers.has(u)) return;
    const pct = Number(r.percent);
    if (pct >= 100) {
      events.push({
        type: 'victor',
        player: r.user,
        level: next.name,
        link: r.link || '',
        rank: nextRecs.filter((x) => Number(x.percent) >= 100).length,
        percent: 100,
      });
    }
  });

  return events;
}

export function diffListOrder(prevOrder, nextOrder) {
  if (!Array.isArray(prevOrder) || !Array.isArray(nextOrder)) return [];
  const events = [];
  const prevIdx = {};
  prevOrder.forEach((p, i) => {
    prevIdx[p] = i;
  });
  nextOrder.forEach((p, i) => {
    if (prevIdx[p] == null) return;
    if (prevIdx[p] !== i) {
      events.push({
        type: 'move',
        path: p,
        old_rank: prevIdx[p] + 1,
        rank: i + 1,
        direction: i < prevIdx[p] ? 'up' : 'down',
      });
    }
  });
  return events;
}
