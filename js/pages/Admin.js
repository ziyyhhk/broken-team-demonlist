import {
  auth, can, isOwner, logout, getUsersAsync, createAccount,
  getGithubToken, setGithubToken, githubPutFile, testGithubToken,
} from '../auth.js';
import { fetchList, fetchEditors, fetchConfig, fetchInfo, fetchRules, fetchImpossible, fetchLeaderboard } from '../content.js';
import Spinner from '../components/Spinner.js';
import { TAG_GROUPS } from '../tags.js';

function slugify(n) {
  return String(n || '').trim().replace(/[^a-zA-Z0-9]+/g, '').replace(/^\d+/, '') || 'NewLevel';
}

const WEBHOOK_KEY = 'bt_discord_webhook';

export default {
  components: { Spinner },
  data: () => ({
    auth, tab: 'levels', loading: true, list: [], listOrder: [], impossibleOrder: [], users: [],
    editors: null, config: null, infoText: '', rulesText: '', editorsText: '',
    selectedPath: null, draft: null, draftRecords: [], msg: '', err: '',
    saving: false, showAddLevel: false, showAddImpossible: false, mainCutoff: 75, extendedCutoff: 150,
    TAG_GROUPS,
    newLevel: { name: '', id: '', author: '', verifier: '', verification: '', thumbnail: '', length: '', percentToQualify: 100, tags: [], targetList: 'main' },
    newImp: { name: '', id: '', author: '', verifier: '', verification: '', thumbnail: '', length: '', tags: [] },
    newRec: { user: '', percent: 100, link: '' },
    levelSearch: '', impSearch: '', newUser: '', newPass: '', newRole: 'helper',
    ghToken: '', activityLogs: [], serverHardestText: '[]', serverLevels: [],
    // Player ID / Discord
    leaderboard: [],
    playerDiscord: {},
    playerSearch: '',
    discordWebhook: '',
    manualPlayerName: '',
    manualPlayerId: '',
    testingWebhook: false,
  }),
  computed: {
    canLevels() { return can('editLevels'); },
    canList() { return can('editList'); },
    canEditors() { return can('editEditors'); },
    canUsers() { return isOwner(); },
    canToken() { return isOwner(); },
    filteredLevels() {
      const q = (this.levelSearch || '').trim().toLowerCase();
      if (!q) return this.listOrder;
      return this.listOrder.filter((p) => p.toLowerCase().includes(q));
    },
    filteredImpossible() {
      const q = (this.impSearch || '').trim().toLowerCase();
      if (!q) return this.impossibleOrder;
      return this.impossibleOrder.filter((p) => p.toLowerCase().includes(q));
    },
    isSelectedImpossible() {
      return this.selectedPath && this.impossibleOrder.includes(this.selectedPath);
    },
    playerRows() {
      const map = this.playerDiscord || {};
      const q = (this.playerSearch || '').trim().toLowerCase();
      const fromLb = (this.leaderboard || []).map((p, i) => ({
        rank: i + 1,
        name: p.user,
        total: p.total,
        onLeaderboard: true,
        discordId: map[p.user] || this.findDiscordCaseInsensitive(p.user) || '',
      }));
      const lbNames = new Set(fromLb.map((r) => r.name.toLowerCase()));
      const extras = Object.keys(map)
        .filter((n) => !lbNames.has(n.toLowerCase()))
        .map((n) => ({
          rank: null,
          name: n,
          total: null,
          onLeaderboard: false,
          discordId: map[n] || '',
        }));
      let rows = fromLb.concat(extras);
      if (q) {
        rows = rows.filter(
          (r) =>
            r.name.toLowerCase().includes(q) ||
            String(r.discordId).includes(q),
        );
      }
      return rows;
    },
    linkedCount() {
      return Object.values(this.playerDiscord || {}).filter((id) => String(id || '').trim()).length;
    },
  },
  template: `
<main class="page-admin page-shell">
<aside class="admin-side">
<p class="admin-user">{{ auth.user && auth.user.username }} · {{ auth.user && auth.user.role }}</p>
<button type="button" class="admin-tab" :class="{ active: tab==='tiers' }" @click="tab='tiers'" v-if="canList">Tiers & order</button>
<button type="button" class="admin-tab" :class="{ active: tab==='levels' }" @click="tab='levels'" v-if="canLevels">Levels & records</button>
<button type="button" class="admin-tab" :class="{ active: tab==='impossible' }" @click="openImpossible" v-if="canLevels || canList">Impossible List</button>
<button type="button" class="admin-tab" :class="{ active: tab==='players' }" @click="openPlayers" v-if="canLevels || canList">Player ID</button>
<button type="button" class="admin-tab" :class="{ active: tab==='server' }" @click="openServerHardest" v-if="canLevels">Server Hardest</button>
<button type="button" class="admin-tab" :class="{ active: tab==='info' }" @click="tab='info'" v-if="canLevels">Info</button>
<button type="button" class="admin-tab" :class="{ active: tab==='rules' }" @click="tab='rules'" v-if="canLevels">Rules</button>
<button type="button" class="admin-tab" :class="{ active: tab==='editors' }" @click="tab='editors'" v-if="canEditors">Editors</button>
<button type="button" class="admin-tab" :class="{ active: tab==='users' }" @click="openUsers" v-if="canUsers">Users</button>
<button type="button" class="admin-tab" :class="{ active: tab==='settings' }" @click="tab='settings'" v-if="canToken">Settings</button>
<button type="button" class="admin-tab" :class="{ active: tab==='log' }" @click="openLog" v-if="canLevels || canList">Activity log</button>
<button type="button" class="admin-tab admin-out" @click="onLogout">Log out</button>
</aside>
<section class="admin-main">
<p class="admin-banner" v-if="msg">{{ msg }}</p>
<p class="admin-banner admin-banner--err" v-if="err">{{ err }}</p>
<div v-if="loading" class="admin-panel"><Spinner /></div>
<template v-else>

<div v-if="tab==='players' && (canLevels || canList)" class="admin-panel admin-panel--wide">
<h2>Player ID</h2>
<p class="admin-hint">Link list names to Discord user IDs so webhooks can <strong>@mention</strong> them on verifies / new victors. Discord ID = right‑click user → Copy User ID (Developer Mode on).</p>

<div class="admin-edit-card" style="margin-bottom:1rem">
<h3 style="margin:0 0 0.5rem">Discord webhook</h3>
<p class="admin-hint">Channel → Edit channel → Integrations → Webhooks → New Webhook → Copy URL. Stored in this browser only (not public).</p>
<div class="admin-row" style="flex-wrap:wrap;gap:0.5rem;align-items:center">
<input class="admin-input" type="password" v-model="discordWebhook" placeholder="https://discord.com/api/webhooks/…" style="flex:1;min-width:16rem" autocomplete="off" />
<button type="button" class="auth-btn" @click="saveWebhookLocal">Save webhook</button>
<button type="button" class="auth-btn auth-btn--ghost" :disabled="testingWebhook" @click="testWebhook">{{ testingWebhook ? 'Sending…' : 'Test ping' }}</button>
</div>
</div>

<div class="admin-actions" style="margin-bottom:0.75rem;flex-wrap:wrap;gap:0.5rem">
<button type="button" class="auth-btn" :disabled="saving" @click="savePlayerDiscord">Save Discord IDs</button>
<button type="button" class="auth-btn auth-btn--ghost" @click="reloadPlayers">Reload leaderboard</button>
<span class="admin-muted">{{ linkedCount }} linked · {{ leaderboard.length }} on leaderboard</span>
</div>

<input class="admin-input" type="search" v-model="playerSearch" placeholder="Search player or Discord ID…" style="margin-bottom:0.75rem" />

<div class="admin-edit-card" style="margin-bottom:1rem">
<strong style="font-size:0.85rem">Add player not on leaderboard yet</strong>
<div class="admin-row" style="margin-top:0.4rem;flex-wrap:wrap;gap:0.4rem">
<input class="admin-input" v-model="manualPlayerName" placeholder="Exact list name" style="min-width:10rem;flex:1" />
<input class="admin-input" v-model="manualPlayerId" placeholder="Discord user ID" style="min-width:12rem;flex:1" />
<button type="button" class="auth-btn auth-btn--ghost" @click="addManualPlayer">Add</button>
</div>
</div>

<ul style="list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:0.35rem">
<li v-for="row in playerRows" :key="row.name" style="display:flex;align-items:center;gap:0.6rem;flex-wrap:wrap;padding:0.45rem 0.6rem;border:1px solid var(--color-border);border-radius:0.5rem;background:var(--color-surface)">
<span class="admin-order__rank" style="min-width:2.5rem">{{ row.rank != null ? '#' + row.rank : '—' }}</span>
<span style="flex:1;min-width:8rem;font-weight:600">{{ row.name }}</span>
<span class="admin-muted" style="min-width:4rem;font-size:0.8rem" v-if="row.total != null">{{ row.total }} pts</span>
<span class="admin-role-tag" v-if="!row.onLeaderboard" style="font-size:0.7rem">manual</span>
<input class="admin-input" :value="row.discordId" @input="setPlayerDiscord(row.name, $event.target.value)" placeholder="Discord user ID" style="width:14rem;min-width:10rem;font-family:monospace;font-size:0.85rem" />
<button type="button" class="rec-del" title="Clear ID" @click="setPlayerDiscord(row.name, '')" v-if="row.discordId">✕</button>
</li>
</ul>
<p v-if="!playerRows.length" class="admin-hint">No players yet — add records on levels or use “Add player” above.</p>
</div>

<div v-if="tab==='tiers' && canList" class="admin-panel">
<h2>Tiers & order</h2>
<div class="admin-row">
<label>Main cutoff <input class="admin-input" type="number" min="1" v-model.number="mainCutoff" /></label>
<label>Extended cutoff <input class="admin-input" type="number" min="1" v-model.number="extendedCutoff" /></label>
</div>
<div class="admin-actions"><button type="button" class="auth-btn" :disabled="saving" @click="saveConfig">Save cutoffs</button></div>
<h3>Main / Extended / Legacy order</h3>
<ul class="admin-order">
<li v-for="(p, i) in listOrder" :key="p">
<span class="admin-order__rank">#{{ i+1 }}</span>
<span>{{ p }}</span>
<span class="admin-order__btns">
<button type="button" @click="moveUp(i)" :disabled="i===0">↑</button>
<button type="button" @click="moveDown(i)" :disabled="i===listOrder.length-1">↓</button>
<button type="button" title="Move to Impossible" @click="moveToImpossible(i)">→ Imp</button>
</span>
</li>
</ul>
<div class="admin-actions"><button type="button" class="auth-btn" :disabled="saving" @click="saveList">Save main order</button></div>
<p class="admin-hint">Impossible list is managed in the <strong>Impossible List</strong> tab.</p>
</div>

<div v-if="tab==='impossible' && (canLevels || canList)" class="admin-panel admin-panel--wide">
<h2>Impossible List</h2>
<p class="admin-hint">No victor points — progress / WR only. Video is <strong>optional</strong>. Leave <strong>Verifier empty</strong> if the level is not verified yet. A <strong>100%</strong> clear auto-promotes to Main #1.</p>
<div class="admin-actions" style="margin-bottom:0.75rem">
<button type="button" class="auth-btn" @click="showAddImpossible=!showAddImpossible">{{ showAddImpossible?'Hide':'+ Add Impossible level' }}</button>
<button type="button" class="auth-btn" :disabled="saving" @click="saveImpossible">Save order</button>
</div>
<div class="admin-edit-card" v-if="showAddImpossible">
<div class="admin-grid">
<label>Name * <input class="admin-input" v-model="newImp.name" /></label>
<label>ID <input class="admin-input" v-model="newImp.id" type="number" /></label>
<label>Creator / Author * <input class="admin-input" v-model="newImp.author" placeholder="Who built it" /></label>
<label>Verifier <input class="admin-input" v-model="newImp.verifier" placeholder="Leave empty if unverified" /></label>
<label class="admin-grid--full">Video (optional) <input class="admin-input" v-model="newImp.verification" placeholder="Not required for Impossible" /></label>
<label class="admin-grid--full">Thumbnail (optional) <input class="admin-input" v-model="newImp.thumbnail" placeholder="Image URL" /></label>
<label>Length <input class="admin-input" v-model="newImp.length" /></label>
</div>
<div class="admin-tags">
<div class="admin-tags__head"><strong>Tags</strong></div>
<div class="admin-tag-group" v-for="g in TAG_GROUPS" :key="g.name">
<div class="admin-tag-group__title">{{ g.name }}</div>
<div class="admin-tag-group__row">
<button type="button" class="admin-tag-chip" v-for="tg in g.tags" :key="tg" :class="{ on: (newImp.tags || []).includes(tg) }" @click="toggleImpTag(tg)">{{ tg }}</button>
</div></div></div>
<div class="admin-actions"><button type="button" class="auth-btn" :disabled="saving" @click="createImpossibleLevel">Create on Impossible</button></div>
</div>
<input class="admin-input" type="search" v-model="impSearch" placeholder="Search Impossible…" style="margin-bottom:0.5rem" />
<ul class="admin-order">
<li v-for="(p, i) in filteredImpossible" :key="'imp-'+p">
<span class="admin-order__rank">#{{ impossibleOrder.indexOf(p)+1 }}</span>
<span style="flex:1;cursor:pointer" @click="selectLevel(p)">{{ p }}</span>
<span class="admin-order__btns">
<button type="button" @click="impMoveUp(impossibleOrder.indexOf(p))" :disabled="impossibleOrder.indexOf(p)===0">↑</button>
<button type="button" @click="impMoveDown(impossibleOrder.indexOf(p))" :disabled="impossibleOrder.indexOf(p)===impossibleOrder.length-1">↓</button>
<button type="button" title="Promote to Main #1" @click="promoteImpossible(impossibleOrder.indexOf(p))">→ Main</button>
</span>
</li>
</ul>
<p v-if="!impossibleOrder.length" class="admin-hint">Empty — click + Add Impossible level.</p>
<div class="admin-edit-card" v-if="draft && isSelectedImpossible">
<h3>{{ draft.name || selectedPath }} <span class="admin-role-tag">Impossible</span></h3>
<div class="admin-grid">
<label>Name <input class="admin-input" v-model="draft.name" /></label>
<label>ID <input class="admin-input" v-model.number="draft.id" type="number" /></label>
<label>Creator / Author <input class="admin-input" v-model="draft.author" /></label>
<label>Verifier <input class="admin-input" v-model="draft.verifier" placeholder="Leave empty if unverified" /></label>
<label class="admin-grid--full">Video (optional) <input class="admin-input" v-model="draft.verification" /></label>
<label class="admin-grid--full">Thumbnail <input class="admin-input" v-model="draft.thumbnail" /></label>
<label>Length <input class="admin-input" v-model="draft.length" /></label>
</div>
<h3>Records / WR</h3>
<p class="admin-hint">Progress only. Saving a <strong>100%</strong> record promotes to Main #1.</p>
<div class="rec-table">
<div class="rec-table__row" v-for="(r,ri) in draftRecords" :key="ri">
<span class="admin-order__rank">#{{ ri + 1 }}</span>
<input class="admin-input" v-model="r.user" placeholder="Player" style="min-width:8rem;flex:1" />
<input class="admin-input" v-model.number="r.percent" type="number" min="1" max="100" style="width:4.5rem" placeholder="%" />
<input class="admin-input" v-model="r.link" placeholder="Video URL (optional)" style="flex:2;min-width:10rem" />
<button type="button" class="rec-del" @click="draftRecords.splice(ri,1)">✕</button>
</div>
<div class="rec-table__row">
<span class="admin-order__rank">+</span>
<input class="admin-input" v-model="newRec.user" placeholder="Player" style="min-width:8rem;flex:1" />
<input class="admin-input" v-model.number="newRec.percent" type="number" min="1" max="100" style="width:4.5rem" />
<input class="admin-input" v-model="newRec.link" placeholder="Video URL" style="flex:2;min-width:10rem" />
<button type="button" class="auth-btn auth-btn--ghost rec-add" @click="addRecord">Add</button>
</div>
</div>
<div class="admin-actions"><button type="button" class="auth-btn" :disabled="saving" @click="saveLevel">Save level</button></div>
</div>
</div>

<div v-if="tab==='levels' && canLevels" class="admin-panel admin-panel--wide">
<h2>Levels</h2>
<div class="admin-actions"><button type="button" class="auth-btn" @click="showAddLevel=!showAddLevel">{{ showAddLevel?'Hide':'+ New level' }}</button></div>
<div class="admin-edit-card" v-if="showAddLevel">
<div class="admin-grid">
<label>Name * <input class="admin-input" v-model="newLevel.name" /></label>
<label>ID <input class="admin-input" v-model="newLevel.id" type="number" /></label>
<label>Author <input class="admin-input" v-model="newLevel.author" /></label>
<label>Verifier * <input class="admin-input" v-model="newLevel.verifier" /></label>
<label class="admin-grid--full">Video * <input class="admin-input" v-model="newLevel.verification" /></label>
<label class="admin-grid--full">Thumbnail (optional URL) <input class="admin-input" v-model="newLevel.thumbnail" placeholder="Image URL — leave empty for YouTube thumb" /></label>
<label>Length <input class="admin-input" v-model="newLevel.length" /></label>
</div>
<div class="admin-tags">
<div class="admin-tags__head"><strong>Tags / Filters</strong> <span class="admin-muted">click to toggle</span></div>
<div class="admin-tag-group" v-for="g in TAG_GROUPS" :key="g.name">
<div class="admin-tag-group__title">{{ g.name }}</div>
<div class="admin-tag-group__row">
<button type="button" class="admin-tag-chip" v-for="tg in g.tags" :key="tg" :class="{ on: (newLevel.tags || []).includes(tg) }" @click="toggleNewLevelTag(tg)">{{ tg }}</button>
</div></div></div>
<div class="admin-actions"><button type="button" class="auth-btn" :disabled="saving" @click="createLevel">Create on Main</button></div>
</div>
<div class="level-picker">
<input class="admin-input" type="search" v-model="levelSearch" placeholder="Search…" />
<div class="level-picker__list">
<button type="button" class="level-picker__item" v-for="p in filteredLevels" :key="p" :class="{ active: selectedPath===p }" @click="selectLevel(p)">
<span class="level-picker__rank">#{{ listOrder.indexOf(p)+1 }}</span><span>{{ p }}</span>
</button>
</div>
</div>
<div class="admin-edit-card" v-if="draft && !isSelectedImpossible">
<h3>{{ draft.name || selectedPath }}</h3>
<div class="admin-grid">
<label>Name <input class="admin-input" v-model="draft.name" /></label>
<label>ID <input class="admin-input" v-model.number="draft.id" type="number" /></label>
<label>Author <input class="admin-input" v-model="draft.author" /></label>
<label>Verifier <input class="admin-input" v-model="draft.verifier" /></label>
<label class="admin-grid--full">Video <input class="admin-input" v-model="draft.verification" /></label>
<label class="admin-grid--full">Thumbnail (optional URL) <input class="admin-input" v-model="draft.thumbnail" placeholder="Image URL — leave empty for YouTube thumb" /></label>
<label>Length <input class="admin-input" v-model="draft.length" /></label>
</div>
<div class="admin-tags">
<div class="admin-tags__head"><strong>Tags / Filters</strong> <span class="admin-muted">{{ (draft.tags || []).length }} selected</span></div>
<div class="admin-tag-group" v-for="g in TAG_GROUPS" :key="g.name">
<div class="admin-tag-group__title">{{ g.name }}</div>
<div class="admin-tag-group__row">
<button type="button" class="admin-tag-chip" v-for="tg in g.tags" :key="tg" :class="{ on: (draft.tags || []).includes(tg) }" @click="toggleDraftTag(tg)">{{ tg }}</button>
</div></div></div>
<h3>Victors</h3>
<p class="admin-hint">Order = rank on the level. First row = 1st victor. Percent = clear % (100 = full clear).</p>
<div class="rec-table">
<div class="rec-table__row" v-for="(r,ri) in draftRecords" :key="ri">
<span class="admin-order__rank">#{{ ri + 1 }}</span>
<input class="admin-input" v-model="r.user" placeholder="Player name" style="min-width:8rem;flex:1" />
<input class="admin-input" v-model.number="r.percent" type="number" min="1" max="100" title="Clear percent" style="width:4.5rem" placeholder="%" />
<input class="admin-input" v-model="r.link" placeholder="Video URL" style="flex:2;min-width:10rem" />
<button type="button" class="auth-btn auth-btn--ghost" style="padding:0.2rem 0.4rem" @click="moveRecord(ri,-1)" :disabled="ri===0" title="Move up">↑</button>
<button type="button" class="auth-btn auth-btn--ghost" style="padding:0.2rem 0.4rem" @click="moveRecord(ri,1)" :disabled="ri===draftRecords.length-1" title="Move down">↓</button>
<button type="button" class="rec-del" @click="draftRecords.splice(ri,1)">✕</button>
</div>
<div class="rec-table__row">
<span class="admin-order__rank">+</span>
<input class="admin-input" v-model="newRec.user" placeholder="Player name" style="min-width:8rem;flex:1" />
<input class="admin-input" v-model.number="newRec.percent" type="number" min="1" max="100" title="Clear percent" style="width:4.5rem" placeholder="%" />
<input class="admin-input" v-model="newRec.link" placeholder="Video URL" style="flex:2;min-width:10rem" />
<button type="button" class="auth-btn auth-btn--ghost rec-add" @click="addRecord">Add</button>
</div>
</div>
<div class="admin-actions"><button type="button" class="auth-btn" :disabled="saving" @click="saveLevel">Save level</button></div>
</div>
</div>

<div v-if="tab==='server' && canLevels" class="admin-panel admin-panel--wide">
<h2>Server Hardest</h2>
<p class="admin-hint">Rank = row order. Use ↑↓ to reorder.</p>
<div class="admin-actions" style="margin-bottom:0.75rem">
<button type="button" class="auth-btn" @click="shAddRow">+ Add level</button>
<button type="button" class="auth-btn" :disabled="saving" @click="saveServerHardest">Save all</button>
<button type="button" class="auth-btn auth-btn--ghost" @click="openServerHardest">Reload</button>
</div>
<ul class="sh-list" style="list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:0.75rem">
<li v-for="(lv, i) in serverLevels" :key="i" style="border:1px solid var(--color-border);border-radius:0.75rem;padding:0.75rem;background:var(--color-surface)">
<div class="admin-row" style="margin-bottom:0.4rem">
<span class="admin-order__rank">#{{ i + 1 }}</span>
<input class="admin-input" v-model="lv.name" placeholder="Level name" style="flex:1;min-width:8rem" />
<input class="admin-input" v-model="lv.id" placeholder="ID" style="width:7rem" />
<input class="admin-input" v-model="lv.author" placeholder="Creator" style="width:8rem" />
<input class="admin-input" v-model="lv.length" placeholder="Len" style="width:4rem" />
<button type="button" class="auth-btn auth-btn--ghost" style="padding:0.2rem 0.4rem" @click="shMove(i,-1)" :disabled="i===0">↑</button>
<button type="button" class="auth-btn auth-btn--ghost" style="padding:0.2rem 0.4rem" @click="shMove(i,1)" :disabled="i===serverLevels.length-1">↓</button>
<button type="button" class="rec-del" @click="shRemove(i)">✕</button>
</div>
<div class="admin-row" style="margin-bottom:0.4rem">
<input class="admin-input" v-model="lv.verification" placeholder="Main video URL" style="flex:1;min-width:12rem" />
<input class="admin-input" v-model="lv.thumbnail" placeholder="Thumbnail URL (optional)" style="flex:1;min-width:8rem" />
</div>
<div class="admin-row" style="margin-bottom:0.4rem">
<input class="admin-input" v-model="lv.verifier" placeholder="Verifier name" style="width:9rem" />
<input class="admin-input" v-model="lv.verifierVideo" placeholder="Verifier video URL" style="flex:1;min-width:12rem" />
</div>
<div style="margin-top:0.35rem">
<div class="admin-row" style="margin-bottom:0.3rem"><strong style="font-size:0.85rem">Victors</strong>
<button type="button" class="auth-btn auth-btn--ghost" style="padding:0.15rem 0.5rem" @click="shAddVictor(i)">+ Victor</button></div>
<div class="admin-row" v-for="(r, ri) in (lv.records || [])" :key="ri" style="margin-bottom:0.25rem">
<span class="admin-order__rank">#{{ ri + 1 }}</span>
<input class="admin-input" v-model="r.user" placeholder="Victor name" style="width:9rem" />
<input class="admin-input" v-model="r.link" placeholder="Victor video URL" style="flex:1;min-width:12rem" />
<button type="button" class="rec-del" @click="shRemoveVictor(i, ri)">✕</button>
</div>
</div>
</li>
</ul>
</div>

<div v-if="tab==='info' && canLevels" class="admin-panel">
<h2>Info</h2>
<textarea class="admin-ta" v-model="infoText" rows="12"></textarea>
<div class="admin-actions"><button type="button" class="auth-btn" :disabled="saving" @click="saveInfo">Save info</button></div>
</div>
<div v-if="tab==='rules' && canLevels" class="admin-panel">
<h2>Rules</h2>
<textarea class="admin-ta" v-model="rulesText" rows="12"></textarea>
<div class="admin-actions"><button type="button" class="auth-btn" :disabled="saving" @click="saveRules">Save rules</button></div>
</div>
<div v-if="tab==='editors' && canEditors" class="admin-panel">
<h2>Editors</h2>
<textarea class="admin-ta" v-model="editorsText" rows="10"></textarea>
<div class="admin-actions"><button type="button" class="auth-btn" :disabled="saving" @click="saveEditors">Save editors</button></div>
</div>
<div v-if="tab==='users' && canUsers" class="admin-panel">
<h2>Users</h2>
<div class="admin-grid">
<label>Username <input class="admin-input" v-model="newUser" /></label>
<label>Password <input class="admin-input" v-model="newPass" type="password" /></label>
<label>Role <select class="admin-input" v-model="newRole"><option value="admin">Admin</option><option value="helper">Helper</option><option value="member">Member</option></select></label>
</div>
<div class="admin-actions"><button type="button" class="auth-btn" :disabled="saving" @click="addUser">Add user</button></div>
<ul class="admin-userlist"><li v-for="u in users" :key="u.username"><strong>{{ u.username }}</strong> <span class="admin-role-tag">{{ u.role }}</span></li></ul>
</div>
<div v-if="tab==='settings' && canToken" class="admin-panel">
<h2>Settings</h2>
<label>Token <input class="admin-input" type="password" v-model="ghToken" placeholder="ghp_… or github_pat_…" autocomplete="off" /></label>
<div class="admin-actions"><button type="button" class="auth-btn" @click="saveToken">Save token</button><button type="button" class="auth-btn auth-btn--ghost" @click="testToken">Test</button></div>
</div>
<div v-if="tab==='log'" class="admin-panel">
<h2>Activity log</h2>
</div>
</template>
</section>
</main>
  `,
  methods: {
    flash(m, isErr) { if (isErr) { this.err = m; this.msg = ''; } else { this.msg = m; this.err = ''; } setTimeout(() => { this.msg = ''; this.err = ''; }, 4000); },
    onLogout() { logout(); location.hash = '#/login'; },
    async pushFile(path, text, message) {
      this.saving = true;
      try {
        const ok = await githubPutFile(path, text, message);
        if (ok) this.flash('Saved: ' + path);
        else this.flash('Save failed: ' + path, true);
        return ok;
      } catch (e) {
        this.flash(String(e.message || e), true);
        return false;
      } finally { this.saving = false; }
    },
    openImpossible() { this.tab = 'impossible'; this.showAddImpossible = false; },
    async openPlayers() {
      this.tab = 'players';
      await this.reloadPlayers();
    },
    findDiscordCaseInsensitive(name) {
      const map = this.playerDiscord || {};
      const key = Object.keys(map).find((k) => k.toLowerCase() === String(name).toLowerCase());
      return key ? map[key] : '';
    },
    setPlayerDiscord(name, id) {
      const next = Object.assign({}, this.playerDiscord);
      const clean = String(id || '').replace(/\D/g, '');
      if (!clean) {
        // remove this name and any case-variant
        Object.keys(next).forEach((k) => {
          if (k.toLowerCase() === String(name).toLowerCase()) delete next[k];
        });
      } else {
        // keep canonical key = leaderboard spelling if present
        Object.keys(next).forEach((k) => {
          if (k.toLowerCase() === String(name).toLowerCase() && k !== name) delete next[k];
        });
        next[name] = clean;
      }
      this.playerDiscord = next;
    },
    addManualPlayer() {
      const name = (this.manualPlayerName || '').trim();
      if (!name) { this.flash('Player name required.', true); return; }
      this.setPlayerDiscord(name, this.manualPlayerId);
      this.manualPlayerName = '';
      this.manualPlayerId = '';
      this.flash('Added ' + name + ' — click Save Discord IDs.');
    },
    saveWebhookLocal() {
      try {
        localStorage.setItem(WEBHOOK_KEY, (this.discordWebhook || '').trim());
        this.flash('Webhook saved in this browser.');
      } catch (e) {
        this.flash('Could not save webhook locally.', true);
      }
    },
    async testWebhook() {
      const url = (this.discordWebhook || '').trim();
      if (!url) { this.flash('Paste a webhook URL first.', true); return; }
      this.testingWebhook = true;
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: '✅ Broken Team Demonlist webhook test — Player ID tab is connected.',
          }),
        });
        if (res.ok || res.status === 204) this.flash('Test message sent to Discord.');
        else this.flash('Webhook failed: HTTP ' + res.status, true);
      } catch (e) {
        this.flash('Webhook error: ' + (e.message || e), true);
      } finally {
        this.testingWebhook = false;
      }
    },
    async reloadPlayers() {
      try {
        const [lb] = await fetchLeaderboard();
        this.leaderboard = Array.isArray(lb) ? lb : [];
      } catch (e) {
        this.leaderboard = [];
      }
      try {
        const res = await fetch('./data/_player_discord.json?t=' + Date.now(), { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          this.playerDiscord = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
        } else this.playerDiscord = {};
      } catch (e) {
        this.playerDiscord = {};
      }
      try {
        this.discordWebhook = localStorage.getItem(WEBHOOK_KEY) || '';
      } catch (e) {
        this.discordWebhook = '';
      }
    },
    async savePlayerDiscord() {
      const cleaned = {};
      Object.keys(this.playerDiscord || {}).forEach((name) => {
        const id = String(this.playerDiscord[name] || '').replace(/\D/g, '');
        if (name && id) cleaned[name] = id;
      });
      this.playerDiscord = cleaned;
      await this.pushFile(
        'data/_player_discord.json',
        JSON.stringify(cleaned, null, 4),
        'Admin: player Discord IDs (' + Object.keys(cleaned).length + ')',
      );
    },
    moveUp(i) { if (i <= 0) return; const a = this.listOrder.slice(); const t = a[i]; a[i] = a[i-1]; a[i-1] = t; this.listOrder = a; },
    moveDown(i) { if (i >= this.listOrder.length - 1) return; const a = this.listOrder.slice(); const t = a[i]; a[i] = a[i+1]; a[i+1] = t; this.listOrder = a; },
    impMoveUp(i) { if (i <= 0) return; const a = this.impossibleOrder.slice(); const t = a[i]; a[i] = a[i-1]; a[i-1] = t; this.impossibleOrder = a; },
    impMoveDown(i) { if (i >= this.impossibleOrder.length - 1) return; const a = this.impossibleOrder.slice(); const t = a[i]; a[i] = a[i+1]; a[i+1] = t; this.impossibleOrder = a; },
    async moveToImpossible(i) {
      const p = this.listOrder[i];
      if (!p) return;
      const order = this.listOrder.slice(); order.splice(i, 1);
      const imp = this.impossibleOrder.slice();
      if (!imp.includes(p)) imp.push(p);
      this.listOrder = order;
      this.impossibleOrder = imp;
      await this.saveList();
      await this.saveImpossible();
      this.flash(p + ' moved to Impossible.');
    },
    async promoteImpossible(i) {
      const p = this.impossibleOrder[i];
      if (!p) return;
      const imp = this.impossibleOrder.slice(); imp.splice(i, 1);
      const order = this.listOrder.slice();
      if (!order.includes(p)) order.unshift(p);
      this.impossibleOrder = imp;
      this.listOrder = order;
      await this.saveImpossible();
      await this.saveList();
      this.flash(p + ' promoted to Main #1.');
    },
    selectLevel(p) {
      this.selectedPath = p;
      const found = this.list.find((pair) => pair[0] && pair[0].path === p);
      if (!found || !found[0]) { this.draft = null; this.draftRecords = []; return; }
      this.draft = JSON.parse(JSON.stringify(found[0]));
      if (!Array.isArray(this.draft.tags)) this.draft.tags = [];
      this.draftRecords = JSON.parse(JSON.stringify(this.draft.records || []));
      delete this.draft.path; delete this.draft.records;
    },
    toggleDraftTag(tag) {
      if (!this.draft) return;
      if (!Array.isArray(this.draft.tags)) this.draft.tags = [];
      const i = this.draft.tags.indexOf(tag);
      if (i === -1) this.draft.tags.push(tag);
      else this.draft.tags.splice(i, 1);
    },
    toggleNewLevelTag(tag) {
      if (!Array.isArray(this.newLevel.tags)) this.newLevel.tags = [];
      const i = this.newLevel.tags.indexOf(tag);
      if (i === -1) this.newLevel.tags.push(tag);
      else this.newLevel.tags.splice(i, 1);
    },
    toggleImpTag(tag) {
      if (!Array.isArray(this.newImp.tags)) this.newImp.tags = [];
      const i = this.newImp.tags.indexOf(tag);
      if (i === -1) this.newImp.tags.push(tag);
      else this.newImp.tags.splice(i, 1);
    },
    moveRecord(i, dir) {
      const j = i + dir;
      if (j < 0 || j >= this.draftRecords.length) return;
      const a = this.draftRecords.slice();
      const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
      this.draftRecords = a;
    },
    addRecord() {
      if (!this.newRec.user) return;
      this.draftRecords.push({ user: this.newRec.user, percent: Number(this.newRec.percent) || 100, link: this.newRec.link || '' });
      this.newRec = { user: '', percent: 100, link: '' };
    },
    async createImpossibleLevel() {
      const n = this.newImp;
      if (!(n.name || '').trim()) { this.flash('Name required.', true); return; }
      const author = (n.author || '').trim() || n.name.trim();
      let path = slugify(n.name);
      if (this.listOrder.includes(path) || this.impossibleOrder.includes(path)) path = path + Date.now().toString().slice(-4);
      const tags = Array.isArray(n.tags) ? n.tags.slice() : [];
      if (!tags.includes('Impossible List')) tags.push('Impossible List');
      const payload = {
        id: Number(n.id) || 0,
        name: n.name.trim(),
        author,
        creators: [author],
        verifier: (n.verifier || '').trim(),
        verification: (n.verification || '').trim(),
        thumbnail: (n.thumbnail || '').trim(),
        percentToQualify: 100,
        password: 'Free to Copy',
        length: n.length || '',
        creationDate: new Date().toLocaleDateString('en-US'),
        tags,
        records: [],
      };
      if (!(await this.pushFile('data/' + path + '.json', JSON.stringify(payload, null, 4), 'Admin: add impossible ' + path))) return;
      const imp = this.impossibleOrder.slice(); imp.unshift(path);
      if (!(await this.pushFile('data/_impossible.json', JSON.stringify(imp, null, 4), 'Admin: impossible add'))) return;
      this.impossibleOrder = imp;
      this.list.unshift([Object.assign({}, payload, { path }), null]);
      this.showAddImpossible = false;
      this.newImp = { name: '', id: '', author: '', verifier: '', verification: '', thumbnail: '', length: '', tags: [] };
      this.selectLevel(path);
      this.flash('Added to Impossible.');
    },
    async createLevel() {
      const n = this.newLevel;
      if (!(n.name || '').trim()) { this.flash('Name required.', true); return; }
      if (!(n.verifier || '').trim()) { this.flash('Verifier required.', true); return; }
      if (!(n.verification || '').trim()) { this.flash('Video required for Main list.', true); return; }
      let path = slugify(n.name);
      if (this.listOrder.includes(path) || this.impossibleOrder.includes(path)) path = path + Date.now().toString().slice(-4);
      const payload = {
        id: Number(n.id) || 0, name: n.name.trim(),
        author: (n.author || n.verifier).trim(),
        creators: [(n.author || n.verifier).trim()],
        verifier: n.verifier.trim(), verification: n.verification.trim(),
        thumbnail: (n.thumbnail || '').trim(),
        percentToQualify: Number(n.percentToQualify) || 100,
        password: 'Free to Copy', length: n.length || '',
        creationDate: new Date().toLocaleDateString('en-US'), tags: Array.isArray(n.tags) ? n.tags.slice() : [], records: [],
      };
      if (!(await this.pushFile('data/' + path + '.json', JSON.stringify(payload, null, 4), 'Admin: add ' + path))) return;
      const order = this.listOrder.slice(); order.unshift(path);
      if (!(await this.pushFile('data/_list.json', JSON.stringify(order, null, 4), 'Admin: list add'))) return;
      this.listOrder = order;
      this.list.unshift([Object.assign({}, payload, { path }), null]);
      this.showAddLevel = false;
      this.newLevel = { name: '', id: '', author: '', verifier: '', verification: '', thumbnail: '', length: '', percentToQualify: 100, tags: [], targetList: 'main' };
      this.selectLevel(path);
      this.flash('Level added at Main #1.');
    },
    async saveLevel() {
      if (!this.draft || !this.selectedPath) return;
      if (this.isSelectedImpossible && Array.isArray(this.draft.creators) && this.draft.author) {
        this.draft.creators = [this.draft.author];
      }
      const payload = Object.assign({}, this.draft, { records: this.draftRecords || [] });
      const ok = await this.pushFile('data/' + this.selectedPath + '.json', JSON.stringify(payload, null, 4), 'Admin: update ' + (payload.name || this.selectedPath));
      if (ok) {
        const pair = this.list.find((p) => p[0] && p[0].path === this.selectedPath);
        if (pair) pair[0] = Object.assign({}, payload, { path: this.selectedPath });
        if (this.isSelectedImpossible) {
          const hasClear = (this.draftRecords || []).some((r) => Number(r.percent) === 100);
          if (hasClear) {
            const idx = this.impossibleOrder.indexOf(this.selectedPath);
            if (idx !== -1) await this.promoteImpossible(idx);
          }
        }
      }
    },
    async saveList() {
      await this.pushFile('data/_list.json', JSON.stringify(this.listOrder, null, 4), 'Admin: order');
    },
    async saveImpossible() {
      await this.pushFile('data/_impossible.json', JSON.stringify(this.impossibleOrder, null, 4), 'Admin: impossible order');
    },
    async saveConfig() {
      const cfg = { mainCutoff: Number(this.mainCutoff) || 1, extendedCutoff: Number(this.extendedCutoff) || 1 };
      if (cfg.extendedCutoff < cfg.mainCutoff) { this.flash('Extended must be ≥ Main.', true); return; }
      await this.pushFile('data/_config.json', JSON.stringify(cfg, null, 4), 'Admin: cutoffs');
    },
    async openServerHardest() {
      this.tab = 'server';
      try {
        const res = await fetch('./data/_server_hardest.json?t=' + Date.now(), { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          this.serverLevels = Array.isArray(data) ? data.map(function (l) {
            const o = Object.assign({}, l);
            o.records = Array.isArray(o.records) ? o.records.map(function (r) {
              return Object.assign({ user: '', link: '', attempts: null, date: '' }, r || {});
            }) : [];
            return o;
          }) : [];
        } else this.serverLevels = [];
      } catch (e) { this.serverLevels = []; }
    },
    shAddRow() {
      this.serverLevels.push({ id: '', name: '', author: '', verifier: '', verifierVideo: '', verification: '', thumbnail: '', length: '', records: [] });
    },
    shAddVictor(i) {
      if (!this.serverLevels[i].records) this.serverLevels[i].records = [];
      this.serverLevels[i].records.push({ user: '', link: '' });
    },
    shRemoveVictor(i, ri) { this.serverLevels[i].records.splice(ri, 1); },
    shMove(i, dir) {
      const j = i + dir;
      if (j < 0 || j >= this.serverLevels.length) return;
      const a = this.serverLevels.slice();
      const t = a[i]; a[i] = a[j]; a[j] = t;
      this.serverLevels = a;
    },
    async shRemove(i) {
      if (!confirm('Remove this level?')) return;
      this.serverLevels.splice(i, 1);
    },
    async saveServerHardest() {
      const payload = this.serverLevels.map(function (l) {
        const o = Object.assign({}, l);
        o.records = (o.records || []).filter(function (r) { return r && String(r.user || '').trim(); });
        return o;
      });
      await this.pushFile('data/_server_hardest.json', JSON.stringify(payload, null, 4), 'Admin: Server Hardest');
    },
    async saveInfo() {
      try { const data = JSON.parse(this.infoText); await this.pushFile('data/info.json', JSON.stringify(data, null, 4), 'Admin: info'); }
      catch (e) { this.flash('Invalid JSON', true); }
    },
    async saveRules() {
      try { const data = JSON.parse(this.rulesText); await this.pushFile('data/rules.json', JSON.stringify(data, null, 4), 'Admin: rules'); }
      catch (e) { this.flash('Invalid JSON', true); }
    },
    async saveEditors() {
      try { const data = JSON.parse(this.editorsText); await this.pushFile('data/_editors.json', JSON.stringify(data, null, 4), 'Admin: editors'); }
      catch (e) { this.flash('Invalid JSON', true); }
    },
    async openUsers() { this.tab = 'users'; await this.refreshUsers(); },
    async refreshUsers() { this.users = (await getUsersAsync()) || []; },
    async addUser() {
      if (!this.newUser || !this.newPass) { this.flash('User + pass required', true); return; }
      const ok = await createAccount(this.newUser, this.newPass, this.newRole);
      if (ok) { this.flash('User created'); this.newUser = ''; this.newPass = ''; await this.refreshUsers(); }
      else this.flash('Create failed', true);
    },
    saveToken() { setGithubToken(this.ghToken); this.flash('Token saved locally'); },
    async testToken() {
      const r = await testGithubToken();
      this.flash(r ? 'Token OK' : 'Token failed', !r);
    },
    openLog() { this.tab = 'log'; },
  },
  async mounted() {
    if (!auth.user) { location.hash = '#/login'; return; }
    this.ghToken = getGithubToken() || '';
    try { this.discordWebhook = localStorage.getItem(WEBHOOK_KEY) || ''; } catch (e) { this.discordWebhook = ''; }
    const cfg = await fetchConfig();
    this.mainCutoff = cfg.mainCutoff;
    this.extendedCutoff = cfg.extendedCutoff;
    this.list = (await fetchList()) || [];
    this.listOrder = this.list.map((p) => (p[0] && p[0].path) || p[1]).filter(Boolean);
    const imp = (await fetchImpossible()) || [];
    this.impossibleOrder = imp.map((p) => (p[0] && p[0].path) || p[1]).filter(Boolean);
    imp.forEach((pair) => {
      if (pair[0] && pair[0].path && !this.list.some((x) => x[0] && x[0].path === pair[0].path)) {
        this.list.push(pair);
      }
    });
    try { this.infoText = JSON.stringify(await fetchInfo(), null, 4); } catch (e) { this.infoText = '{}'; }
    try { this.rulesText = JSON.stringify(await fetchRules(), null, 4); } catch (e) { this.rulesText = '{}'; }
    try { this.editorsText = JSON.stringify(await fetchEditors(), null, 4); } catch (e) { this.editorsText = '[]'; }
    await this.refreshUsers();
    this.tab = this.canList ? 'tiers' : 'levels';
    this.loading = false;
  },
};
