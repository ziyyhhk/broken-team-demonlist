import {
  auth, can, isOwner, logout, getUsersAsync, createAccount,
  getGithubToken, setGithubToken, githubPutFile, testGithubToken,
} from '../auth.js';
import { fetchList, fetchEditors, fetchConfig, fetchInfo, fetchRules } from '../content.js';
import Spinner from '../components/Spinner.js';
import { TAG_GROUPS } from '../tags.js';

function slugify(n) {
  return String(n || '').trim().replace(/[^a-zA-Z0-9]+/g, '').replace(/^\d+/, '') || 'NewLevel';
}

export default {
  components: { Spinner },
  data: () => ({
    auth, tab: 'levels', loading: true, list: [], listOrder: [], users: [],
    editors: null, config: null, infoText: '', rulesText: '', editorsText: '',
    selectedPath: null, draft: null, draftRecords: [], msg: '', err: '',
    saving: false, showAddLevel: false, mainCutoff: 75, extendedCutoff: 150,
    TAG_GROUPS,
    newLevel: { name: '', id: '', author: '', verifier: '', verification: '', thumbnail: '', length: '', percentToQualify: 100, tags: [] },
    newRec: { user: '', percent: 100, hz: 240, link: '' },
    levelSearch: '', newUser: '', newPass: '', newRole: 'helper',
    ghToken: '', activityLogs: [], serverHardestText: '[]',
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
  },
  template: `
<main class="page-admin page-shell">
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
<div v-if="loading" class="admin-panel"><Spinner /></div>
<template v-else>
<div v-if="tab==='tiers' && canList" class="admin-panel">
<h2>Tiers & order</h2>
<div class="admin-row">
<label>Main cutoff <input class="admin-input" type="number" min="1" v-model.number="mainCutoff" /></label>
<label>Extended cutoff <input class="admin-input" type="number" min="1" v-model.number="extendedCutoff" /></label>
</div>
<div class="admin-actions"><button type="button" class="auth-btn" :disabled="saving" @click="saveConfig">Save cutoffs</button></div>
<ul class="admin-order">
<li v-for="(p, i) in listOrder" :key="p">
<span class="admin-order__rank">#{{ i+1 }}</span>
<span>{{ p }}</span>
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
<p class="admin-hint">JSON array. Rank = order in the list.</p>
<textarea class="admin-ta" v-model="serverHardestText" rows="18"></textarea>
<div class="admin-actions"><button type="button" class="auth-btn" :disabled="saving" @click="saveServerHardest">Save Server Hardest</button></div>
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
<p class="admin-hint">Recent saves (client-side).</p>
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
    moveUp(i) { if (i <= 0) return; const a = this.listOrder.slice(); const t = a[i]; a[i] = a[i-1]; a[i-1] = t; this.listOrder = a; },
    moveDown(i) { if (i >= this.listOrder.length - 1) return; const a = this.listOrder.slice(); const t = a[i]; a[i] = a[i+1]; a[i+1] = t; this.listOrder = a; },
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
    addRecord() {
      if (!this.newRec.user) return;
      this.draftRecords.push({ user: this.newRec.user, percent: Number(this.newRec.percent) || 100, hz: Number(this.newRec.hz) || 240, link: this.newRec.link || '' });
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
      this.newLevel = { name: '', id: '', author: '', verifier: '', verification: '', thumbnail: '', length: '', percentToQualify: 100, tags: [] };
      this.selectLevel(path);
      this.flash('Level added at #1.');
    },
    async saveLevel() {
      if (!this.draft || !this.selectedPath) return;
      const payload = Object.assign({}, this.draft, { records: this.draftRecords || [] });
      const ok = await this.pushFile('data/' + this.selectedPath + '.json', JSON.stringify(payload, null, 4), 'Admin: update ' + (payload.name || this.selectedPath));
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
        await this.pushFile('data/_server_hardest.json', JSON.stringify(data, null, 4), 'Admin: Server Hardest');
      } catch (e) { this.flash('Invalid JSON', true); }
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
    const cfg = await fetchConfig();
    this.mainCutoff = cfg.mainCutoff;
    this.extendedCutoff = cfg.extendedCutoff;
    this.list = (await fetchList()) || [];
    this.listOrder = this.list.map((p) => (p[0] && p[0].path) || p[1]).filter(Boolean);
    try { this.infoText = JSON.stringify(await fetchInfo(), null, 4); } catch (e) { this.infoText = '{}'; }
    try { this.rulesText = JSON.stringify(await fetchRules(), null, 4); } catch (e) { this.rulesText = '{}'; }
    try { this.editorsText = JSON.stringify(await fetchEditors(), null, 4); } catch (e) { this.editorsText = '[]'; }
    await this.refreshUsers();
    this.tab = this.canList ? 'tiers' : 'levels';
    this.loading = false;
  },
};
