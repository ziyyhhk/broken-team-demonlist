export default Vue.defineAsyncComponent(async () => {
  const CDN = 'https://cdn.jsdelivr.net/gh/ziyyhhk/broken-team-demonlist@1562ed3c8171bf007a22daa608c535e9eef4f659/js/pages/Admin.js';
  const jsBase = new URL('../', import.meta.url).href;
  const pagesBase = new URL('./', import.meta.url).href;

  let code = await (await fetch(CDN)).text();

  code = code.replace(/(from\s+['"])\.\.\/([^'"]+)(['"])/g, function (_, a, p, c) {
    return a + jsBase + p + c;
  });
  code = code.replace(/(from\s+['"])\.\/([^'"]+)(['"])/g, function (_, a, p, c) {
    return a + pagesBase + p + c;
  });

  if (code.indexOf('fetchLeaderboard') === -1) {
    code = code.replace(
      /import \{ fetchList, fetchEditors, fetchConfig, fetchInfo, fetchRules \} from ['"][^'"]+content\.js['"];/,
      "import { fetchList, fetchEditors, fetchConfig, fetchInfo, fetchRules, fetchLeaderboard } from '" + jsBase + "content.js';"
    );
  }

  code = code.replace(
    "activityLogs: [], serverHardestText: '[]',",
    "activityLogs: [], serverHardestText: '[]', serverLevels: [], board: [], boardPlayer: null, boardSearch: '', boardAdd: { path: '', percent: 100, hz: 240, link: '' },"
  );

  code = code.replace(
    '<button type="button" @click="moveDown(i)" :disabled="i===listOrder.length-1">↓</button>\n</span>',
    '<button type="button" @click="moveDown(i)" :disabled="i===listOrder.length-1">↓</button>\n<button type="button" class="rec-del" title="Remove" @click="removeFromList(i)">✕</button>\n</span>'
  );

  code = code.replace(
    'Levels & records</button>',
    'Levels & records</button>\n<button type="button" class="admin-tab" :class="{ active: tab===\'board\' }" @click="openBoard" v-if="canLevels">Leaderboard</button>'
  );

  var shMethods = [
    "async openServerHardest() {",
    "      this.tab = 'server';",
    "      try {",
    "        var res = await fetch('./data/_server_hardest.json?t=' + Date.now(), { cache: 'no-store' });",
    "        if (res.ok) {",
    "          var data = await res.json();",
    "          this.serverLevels = Array.isArray(data) ? data.map(function(l) { return Object.assign({}, l, { records: l.records || [], victor: l.victor || l.verifier || '' }); }) : [];",
    "        } else this.serverLevels = [];",
    "      } catch (e) { this.serverLevels = []; }",
    "    },",
    "    shAddRow() {",
    "      this.serverLevels.push({ id: '', name: '', author: '', victor: '', verification: '', length: '', note: '', tags: [], records: [] });",
    "    },",
    "    shMove(i, dir) {",
    "      var j = i + dir;",
    "      if (j < 0 || j >= this.serverLevels.length) return;",
    "      var a = this.serverLevels.slice();",
    "      var t = a[i]; a[i] = a[j]; a[j] = t;",
    "      this.serverLevels = a;",
    "    },",
    "    async shRemove(i) {",
    "      var name = (this.serverLevels[i] && this.serverLevels[i].name) || ('#' + (i + 1));",
    "      if (!confirm('Remove ' + name + ' from Server Hardest? Saves immediately.')) return;",
    "      this.serverLevels.splice(i, 1);",
    "      await this.pushFile('data/_server_hardest.json', JSON.stringify(this.serverLevels, null, 4), 'Admin: remove SH ' + name);",
    "    },",
    "    async saveServerHardest() {",
    "      var payload = this.serverLevels.map(function(l) {",
    "        var o = Object.assign({}, l);",
    "        if (o.victor && !o.verifier) o.verifier = o.victor;",
    "        return o;",
    "      });",
    "      await this.pushFile('data/_server_hardest.json', JSON.stringify(payload, null, 4), 'Admin: Server Hardest (' + this.serverLevels.length + ' levels)');",
    "    },",
  ].join('\n');

  code = code.replace(
    /async openServerHardest\(\) \{[\s\S]*?\n    \},\n    async saveServerHardest\(\) \{[\s\S]*?\n    \},/,
    shMethods
  );

  if (code.indexOf('async removeFromList(') === -1) {
    code = code.replace('async saveList() {', [
      "async removeFromList(i) {",
      "      var name = this.listOrder[i];",
      "      if (!name) return;",
      "      if (!confirm('Remove ' + name + ' from the list? Saves immediately.')) return;",
      "      this.listOrder.splice(i, 1);",
      "      this.list = this.list.filter(function (pair) {",
      "        var p = pair[0] ? pair[0].path : pair[1];",
      "        return p !== name;",
      "      });",
      "      if (this.selectedPath === name) { this.selectedPath = null; this.draft = null; }",
      "      await this.pushFile('data/_list.json', JSON.stringify(this.listOrder, null, 4), 'Admin: remove ' + name);",
      "    },",
      "    async saveList() {",
    ].join('\n'));
  }

  if (code.indexOf('async openBoard(') === -1) {
    code = code.replace('async saveList() {', [
      "async openBoard() {",
      "      this.tab = 'board';",
      "      try {",
      "        var pair = await fetchLeaderboard();",
      "        this.board = (pair && pair[0]) || [];",
      "      } catch (e) { this.board = []; }",
      "      if (this.boardPlayer) {",
      "        var still = this.board.find(function (e) { return e.user === this.boardPlayer; }.bind(this));",
      "        if (!still) this.boardPlayer = null;",
      "      }",
      "    },",
      "    selectBoardPlayer(e) {",
      "      if (!e) return;",
      "      this.boardPlayer = e.user;",
      "      this.boardAdd = { path: '', percent: 100, hz: 240, link: '' };",
      "    },",
      "    findLevelByName(name) {",
      "      return this.list.find(function (pair) { return pair[0] && pair[0].name === name; });",
      "    },",
      "    findLevelByPath(path) {",
      "      return this.list.find(function (pair) { return pair[0] && pair[0].path === path; });",
      "    },",
      "    async boardSaveLevel(path, levelObj, msg) {",
      "      var payload = Object.assign({}, levelObj);",
      "      delete payload.path;",
      "      var ok = await this.pushFile('data/' + path + '.json', JSON.stringify(payload, null, 4), msg || ('Admin: board ' + path));",
      "      if (ok) {",
      "        var pair = this.findLevelByPath(path);",
      "        if (pair) pair[0] = Object.assign({}, payload, { path: path });",
      "      }",
      "      return ok;",
      "    },",
      "    async boardRemoveRecord(levelName, kind) {",
      "      if (!this.boardPlayer) return;",
      "      var pair = this.findLevelByName(levelName);",
      "      if (!pair || !pair[0]) { this.flash('Level not found: ' + levelName, true); return; }",
      "      var path = pair[0].path;",
      "      var lv = JSON.parse(JSON.stringify(pair[0]));",
      "      var user = this.boardPlayer;",
      "      if (kind === 'verified') {",
      "        if ((lv.verifier || '').toLowerCase() === user.toLowerCase()) lv.verifier = '';",
      "      } else {",
      "        lv.records = (lv.records || []).filter(function (r) {",
      "          return !r || !r.user || r.user.toLowerCase() !== user.toLowerCase();",
      "        });",
      "      }",
      "      if (!confirm('Remove ' + user + ' from ' + levelName + '? Saves immediately.')) return;",
      "      var ok = await this.boardSaveLevel(path, lv, 'Admin: remove ' + user + ' from ' + path);",
      "      if (ok) await this.openBoard();",
      "    },",
      "    async boardAddRecord() {",
      "      if (!this.boardPlayer || !this.boardAdd.path) { this.flash('Pick a level first.', true); return; }",
      "      var path = this.boardAdd.path;",
      "      var pair = this.findLevelByPath(path);",
      "      if (!pair || !pair[0]) { this.flash('Level not found.', true); return; }",
      "      var lv = JSON.parse(JSON.stringify(pair[0]));",
      "      var user = this.boardPlayer;",
      "      lv.records = lv.records || [];",
      "      lv.records = lv.records.filter(function (r) {",
      "        return !r || !r.user || r.user.toLowerCase() !== user.toLowerCase();",
      "      });",
      "      lv.records.push({",
      "        user: user,",
      "        percent: Number(this.boardAdd.percent) || 100,",
      "        hz: Number(this.boardAdd.hz) || 240,",
      "        link: this.boardAdd.link || '',",
      "      });",
      "      var ok = await this.boardSaveLevel(path, lv, 'Admin: add ' + user + ' on ' + path);",
      "      if (ok) {",
      "        this.boardAdd = { path: '', percent: 100, hz: 240, link: '' };",
      "        await this.openBoard();",
      "      }",
      "    },",
      "    async boardSetVerifier() {",
      "      if (!this.boardPlayer || !this.boardAdd.path) { this.flash('Pick a level first.', true); return; }",
      "      var path = this.boardAdd.path;",
      "      var pair = this.findLevelByPath(path);",
      "      if (!pair || !pair[0]) return;",
      "      var lv = JSON.parse(JSON.stringify(pair[0]));",
      "      lv.verifier = this.boardPlayer;",
      "      var ok = await this.boardSaveLevel(path, lv, 'Admin: set verifier ' + this.boardPlayer + ' on ' + path);",
      "      if (ok) await this.openBoard();",
      "    },",
      "    async boardRemovePlayer() {",
      "      if (!this.boardPlayer) return;",
      "      var user = this.boardPlayer;",
      "      if (!confirm('Remove ALL records + verifier roles for ' + user + '?')) return;",
      "      var self = this;",
      "      var changed = 0;",
      "      for (var i = 0; i < this.list.length; i++) {",
      "        var pair = this.list[i];",
      "        if (!pair || !pair[0]) continue;",
      "        var lv = JSON.parse(JSON.stringify(pair[0]));",
      "        var path = lv.path;",
      "        var dirty = false;",
      "        if ((lv.verifier || '').toLowerCase() === user.toLowerCase()) { lv.verifier = ''; dirty = true; }",
      "        var before = (lv.records || []).length;",
      "        lv.records = (lv.records || []).filter(function (r) {",
      "          return !r || !r.user || r.user.toLowerCase() !== user.toLowerCase();",
      "        });",
      "        if (lv.records.length !== before) dirty = true;",
      "        if (dirty) {",
      "          var ok = await self.boardSaveLevel(path, lv, 'Admin: strip ' + user + ' from ' + path);",
      "          if (ok) changed++;",
      "        }",
      "      }",
      "      this.flash('Updated ' + changed + ' level(s).');",
      "      this.boardPlayer = null;",
      "      await this.openBoard();",
      "    },",
      "    async boardCreatePlayer() {",
      "      var name = (this.boardSearch || '').trim();",
      "      if (!name) { this.flash('Type a player name in search first.', true); return; }",
      "      var exists = this.board.find(function (e) { return e.user.toLowerCase() === name.toLowerCase(); });",
      "      if (exists) { this.selectBoardPlayer(exists); return; }",
      "      this.board.unshift({ user: name, total: 0, verified: [], completed: [], progressed: [] });",
      "      this.selectBoardPlayer(this.board[0]);",
      "      this.flash('Player ready — add a clear on a level to save them.');",
      "    },",
      "    async saveList() {",
    ].join('\n'));
  }

  var oldPanel = [
    'tab===\'server\' && canLevels" class="admin-panel">',
    '<h2>Server Hardest</h2>',
    '<p class="admin-hint">JSON array. Rank = order in the list. Each item: name, id, author, verifier, verification (video), length, note, records: [{ user, attempts, date, link }]</p>',
    '<textarea class="admin-ta" v-model="serverHardestText" rows="18"></textarea>',
    '<div class="admin-actions"><button type="button" class="auth-btn" :disabled="saving" @click="saveServerHardest">Save Server Hardest</button></div>',
    '</div>',
  ].join('\n');

  var newPanel = [
    'tab===\'server\' && canLevels" class="admin-panel admin-panel--wide">',
    '<h2>Server Hardest</h2>',
    '<p class="admin-hint">Like Tiers: + Add, X removes (saves now). Victor = who beat it (AREDL levels). Put a YouTube URL for thumbnail.</p>',
    '<div class="admin-actions" style="margin-bottom:0.75rem">',
    '<button type="button" class="auth-btn" @click="shAddRow">+ Add level</button>',
    '<button type="button" class="auth-btn" :disabled="saving" @click="saveServerHardest">Save all</button>',
    '<button type="button" class="auth-btn auth-btn--ghost" @click="openServerHardest">Reload</button>',
    '</div>',
    '<ul class="sh-list">',
    '<li class="sh-item" v-for="(lv, i) in serverLevels" :key="i">',
    '<span class="sh-item__rank">#{{ i + 1 }}</span>',
    '<input class="admin-input" v-model="lv.name" placeholder="Name" style="flex:1;min-width:8rem" />',
    '<input class="admin-input" v-model="lv.id" placeholder="ID" style="width:6rem" />',
    '<input class="admin-input" v-model="lv.author" placeholder="Author" style="width:7rem" />',
    '<input class="admin-input" v-model="lv.victor" placeholder="Victor" style="width:7rem" />',
    '<input class="admin-input" v-model="lv.length" placeholder="Len" style="width:4rem" />',
    '<input class="admin-input" v-model="lv.verification" placeholder="Video URL" style="flex:1;min-width:10rem" />',
    '<button type="button" class="auth-btn auth-btn--ghost" style="padding:0.25rem 0.4rem" @click="shMove(i,-1)" :disabled="i===0">↑</button>',
    '<button type="button" class="auth-btn auth-btn--ghost" style="padding:0.25rem 0.4rem" @click="shMove(i,1)" :disabled="i===serverLevels.length-1">↓</button>',
    '<button type="button" class="rec-del" @click="shRemove(i)">✕</button>',
    '</li></ul>',
    '<p v-if="!serverLevels.length" class="admin-hint">No levels yet. Click + Add level.</p>',
    '</div>',
  ].join('\n');

  if (code.indexOf(oldPanel) !== -1) code = code.split(oldPanel).join(newPanel);

  var boardPanel = [
    '<div v-if="tab===\'board\' && canLevels" class="admin-panel admin-panel--wide">',
    '<h2>Leaderboard</h2>',
    '<p class="admin-hint">Players come from level records + verifiers. Edit here to update the public board.</p>',
    '<div class="admin-row" style="margin-bottom:0.75rem">',
    '<input class="admin-input" v-model="boardSearch" placeholder="Search or new player name" style="min-width:12rem" />',
    '<button type="button" class="auth-btn auth-btn--ghost" @click="openBoard">Refresh</button>',
    '<button type="button" class="auth-btn" @click="boardCreatePlayer">+ Player</button>',
    '</div>',
    '<div class="board-layout" style="display:flex;gap:1rem;flex-wrap:wrap;align-items:flex-start">',
    '<div class="board-players" style="flex:1;min-width:12rem;max-height:28rem;overflow:auto">',
    '<button type="button" class="level-picker__item" v-for="(e, i) in board" :key="e.user" v-show="!(boardSearch||\'\').trim() || (e.user||\'\').toLowerCase().indexOf((boardSearch||\'\').trim().toLowerCase())!==-1" :class="{ active: boardPlayer === e.user }" @click="selectBoardPlayer(e)">',
    '<span class="level-picker__rank">#{{ i + 1 }}</span><span>{{ e.user }}</span><span class="admin-muted">{{ e.total }} pts</span>',
    '</button>',
    '<p v-if="!board.length" class="admin-hint">No players yet.</p>',
    '</div>',
    '<div class="board-detail" style="flex:2;min-width:16rem" v-if="boardPlayer">',
    '<h3>{{ boardPlayer }}</h3>',
    '<div class="admin-actions" style="margin-bottom:0.75rem">',
    '<button type="button" class="auth-btn auth-btn--ghost" style="color:#f66" @click="boardRemovePlayer">Remove player entirely</button>',
    '</div>',
    '<h3>Verified</h3>',
    '<ul class="admin-userlist">',
    '<li v-for="v in ((board.find(function(e){ return e.user===boardPlayer; })||{}).verified)||[]" :key="\'v\'+v.level">',
    '<strong>#{{ v.rank }} {{ v.level }}</strong>',
    '<button type="button" class="rec-del" style="margin-left:auto" @click="boardRemoveRecord(v.level, \'verified\')">✕</button>',
    '</li>',
    '</ul>',
    '<h3>Completions (100%)</h3>',
    '<ul class="admin-userlist">',
    '<li v-for="v in ((board.find(function(e){ return e.user===boardPlayer; })||{}).completed)||[]" :key="\'c\'+v.level">',
    '<strong>#{{ v.rank }} {{ v.level }}</strong>',
    '<button type="button" class="rec-del" style="margin-left:auto" @click="boardRemoveRecord(v.level, \'completed\')">✕</button>',
    '</li>',
    '</ul>',
    '<h3>Progress</h3>',
    '<ul class="admin-userlist">',
    '<li v-for="v in ((board.find(function(e){ return e.user===boardPlayer; })||{}).progressed)||[]" :key="\'p\'+v.level">',
    '<strong>#{{ v.rank }} {{ v.level }}</strong> <span class="admin-muted">{{ v.percent }}%</span>',
    '<button type="button" class="rec-del" style="margin-left:auto" @click="boardRemoveRecord(v.level, \'progress\')">✕</button>',
    '</li>',
    '</ul>',
    '<h3 style="margin-top:1rem">Add clear / verifier</h3>',
    '<div class="admin-row">',
    '<select class="admin-input" v-model="boardAdd.path">',
    '<option value="" disabled>Pick level…</option>',
    '<option v-for="p in listOrder" :key="p" :value="p">{{ p }}</option>',
    '</select>',
    '<input class="admin-input" type="number" v-model.number="boardAdd.percent" placeholder="%" style="width:5rem" />',
    '<input class="admin-input" type="number" v-model.number="boardAdd.hz" placeholder="Hz" style="width:5rem" />',
    '<input class="admin-input" v-model="boardAdd.link" placeholder="Video link" />',
    '</div>',
    '<div class="admin-actions">',
    '<button type="button" class="auth-btn" :disabled="saving" @click="boardAddRecord">Add clear</button>',
    '<button type="button" class="auth-btn auth-btn--ghost" :disabled="saving" @click="boardSetVerifier">Set as verifier</button>',
    '</div>',
    '</div>',
    '<p v-else class="admin-hint">Select a player or type a name and click + Player.</p>',
    '</div>',
    '</div>',
  ].join('\n');

  var serverNeedle = '<div v-if="tab===\'server\' && canLevels" class="admin-panel admin-panel--wide">';
  if (code.indexOf(serverNeedle) !== -1) {
    code = code.split(serverNeedle).join(boardPanel + '\n' + serverNeedle);
  } else {
    var serverNeedle2 = '<div v-if="tab===\'server\' && canLevels" class="admin-panel">';
    if (code.indexOf(serverNeedle2) !== -1) {
      code = code.split(serverNeedle2).join(boardPanel + '\n' + serverNeedle2);
    }
  }

  var mod = await import(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })));
  return mod.default;
});
