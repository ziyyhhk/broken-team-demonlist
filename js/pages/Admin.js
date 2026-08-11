import {
  auth, can, isOwner, logout, getUsersAsync, createAccount,
  getGithubToken, setGithubToken, githubPutFile, testGithubToken,
} from '../auth.js';
import { fetchList, fetchEditors, fetchConfig, fetchInfo, fetchRules } from '../content.js';
import Spinner from '../components/Spinner.js';

function slugify(n) {
  return String(n || '').trim().replace(/[^a-zA-Z0-9]+/g, '').replace(/^\d+/, '') || 'NewLevel';
}

export default {
  components: { Spinner },
  data: () => ({
    auth, tab: 'levels', loading: true, list: [], listOrder: [], users: [],
    activityLogs: [], serverHardestText: '[]',
    selectedPath: null, draft: null, draftRecords: [], msg: '', err: '',
    ghToken: '', tokenTestLines: [], tokenTesting: false, saving: false,
    newUser: '', newPass: '', newRole: 'admin', creating: false,
    mainCutoff: 75, extendedCutoff: 150, infoText: '', rulesText: '', editorsText: '',
    newRec: { user: '', percent: 100, hz: 240, link: '' }, levelSearch: '',
    syncPhase: '', syncSeconds: 60, showAddLevel: false,
    newLevel: { name: '', id: '', author: '', verifier: '', verification: '', length: '', percentToQualify: 100 },
    _syncTimer: null, _syncTick: null,
  }),
  computed: {
    canLevels() { return can('editLevels'); },
    canList() { return can('editList'); },
    canEditors() { return can('editEditors'); },
    canUsers() { return can('manageUsers') || isOwner(); },
    canToken() { return isOwner() || can('editLevels') || can('editList'); },
    tierPreview() {
      const main = Number(this.mainCutoff) || 0, ext = Number(this.extendedCutoff) || 0;
      return this.listOrder.map((name, i) => {
        const rank = i + 1;
        return { name, rank, tier: rank <= main ? 'Main' : rank <= ext ? 'Extended' : 'Legacy' };
      });
    },
    filteredLevels() {
      const q = (this.levelSearch || '').trim().toLowerCase();
      if (!q) return this.listOrder;
      return this.listOrder.filter((p) => p.toLowerCase().includes(q));
    },
  },
  template: `
<main v-if="loading" class="page-shell"><Spinner /></main>
<main v-else class="page-admin page-shell">
<aside class="admin-side">
<p class="admin-user">{{ auth.user && auth.user.username }} · {{ auth.user && auth.user.role }}</p>
<button type="button" class="admin-tab" :class="{ active: tab==='tiers' }" @click="tab='tiers'" v-if="canList">Tiers & order</button>
<button type="button" class="admin-tab" :class="{ active: tab==='levels' }" @click="tab='levels'" v-if="canLevels">Levels & records</button>
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
<div class="sync-toast" v-if="syncPhase" :class="'sync-toast--'+syncPhase">
<template v-if="syncPhase==='waiting'"><strong>Sync…</strong> ~{{ syncSeconds }}s</template>
<template v-else><strong>Sync done.</strong> Press Ctrl+Shift+R
<button type="button" class="sync-toast__x" @click="syncPhase=''">Dismiss</button></template>
</div>

<div v-if="tab==='tiers' && canList" class="admin-panel">
<h2>Tiers & order</h2>
<div class="admin-row">
<label>Main cutoff <input class="admin-input" type="number" min="1" v-model.number="mainCutoff" /></label>
<label>Extended cutoff <input class="admin-input" type="number" min="1" v-model.number="extendedCutoff" /></label>
</div>
<div class="admin-actions"><button type="button" class="auth-btn" :disabled="saving" @click="saveConfig">Save cutoffs</button></div>
<ul class="admin-order">
<li v-for="(row,i) in tierPreview" :key="row.name">
<span class="admin-order__rank">#{{ row.rank }}</span>
<span class="admin-role-tag">{{ row.tier }}</span>
<strong>{{ row.name }}</strong>
<span class="admin-order__btns">
<button type="button" @click="moveUp(i)" :disabled="i===0">↑</button>
<button type="button" @click="moveDown(i)" :disabled="i===listOrder.length-1">↓</button>
</span>
</li>
</ul>
<div class="admin-actions"><button type="button" class="auth-btn" :disabled="saving" @click="saveList">Save order</button></div>
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
<label>Length <input class="admin-input" v-model="newLevel.length" /></label>
</div>
<div class="admin-actions"><button type="button" class="auth-btn" :disabled="saving" @click="createLevel">Create</button></div>
</div>
<div class="level-picker">
<input class="admin-input" type="search" v-model="levelSearch" placeholder="Search…" />
<div class="level-picker__list">
<button type="button" class="level-picker__item" v-for="p in filteredLevels" :key="p" :class="{ active: selectedPath===p }" @click="selectLevel(p)">
<span class="level-picker__rank">#{{ listOrder.indexOf(p)+1 }}</span><span>{{ p }}</span>
</button>
</div>
</div>
<div class="admin-edit-card" v-if="draft">
<h3>{{ draft.name || selectedPath }}</h3>
<div class="admin-grid">
<label>Name <input class="admin-input" v-model="draft.name" /></label>
<label>ID <input class="admin-input" v-model.number="draft.id" type="number" /></label>
<label>Author <input class="admin-input" v-model="draft.author" /></label>
<label>Verifier <input class="admin-input" v-model="draft.verifier" /></label>
<label class="admin-grid--full">Video <input class="admin-input" v-model="draft.verification" /></label>
<label>Length <input class="admin-input" v-model="draft.length" /></label>
</div>
<h3>Victors</h3>
<div class="rec-table">
<div class="rec-table__row" v-for="(r,ri) in draftRecords" :key="ri">
<input class="admin-input" v-model="r.user" placeholder="Player" />
<input class="admin-input" v-model.number="r.percent" type="number" />
<input class="admin-input" v-model.number="r.hz" type="number" />
<input class="admin-input" v-model="r.link" placeholder="Video" />
<button type="button" class="rec-del" @click="draftRecords.splice(ri,1)">✕</button>
</div>
<div class="rec-table__row">
<input class="admin-input" v-model="newRec.user" placeholder="Player" />
<input class="admin-input" v-model.number="newRec.percent" type="number" />
<input class="admin-input" v-model.number="newRec.hz" type="number" />
<input class="admin-input" v-model="newRec.link" placeholder="Video" />
<button type="button" class="auth-btn auth-btn--ghost rec-add" @click="addRecord">Add</button>
</div>
</div>
<div class="admin-actions"><button type="button" class="auth-btn" :disabled="saving" @click="saveLevel">Save level</button></div>
</div>
</div>

<div v-if="tab==='server' && canLevels" class="admin-panel">
<h2>Server Hardest</h2>
<p class="admin-hint">JSON array. Rank = order in the list. Each item: name, id, author, verifier, verification (video), length, note, records: [{ user, attempts, date, link }]</p>
<textarea class="admin-ta" v-model="serverHardestText" rows="18"></textarea>
<div class="admin-actions"><button type="button" class="auth-btn" :disabled="saving" @click="saveServerHardest">Save Server Hardest</button></div>
</div>

<div v-if="tab==='info' && canLevels" class="admin-panel">
<h2>Info</h2>
<textarea class="admin-ta" v-model="infoText" rows="12"></textarea>
<div class="admin-actions"><button type="button" class="auth-btn" :disabled="saving" @click="saveInfo">Save</button></div>
</div>
<div v-if="tab==='rules' && canLevels" class="admin-panel">
<h2>Rules</h2>
<textarea class="admin-ta" v-model="rulesText" rows="12"></textarea>
<div class="admin-actions"><button type="button" class="auth-btn" :disabled="saving" @click="saveRules">Save</button></div>
</div>
<div v-if="tab==='editors' && canEditors" class="admin-panel">
<h2>Editors</h2>
<textarea class="admin-ta" v-model="editorsText" rows="10"></textarea>
<div class="admin-actions"><button type="button" class="auth-btn" :disabled="saving" @click="saveEditors">Save</button></div>
</div>
<div v-if="tab==='users' && canUsers" class="admin-panel">
<h2>Users</h2>
<div class="admin-create">
<label>Username <input class="admin-input" v-model="newUser" /></label>
<label>Password <input class="admin-input" v-model="newPass" type="password" /></label>
<label>Role <select class="admin-input" v-model="newRole"><option value="admin">Admin</option><option value="helper">Helper</option><option value="member">Member</option></select></label>
<button type="button" class="auth-btn" :disabled="creating" @click="createUser">Create</button>
</div>
<ul class="admin-userlist"><li v-for="u in users" :key="u.username"><strong>{{ u.username }}</strong> <span class="admin-role-tag">{{ u.role }}</span></li></ul>
</div>
<div v-if="tab==='settings' && canToken" class="admin-panel">
<h2>GitHub token</h2>
<label>Token <input class="admin-input" type="password" v-model="ghToken" placeholder="ghp_… or github_pat_…" autocomplete="off" /></label>
<div class="admin-actions">
<button type="button" class="auth-btn" @click="saveToken">Save token</button>
<button type="button" class="auth-btn auth-btn--ghost" :disabled="tokenTesting" @click="runTokenTest">{{ tokenTesting ? 'Testing…' : 'Test' }}</button>
</div>
<ul class="admin-userlist" v-if="tokenTestLines.length" style="margin-top:0.75rem"><li v-for="(line,i) in tokenTestLines" :key="i">{{ line }}</li></ul>
</div>

<div v-if="tab==='log' && (canLevels || canList)" class="admin-panel">
<h2>Activity log</h2>
<p class="admin-hint">Who changed what — newest first.</p>
<div class="admin-actions">
<button type="button" class="auth-btn auth-btn--ghost" @click="openLog">Refresh</button>
<button type="button" class="auth-btn auth-btn--ghost" :disabled="saving || !activityLogs.length" @click="clearLogs">Clear</button>
</div>
<ul class="admin-userlist" v-if="activityLogs.length">
<li v-for="(entry,i) in activityLogs" :key="i" style="flex-direction:column;align-items:flex-start;gap:0.3rem">
<div style="display:flex;gap:0.5rem;flex-wrap:wrap;width:100%">
<span class="admin-role-tag">{{ entry.action || 'save' }}</span>
<strong>{{ entry.user || '?' }}</strong>
<span class="admin-muted">{{ formatLogTime(entry.at) }}</span>
</div>
<span style="font-size:0.88rem;font-weight:700">{{ entry.detail || '' }}</span>
<span v-if="entry.path" class="admin-muted" style="font-size:0.75rem">{{ entry.path }}</span>
</li>
</ul>
<p v-else class="admin-hint">No entries yet. Save something and it shows here.</p>
</div>

</section>
</main>
  `,
  methods: {
    flash(msg, isErr) {
      this.msg = isErr ? '' : msg; this.err = isErr ? msg : '';
      clearTimeout(this._flashTimer);
      this._flashTimer = setTimeout(() => { this.msg = ''; this.err = ''; }, 10000);
    },
    startSyncNotify() {
      clearTimeout(this._syncTimer); clearInterval(this._syncTick);
      this.syncPhase = 'waiting'; this.syncSeconds = 60;
      this._syncTick = setInterval(() => { if (this.syncSeconds > 0) this.syncSeconds -= 1; }, 1000);
      this._syncTimer = setTimeout(() => { clearInterval(this._syncTick); this.syncPhase = 'done'; }, 60000);
    },
    async pushFile(path, text, message) {
      if (!getGithubToken()) { this.flash('No token — Settings first.', true); return false; }
      this.saving = true;
      const res = await githubPutFile(path, text, message);
      this.saving = false;
      if (!res.ok) { this.flash(res.error, true); return false; }
      this.flash('Saved to GitHub.'); this.startSyncNotify();
      if (path !== 'data/_logs.json') {
        try { await this.appendLog(message || ('Updated ' + path), path); } catch (e) {}
      }
      return true;
    },
    formatLogTime(iso) {
      if (!iso) return '';
      try { return new Date(iso).toLocaleString(); } catch (e) { return iso; }
    },
    async appendLog(detail, path) {
      const entry = {
        at: new Date().toISOString(),
        user: (auth.user && auth.user.username) || 'unknown',
        action: 'save', detail: detail || '', path: path || '',
      };
      let logs = [];
      try {
        const res = await fetch('./data/_logs.json?t=' + Date.now(), { cache: 'no-store' });
        if (res.ok) { const data = await res.json(); if (Array.isArray(data)) logs = data; }
      } catch (e) {}
      logs.unshift(entry);
      if (logs.length > 200) logs = logs.slice(0, 200);
      this.activityLogs = logs;
      await githubPutFile('data/_logs.json', JSON.stringify(logs, null, 4), 'Admin: activity log');
    },
    async openLog() {
      this.tab = 'log';
      try {
        const res = await fetch('./data/_logs.json?t=' + Date.now(), { cache: 'no-store' });
        if (res.ok) { const data = await res.json(); this.activityLogs = Array.isArray(data) ? data : []; }
        else this.activityLogs = [];
      } catch (e) { this.activityLogs = []; }
    },
    async clearLogs() {
      this.activityLogs = [];
      this.saving = true;
      const res = await githubPutFile('data/_logs.json', '[]', 'Admin: clear log');
      this.saving = false;
      if (!res.ok) this.flash(res.error, true);
      else { this.flash('Log cleared.'); this.startSyncNotify(); }
    },
    async openServerHardest() {
      this.tab = 'server';
      try {
        const res = await fetch('./data/_server_hardest.json?t=' + Date.now(), { cache: 'no-store' });
        if (res.ok) this.serverHardestText = JSON.stringify(await res.json(), null, 4);
        else this.serverHardestText = '[]';
      } catch (e) { this.serverHardestText = '[]'; }
    },
    async saveServerHardest() {
      try {
        const data = JSON.parse(this.serverHardestText);
        if (!Array.isArray(data)) { this.flash('Must be a JSON array', true); return; }
        await this.pushFile('data/_server_hardest.json', JSON.stringify(data, null, 4),
          'Admin: Server Hardest (' + data.length + ' levels)');
      } catch (e) { this.flash('Invalid JSON', true); }
    },
    onLogout() { logout(); this.$router.push('/login'); },
    async openUsers() { this.tab = 'users'; await this.refreshUsers(); },
    async refreshUsers() {
      const list = await getUsersAsync();
      this.users = list.map((u) => ({ username: u.username, role: u.role }));
    },
    selectLevel(p) {
      this.selectedPath = p;
      const found = this.list.find((pair) => pair[0] && pair[0].path === p);
      if (!found || !found[0]) { this.draft = null; this.draftRecords = []; return; }
      this.draft = JSON.parse(JSON.stringify(found[0]));
      this.draftRecords = JSON.parse(JSON.stringify(this.draft.records || []));
      delete this.draft.path; delete this.draft.records;
    },
    moveUp(i) {
      if (i <= 0) return;
      const a = this.listOrder.slice();
      [a[i - 1], a[i]] = [a[i], a[i - 1]];
      this.listOrder = a;
    },
    moveDown(i) {
      if (i >= this.listOrder.length - 1) return;
      const a = this.listOrder.slice();
      [a[i + 1], a[i]] = [a[i], a[i + 1]];
      this.listOrder = a;
    },
    async createUser() {
      this.creating = true;
      const res = await createAccount(this.newUser, this.newPass, this.newRole);
      this.creating = false;
      if (!res.ok) { this.flash(res.error, true); return; }
      this.flash('Created ' + this.newUser);
      if (res.synced) this.startSyncNotify();
      this.newUser = ''; this.newPass = '';
      await this.refreshUsers();
    },
    addRecord() {
      if (!this.newRec.user) return;
      this.draftRecords.push({
        user: this.newRec.user,
        percent: Number(this.newRec.percent) || 100,
        hz: Number(this.newRec.hz) || 240,
        link: this.newRec.link || '',
      });
      this.newRec = { user: '', percent: 100, hz: 240, link: '' };
    },
    async createLevel() {
      const n = this.newLevel;
      if (!(n.name || '').trim()) { this.flash('Name required.', true); return; }
      if (!(n.verifier || '').trim()) { this.flash('Verifier required.', true); return; }
      if (!(n.verification || '').trim()) { this.flash('Video required.', true); return; }
      let path = slugify(n.name);
      if (this.listOrder.includes(path)) path = path + Date.now().toString().slice(-4);
      const payload = {
        id: Number(n.id) || 0, name: n.name.trim(),
        author: (n.author || n.verifier).trim(),
        creators: [(n.author || n.verifier).trim()],
        verifier: n.verifier.trim(), verification: n.verification.trim(),
        percentToQualify: Number(n.percentToQualify) || 100,
        password: 'Free to Copy', length: n.length || '',
        creationDate: new Date().toLocaleDateString('en-US'), tags: [], records: [],
      };
      if (!(await this.pushFile('data/' + path + '.json', JSON.stringify(payload, null, 4), 'Admin: add ' + path))) return;
      const order = this.listOrder.slice(); order.unshift(path);
      if (!(await this.pushFile('data/_list.json', JSON.stringify(order, null, 4), 'Admin: list add'))) return;
      this.listOrder = order;
      this.list.unshift([Object.assign({}, payload, { path }), null]);
      this.showAddLevel = false;
      this.newLevel = { name: '', id: '', author: '', verifier: '', verification: '', length: '', percentToQualify: 100 };
      this.selectLevel(path);
      this.flash('Level added at #1.');
    },
    async saveLevel() {
      if (!this.draft || !this.selectedPath) return;
      const payload = Object.assign({}, this.draft, { records: this.draftRecords || [] });
      const ok = await this.pushFile(
        'data/' + this.selectedPath + '.json',
        JSON.stringify(payload, null, 4),
        'Admin: update ' + (payload.name || this.selectedPath),
      );
      if (ok) {
        const pair = this.list.find((p) => p[0] && p[0].path === this.selectedPath);
        if (pair) pair[0] = Object.assign({}, payload, { path: this.selectedPath });
      }
    },
    async saveList() {
      await this.pushFile('data/_list.json', JSON.stringify(this.listOrder, null, 4), 'Admin: order');
    },
    async saveConfig() {
      const cfg = { mainCutoff: Number(this.mainCutoff) || 1, extendedCutoff: Number(this.extendedCutoff) || 1 };
      if (cfg.extendedCutoff < cfg.mainCutoff) { this.flash('Extended must be ≥ Main.', true); return; }
      await this.pushFile('data/_config.json', JSON.stringify(cfg, null, 4), 'Admin: cutoffs');
    },
    async saveInfo() {
      try {
        const data = JSON.parse(this.infoText);
        await this.pushFile('data/info.json', JSON.stringify(data, null, 4), 'Admin: info');
      } catch (e) { this.flash('Invalid JSON', true); }
    },
    async saveRules() {
      try {
        const data = JSON.parse(this.rulesText);
        await this.pushFile('data/rules.json', JSON.stringify(data, null, 4), 'Admin: rules');
      } catch (e) { this.flash('Invalid JSON', true); }
    },
    async saveEditors() {
      try {
        const data = JSON.parse(this.editorsText);
        await this.pushFile('data/_editors.json', JSON.stringify(data, null, 4), 'Admin: editors');
      } catch (e) { this.flash('Invalid JSON', true); }
    },
    saveToken() {
      setGithubToken(this.ghToken);
      this.flash(getGithubToken() ? 'Token saved.' : 'Cleared.');
    },
    async runTokenTest() {
      if (this.ghToken) setGithubToken(this.ghToken);
      this.tokenTesting = true; this.tokenTestLines = ['Testing…'];
      const res = await testGithubToken(this.ghToken || getGithubToken());
      this.tokenTesting = false; this.tokenTestLines = res.steps || [];
      this.flash(res.ok ? 'Token OK.' : 'Token failed.', !res.ok);
    },
  },
  beforeUnmount() {
    clearTimeout(this._syncTimer); clearInterval(this._syncTick); clearTimeout(this._flashTimer);
  },
  async mounted() {
    if (!auth.user) { this.$router.replace('/login'); return; }
    if (!can('editLevels') && !can('editList') && !can('editEditors') && !can('manageUsers') && !isOwner()) {
      this.$router.replace('/'); return;
    }
    this.ghToken = getGithubToken();
    const cfg = await fetchConfig();
    this.mainCutoff = cfg.mainCutoff; this.extendedCutoff = cfg.extendedCutoff;
    const list = (await fetchList()) || [];
    this.list = list;
    this.listOrder = list.map((pair) => (pair[0] ? pair[0].path : pair[1])).filter(Boolean);
    this.editorsText = JSON.stringify((await fetchEditors()) || [], null, 4);
    this.infoText = JSON.stringify((await fetchInfo()) || {}, null, 4);
    this.rulesText = JSON.stringify((await fetchRules()) || {}, null, 4);
    await this.refreshUsers();
    this.tab = this.canList ? 'tiers' : 'levels';
    this.loading = false;
  },
};
