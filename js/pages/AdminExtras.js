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
    if (!this.boardPlayer && this.board.length) this.selectBoardPlayer(this.board[0]);
  },
  selectBoardPlayer(e) {
    if (!e) return;
    this.boardPlayer = e.user;
    this.boardRows = (e.scores || []).map((s) => ({ ...s }));
    this.verifiedRows = (e.verified || []).map((v) => ({ ...v }));
    this.setVerifierPath = '';
    this.addBeat = { path: '', percent: 100, hz: 240, link: '' };
  },
  openPlayerByName() {
    const name = (this.playerLookup || '').trim();
    if (!name) return;
    let found = this.board.find((e) => e.user.toLowerCase() === name.toLowerCase());
    if (!found) {
      found = { user: name, total: 0, scores: [], verified: [] };
      this.board.push(found);
    }
    this.selectBoardPlayer(found);
  },
  async setAsVerifier() {
    return this._boardSetVerifier && this._boardSetVerifier();
  },
  async clearVerifier(p) {
    return this._boardClearVerifier && this._boardClearVerifier(p);
  },
  addBeatToPlayer() {
    if (!this.boardPlayer || !this.addBeat.path) return;
    const path = this.addBeat.path;
    const rank = this.listOrder.indexOf(path) + 1;
    this.boardRows.push({
      path,
      rank: rank > 0 ? rank : '—',
      levelName: path,
      percent: this.addBeat.percent || 100,
      hz: this.addBeat.hz || 240,
      link: this.addBeat.link || '',
    });
    this.addBeat = { path: '', percent: 100, hz: 240, link: '' };
  },
  async saveBoardPlayer() {
    return this._boardSave && this._boardSave();
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
        this.serverLevels = Array.isArray(data)
          ? data.map((l) => ({
              ...l,
              tags: normalizeTags(l.tags),
              records: Array.isArray(l.records) ? l.records : [],
            }))
          : [];
      } else this.serverLevels = [];
    } catch (e) {
      this.serverLevels = [];
    }
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
      id: lv.id || '',
      name: lv.name || '',
      author: lv.author || '',
      verifier: lv.verifier || '',
      verification: lv.verification || '',
      length: lv.length || '',
      note: lv.note || '',
      tags: normalizeTags(lv.tags).slice(),
      records: JSON.parse(JSON.stringify(lv.records || [])),
    };
    this.shNewRec = { user: '', attempts: '', date: '', link: '' };
  },
  cancelShEdit() {
    this.shEditIndex = -2;
  },
  applyShForm() {
    if (!(this.shForm.name || '').trim()) {
      this.flash('Name required.', true);
      return;
    }
    const payload = {
      id: this.shForm.id,
      name: this.shForm.name.trim(),
      author: this.shForm.author,
      verifier: this.shForm.verifier,
      verification: this.shForm.verification,
      length: this.shForm.length,
      note: this.shForm.note,
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
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
    this.serverLevels = a;
  },
  async removeSh(i) {
    const lv = this.serverLevels[i];
    const label = (lv && lv.name) || ('#' + (i + 1));
    if (!confirm('Remove "' + label + '" from Server Hardest? This saves immediately.')) return;
    this.serverLevels.splice(i, 1);
    if (this.shEditIndex === i) this.shEditIndex = -2;
    else if (this.shEditIndex > i) this.shEditIndex -= 1;
    await this.pushFile(
      'data/_server_hardest.json',
      JSON.stringify(this.serverLevels, null, 4),
      'Admin: remove SH ' + label,
    );
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
