/** Discord webhook helpers for victor / verify / list-move announcements */

export const WEBHOOK_KEY = 'bt_discord_webhook';

export const DEFAULT_MESSAGES = {
  victor: 'ggs {mention} for beating **{level}** ({ordinal} victor){link_line}',
  verify: 'ggs {mention} for verifying **{level}** (#{top})',
  move: '**{level}** moved #{old_rank} -> #{rank}',
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

function field(name, value, inline) {
  const v = String(value == null || value === '' ? 'n/a' : value).slice(0, 1020);
  return { name: name, value: v, inline: !!inline };
}

function linkField(name, url) {
  const u = String(url || '').trim();
  if (!u) return null;
  const safe = u.slice(0, 300);
  return { name: name, value: '[Open video](' + safe + ')', inline: false };
}

/** Pending submission notify */
export function buildNewSubmissionEmbed(entry) {
  const e = entry || {};
  const listLabel = listTargetLabel(e.listTarget);
  const verifying = e.levelPath === '__verifying__' || e.mode === 'verifying';
  const levelName = String(e.levelName || e.levelPath || 'unknown');
  const levelLine = verifying ? levelName + ' (verifying)' : levelName;
  const discord =
    String(e.discordUser || '') + (e.displayName ? ' (' + e.displayName + ')' : '');
  const video = e.link || e.showcase || '';

  const fields = [
    field('Player', e.player, true),
    field('Discord', discord || 'n/a', true),
    field('List', listLabel, true),
    field('Level', levelLine, true),
  ];

  if (e.creator) fields.push(field('Creator', e.creator, true));
  if (e.verifier) fields.push(field('Verifier', e.verifier, true));

  const isImp = e.listTarget === 'impossible';
  if (!isImp && e.percent != null && e.percent !== '') {
    fields.push(field('Percent', e.percent + '%', true));
  }
  if (!isImp && e.device) fields.push(field('Device', e.device, true));
  if (!isImp && e.modMenu) fields.push(field('Mod menu', e.modMenu, true));
  if (e.length) fields.push(field('Length', e.length, true));
  if (e.attempts) fields.push(field('Attempts', e.attempts, true));
  if (e.customId) fields.push(field('Level ID', e.customId, true));

  const vid = linkField(isImp ? 'Showcase' : 'Video', video);
  if (vid) fields.push(vid);
  const raw = linkField('Raw footage', e.rawFootage);
  if (raw) fields.push(raw);
  if (e.notes) fields.push(field('Notes', e.notes, false));

  return {
    title: 'New submission',
    description: 'Pending review on **' + listLabel + '**',
    color: 0xf0b232,
    fields: fields.slice(0, 25),
    footer: { text: 'ID ' + String(e.id || '').slice(0, 40) + ' · pending' },
    timestamp: new Date().toISOString(),
  };
}

/** Staff decision embed */
export function buildSubmissionStatusEmbed(entry, status, msgs) {
  const accepted = status === 'accepted' || status === 'approved';
  const m = Object.assign({}, DEFAULT_MESSAGES, msgs || {});
  const e = entry || {};
  const listLabel = listTargetLabel(e.listTarget);
  const player = String(e.player || '');
  const level = String(e.levelName || e.levelPath || '');
  const link = String(e.link || e.showcase || '');
  const rank = e._rank != null ? Number(e._rank) : e.rank != null ? Number(e.rank) : null;
  const oldRank = e._oldRank != null ? Number(e._oldRank) : null;
  const kind = e._kind || e.kind || '';
  const removed = e._removed || e.removed || '';
  const discordId = String(e._discordId || '').replace(/\D/g, '');
  const mention = discordId ? '<@' + discordId + '>' : player ? '**' + player + '**' : '';

  const vars = {
    player,
    mention,
    level,
    list: listLabel,
    link,
    link_line: link ? '\n' + link : '',
    discord: String(e.discordUser || ''),
    rank: rank != null && !isNaN(rank) ? String(rank) : '',
    top: rank != null && !isNaN(rank) ? String(rank) : '',
    ordinal: rank != null && !isNaN(rank) ? ordinal(rank) : '',
    old_rank: oldRank != null && !isNaN(oldRank) ? String(oldRank) : '',
  };

  let title;
  let description;
  let color;
  let footer;

  if (!accepted) {
    title = formatMessage(m.rejectTitle || 'Submission rejected', vars) || 'Submission rejected';
    description = formatMessage(m.reject || DEFAULT_MESSAGES.reject, vars);
    color = 0xed4245;
    footer = 'Rejected';
  } else if (kind === 'verify') {
    title = 'Level verified';
    description =
      (mention ? mention + ' verified **' + level + '**' : '**' + level + '** was verified') +
      ' on **' +
      listLabel +
      '**' +
      (rank != null && !isNaN(rank) ? ' at **#' + rank + '**' : '') +
      '.';
    color = 0x5865f2;
    footer = listLabel + (rank != null ? ' · #' + rank : '');
  } else if (kind === 'victor') {
    title = 'New victor';
    description =
      (mention ? 'ggs ' + mention : 'ggs **' + player + '**') +
      ' for beating **' +
      level +
      '** on **' +
      listLabel +
      '**' +
      (rank != null && !isNaN(rank) ? ' (' + ordinal(rank) + ' victor)' : '') +
      '!';
    color = 0x3dbb45;
    footer = listLabel + (rank != null ? ' · victor #' + rank : '');
  } else if (kind === 'move') {
    title = 'List move';
    description =
      '**' +
      level +
      '** moved on **' +
      listLabel +
      '** from **#' +
      (oldRank != null ? oldRank : '?') +
      '** to **#' +
      (rank != null ? rank : '?') +
      '**.';
    color = 0xfaa61a;
    footer = listLabel;
  } else if (kind === 'remove') {
    title = 'Removed from list';
    description =
      '**' +
      (removed || level) +
      '** was removed from **' +
      listLabel +
      '**.';
    color = 0xed4245;
    footer = listLabel;
  } else {
    title = formatMessage(m.acceptTitle || 'Submission accepted', vars) || 'Submission accepted';
    description =
      formatMessage(m.accept || DEFAULT_MESSAGES.accept, vars) ||
      ('Accepted on **' + listLabel + '**' + (rank != null ? ' at **#' + rank + '**' : ''));
    color = 0x3dbb45;
    footer = 'Accepted · ' + listLabel;
  }

  const fields = [
    field('Player', player || 'n/a', true),
    field('List', listLabel, true),
    field('Level', level || 'n/a', true),
  ];
  if (e.discordUser) fields.splice(1, 0, field('Discord', e.discordUser, true));
  if (rank != null && !isNaN(rank)) fields.push(field('Placement', '#' + rank, true));
  if (oldRank != null && !isNaN(oldRank) && rank != null) {
    fields.push(field('Moved', '#' + oldRank + ' to #' + rank, true));
  }
  if (kind === 'verify' && e.verifier) fields.push(field('Verifier', e.verifier, true));
  if (kind === 'verify' && (e.creator || e.author)) {
    fields.push(field('Creator', e.creator || e.author, true));
  }
  if (removed) fields.push(field('Removed', removed, false));
  const vid = linkField('Video', link);
  if (vid) fields.push(vid);

  return {
    title: String(title).slice(0, 250),
    description: String(description || '').slice(0, 2000),
    color,
    fields: fields.slice(0, 25),
    footer: { text: String(footer).slice(0, 200) },
    timestamp: new Date().toISOString(),
  };
}

/** Congrats embed after accept */
export function buildCongratsEmbed(entry, kind, msgs) {
  const e = entry || {};
  const m = Object.assign({}, DEFAULT_MESSAGES, msgs || {});
  const listLabel = listTargetLabel(e.listTarget);
  const player = String(e.player || '');
  const level = String(e.levelName || e.levelPath || '');
  const rank = e._rank != null ? Number(e._rank) : null;
  const discordId = String(e._discordId || '').replace(/\D/g, '');
  const vars = {
    player,
    mention: discordId ? '<@' + discordId + '>' : player ? '**' + player + '**' : '',
    level,
    list: listLabel,
    link: String(e.link || e.showcase || ''),
    link_line: e.link || e.showcase ? '\n' + (e.link || e.showcase) : '',
    rank: rank != null ? String(rank) : '',
    top: rank != null ? String(rank) : '',
    ordinal: rank != null ? ordinal(rank) : '',
    old_rank: '',
  };
  const isVerify = kind === 'verify';
  const tpl = isVerify ? m.verify || DEFAULT_MESSAGES.verify : m.victor || DEFAULT_MESSAGES.victor;
  const body = formatMessage(tpl, vars);
  const color = isVerify ? 0x5865f2 : 0x57f287;
  return {
    title: isVerify ? 'Verified on ' + listLabel : 'Victor on ' + listLabel,
    description: (body || '').slice(0, 2000),
    color,
    fields: [
      field('Level', level || 'n/a', true),
      field('List', listLabel, true),
      rank != null ? field('Top', '#' + rank, true) : field('Top', 'n/a', true),
    ].filter(Boolean),
    footer: { text: 'Broken Team' },
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
