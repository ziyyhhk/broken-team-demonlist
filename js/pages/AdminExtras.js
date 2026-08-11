import { fetchLeaderboard } from '../content.js';
import { TAG_GROUPS, normalizeTags } from '../tags.js';
import { githubPutFile } from '../auth.js';

export { TAG_GROUPS, normalizeTags };

export function emptyShLevel() {
  return { id: '', name: '', author: '', verifier: '', verification: '', length: '', note: '', tags: [], records: [] };
}

export const boardMethods = {
  async openBoard() {
    this.tab = 'board';
    const pair = await fetchLeaderboard();
    this.board = (pair && pair[0]) || [];
    if (this.boardPlayer) this.selectBoardPlayer(this.boardPlayer);
  },
  selectBoardPlayer(entry) {
    const name = typeof entry === 'string' ? entry : entry.user;
    this.boardPlayer = name; this.playerLookup = name;
    const rows = [], verified = [];
    this.list.forEach((pair, idx) => {
      const level = pair[0]; if (!level) return;
      const rank = idx + 1;
      if (level.verifier && String(level.verifier).toLowerCase() === name.toLowerCase())
        verified.push({ path: level.path, levelName: level.name, rank });
      (level.records || []).forEach((r) => {
        if (r.user && r.user.toLowerCase() === name.toLowerCase())
          rows.push({ path: level.path, levelName: level.name, rank, percent: r.percent, hz: r.hz || 240, link: r.link || '' });
      });
    });
    this.verifiedRows = verified; this.boardRows = rows;
    this.addBeat = { path: '', percent: 100, hz: 240, link: '' }; this.setVerifierPath = '';
  },
  openPlayerByName() {
    const name = (this.playerLookup || '').trim();
    if (!name) { this.flash('Type a player name first.', true); return; }
    this.selectBoardPlayer(name); this.flash('Editing ' + name);
  },
  async setAsVerifier() {
    if (!this.boardPlayer || !this.setVerifierPath) { this.flash('Pick player + level.', true); return; }
    const path = this.setVerifierPath;
    const pair = this.list.find((p) => p[0] && p[0].path === path);
    if (!pair || !pair[0]) { this.flash('Level not found.', true); return; }
    const level = JSON.parse(JSON.stringify(pair[0]));
    level.verifier = this.boardPlayer; delete level.path;
    const ok = await this.pushFile('data/' + path + '.json', JSON.stringify(level, null, 4), 'Admin: verifier ' + this.boardPlayer);
    if (!ok) return;
    pair[0].verifier = this.boardPlayer; this.selectBoardPlayer(this.boardPlayer);
  },
  async clearVerifier(path) {
    const pair = this.list.find((p) => p[0] && p[0].path === path);
    if (!pair || !pair[0]) return;
    const level = JSON.parse(JSON.stringify(pair[0]));
    level.verifier = ''; delete level.path;
    const ok = await this.pushFile('data/' + path + '.json', JSON.stringify(level, null, 4), 'Admin: clear verifier');
    if (!ok) return;
    pair[0].verifier = ''; this.selectBoardPlayer(this.boardPlayer);
  },
  addBeatToPlayer() {
    if (!this.boardPlayer || !this.addBeat.path) { this.flash('Pick a level.', true); return; }
    const path = this.addBeat.path;
    const pair = this.list.find((p) => p[0] && p[0].path === path);
    if (!pair || !pair[0]) return;
    const level = pair[0], rank = this.listOrder.indexOf(path) + 1;
    this.boardRows = this.boardRows.filter((r) => r.path !== path);
    this.boardRows.push({ path, levelName: level.name, rank, percent: Number(this.addBeat.percent) || 100, hz: Number(this.addBeat.hz) || 240, link: this.addBeat.link || '' });
    this.addBeat = { path: '', percent: 100, hz: 240, link: '' };
  },
  async saveBoardPlayer() {
    if (!this.boardPlayer) return;
    const player = this.boardPlayer;
    const byPath = {};
    this.boardRows.forEach((r) => { byPath[r.path] = byPath[r.path] || []; byPath[r.path].push(r); });
    this.saving = true; const errors = [];
    for (let i = 0; i < this.listOrder.length; i++) {
      const path = this.listOrder[i];
      const pair = this.list.find((p) => p[0] && p[0].path === path);
      if (!pair || !pair[0]) continue;
      const level = JSON.parse(JSON.stringify(pair[0]));
      let recs = (level.records || []).filter((r) => !(r.user && r.user.toLowerCase() === player.toLowerCase()));
      (byPath[path] || []).forEach((r) => {
        recs.push({ user: player, percent: Number(r.percent) || 100, hz: Number(r.hz) || 240, link: r.link || '' });
      });
      level.records = recs; delete level.path;
      const res = await githubPutFile('data/' + path + '.json', JSON.stringify(level, null, 4), 'Admin: board ' + player);
      if (!res.ok) errors.push(res.error); else pair[0].records = recs;
    }
    this.saving = false;
    if (errors.length) { this.flash(errors[0], true); return; }
    this.flash('Saved for ' + player); this.startSyncNotify();
    try { await this.appendLog('board records ' + player, 'data/*'); } catch (e) {}
    await this.openBoard();
  },
};

export const shMethods = {
  async openServerHardest() {
    this.tab = 'server';
    this.shEditIndex = -2;
    try {
      const res = await fetch('./data/_server_hardest.json?t=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        this.serverLevels = Array.isArray(data) ? data.map((l) => ({
          ...l, tags: normalizeTags(l.tags), records: Array.isArray(l.records) ? l.records : [],
        })) : [];
      } else this.serverLevels = [];
    } catch (e) { this.serverLevels = []; }
  },
  startNewSh() {
    this.shEditIndex = -1;
    this.shForm = emptyShLevel();
    this.shNewRec = { user: '', attempts: '', date: '', link: '' };
  },
  editSh(i) {
    this.shEditIndex = i;
    const lv = this.serverLevels[i] || {};
    this.shForm = {
      id: lv.id || '', name: lv.name || '', author: lv.author || '', verifier: lv.verifier || '',
      verification: lv.verification || '', length: lv.length || '', note: lv.note || '',
      tags: normalizeTags(lv.tags).slice(),
      records: JSON.parse(JSON.stringify(lv.records || [])),
    };
    this.shNewRec = { user: '', attempts: '', date: '', link: '' };
  },
  cancelShEdit() { this.shEditIndex = -2; },
  applyShForm() {
    if (!(this.shForm.name || '').trim()) { this.flash('Name required.', true); return; }
    const payload = {
      id: this.shForm.id, name: this.shForm.name.trim(),
      author: this.shForm.author, verifier: this.shForm.verifier,
      verification: this.shForm.verification, length: this.shForm.length, note: this.shForm.note,
      tags: normalizeTags(this.shForm.tags),
      records: (this.shForm.records || []).filter((r) => r && r.user),
    };
    if (this.shEditIndex >= 0) this.serverLevels.splice(this.shEditIndex, 1, payload);
    else this.serverLevels.push(payload);
    this.shEditIndex = -2;
    this.flash('Applied — click Save all when ready.');
  },
  moveSh(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= this.serverLevels.length) return;
    const a = this.serverLevels.slice();
    const t = a[i]; a[i] = a[j]; a[j] = t;
    this.serverLevels = a;
  },
  removeSh(i) {
    this.serverLevels.splice(i, 1);
    if (this.shEditIndex === i) this.shEditIndex = -2;
  },
  addShRec() {
    if (!this.shNewRec.user) return;
    if (!this.shForm.records) this.shForm.records = [];
    this.shForm.records.push({ ...this.shNewRec });
    this.shNewRec = { user: '', attempts: '', date: '', link: '' };
  },
  async saveServerHardest() {
    await this.pushFile(
      'data/_server_hardest.json',
      JSON.stringify(this.serverLevels, null, 4),
      'Admin: Server Hardest (' + this.serverLevels.length + ' levels)',
    );
  },
  toggleTag(arr, tag) {
    if (!Array.isArray(arr)) return;
    const i = arr.indexOf(tag);
    if (i === -1) arr.push(tag);
    else arr.splice(i, 1);
  },
};
