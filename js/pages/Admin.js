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

  if (code.indexOf('TAG_GROUPS') === -1) {
    var _imp = code.match(/import \{[^}]+\} from ['"][^'"]+content\.js['"];/);
    if (_imp) code = code.replace(_imp[0], _imp[0] + "\nimport { TAG_GROUPS } from '" + jsBase + "tags.js";");
    else code = "import { TAG_GROUPS } from '" + jsBase + "tags.js;\n" + code;
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

  code = code.replace(
    '<label class="admin-grid--full">Video * <input class="admin-input" v-model="newLevel.verification" /></label>\n<label>Length <input class="admin-input" v-model="newLevel.length" /></label>',
    '<label class="admin-grid--full">Video * <input class="admin-input" v-model="newLevel.verification" /></label>\n<label class="admin-grid--full">Thumbnail (optional URL) <input class="admin-input" v-model="newLevel.thumbnail" placeholder="Image URL — leave empty for YouTube thumb" /></label>\n<label>Length <input class="admin-input" v-model="newLevel.length" /></label>'
  );

  code = code.replace(
    '<label class="admin-grid--full">Video <input class="admin-input" v-model="draft.verification" /></label>\n<label>Length <input class="admin-input" v-model="draft.length" /></label>',
    '<label class="admin-grid--full">Video <input class="admin-input" v-model="draft.verification" /></label>\n<label class="admin-grid--full">Thumbnail (optional URL) <input class="admin-input" v-model="draft.thumbnail" placeholder="Image URL — leave empty for YouTube thumb" /></label>\n<label>Length <input class="admin-input" v-model="draft.length" /></label>'
  );

  code = code.replace(
    "newLevel: { name: '', id: '', author: '', verifier: '', verification: '', length: '', percentToQualify: 100 },",
    "TAG_GROUPS: TAG_GROUPS, newLevel: { name: '', id: '', author: '', verifier: '', verification: '', thumbnail: '', length: '', percentToQualify: 100, tags: [] },"
  );

  code = code.replace(
    "verifier: n.verifier.trim(), verification: n.verification.trim(),\n        percentToQualify: Number(n.percentToQualify) || 100,\n        password: 'Free to Copy', length: n.length || '',",
    "verifier: n.verifier.trim(), verification: n.verification.trim(),\n        thumbnail: (n.thumbnail || '').trim(),\n        percentToQualify: Number(n.percentToQualify) || 100,\n        password: 'Free to Copy', length: n.length || '',"
  );

  code = code.replace(
    "creationDate: new Date().toLocaleDateString('en-US'), tags: [], records: [],",
    "creationDate: new Date().toLocaleDateString('en-US'), tags: Array.isArray(n.tags) ? n.tags.slice() : [], records: [],"
  );

  code = code.replace(
    "this.newLevel = { name: '', id: '', author: '', verifier: '', verification: '', length: '', percentToQualify: 100 };",
    "this.newLevel = { name: '', id: '', author: '', verifier: '', verification: '', thumbnail: '', length: '', percentToQualify: 100, tags: [] };"
  );
  code = code.replace(
    "this.newLevel = { name: '', id: '', author: '', verifier: '', verification: '', thumbnail: '', length: '', percentToQualify: 100 };",
    "this.newLevel = { name: '', id: '', author: '', verifier: '', verification: '', thumbnail: '', length: '', percentToQualify: 100, tags: [] };"
  );

  code = code.replace(
    'this.draft = JSON.parse(JSON.stringify(found[0]));',
    "this.draft = JSON.parse(JSON.stringify(found[0]));\n      if (!Array.isArray(this.draft.tags)) this.draft.tags = [];"
  );

  if (code.indexOf('toggleDraftTag(') === -1) {
    code = code.replace(
      'addRecord() {',
      [
        'toggleDraftTag(tag) {',
        '      if (!this.draft) return;',
        '      if (!Array.isArray(this.draft.tags)) this.draft.tags = [];',
        '      var i = this.draft.tags.indexOf(tag);',
        '      if (i === -1) this.draft.tags.push(tag);',
        '      else this.draft.tags.splice(i, 1);',
        '    },',
        '    toggleNewLevelTag(tag) {',
        '      if (!Array.isArray(this.newLevel.tags)) this.newLevel.tags = [];',
        '      var i = this.newLevel.tags.indexOf(tag);',
        '      if (i === -1) this.newLevel.tags.push(tag);',
        '      else this.newLevel.tags.splice(i, 1);',
        '    },',
        '    addRecord() {',
      ].join('\n')
    );
  }

  var tagsNewHtml = [
    '</div>',
    '<div class="admin-tags">',
    '<div class="admin-tags__head"><strong>Tags / Filters</strong> <span class="admin-muted">click to toggle (Wave, Memory, …)</span></div>',
    '<div class="admin-tag-group" v-for="g in TAG_GROUPS" :key="g.name">',
    '<div class="admin-tag-group__title">{{ g.name }}</div>',
    '<div class="admin-tag-group__row">',
    '<button type="button" class="admin-tag-chip" v-for="t in g.tags" :key="t" :class="{ on: (newLevel.tags || []).includes(t) }" @click="toggleNewLevelTag(t)">{{ t }}</button>',
    '</div></div></div>',
    '<div class="admin-actions"><button type="button" class="auth-btn" :disabled="saving" @click="createLevel">Create</button></div>',
  ].join('\n');

  code = code.replace(
    '<label>Length <input class="admin-input" v-model="newLevel.length" /></label>\n</div>\n<div class="admin-actions"><button type="button" class="auth-btn" :disabled="saving" @click="createLevel">Create</button></div>',
    '<label>Length <input class="admin-input" v-model="newLevel.length" /></label>\n' + tagsNewHtml
  );

  var tagsDraftHtml = [
    '<div class="admin-tags">',
    '<div class="admin-tags__head"><strong>Tags / Filters</strong> <span class="admin-muted">{{ (draft.tags || []).length }} selected — used by list Filters</span></div>',
    '<div class="admin-tag-group" v-for="g in TAG_GROUPS" :key="g.name">',
    '<div class="admin-tag-group__title">{{ g.name }}</div>',
    '<div class="admin-tag-group__row">',
    '<button type="button" class="admin-tag-chip" v-for="t in g.tags" :key="t" :class="{ on: (draft.tags || []).includes(t) }" @click="toggleDraftTag(t)">{{ t }}</button>',
    '</div></div></div>',
    '<h3>Victors</h3>',
  ].join('\n');

  code = code.replace('<h3>Victors</h3>', tagsDraftHtml);

  var shMethods = [
    "async openServerHardest() {",
    "      this.tab = 'server';",
    "      try {",
    "        var res = await fetch('./data/_server_hardest.json?t=' + Date.now(), { cache: 'no-store' });",
    "        if (res.ok) {",
    "          var data = await res.json();",
    "          this.serverLevels = Array.isArray(data) ? data.map(function(l) {",
    "            var o = Object.assign({}, l);",
    "            o.records = Array.isArray(o.records) ? o.records.map(function(r) { return Object.assign({ user: '', link: '', attempts: null, date: '' }, r || {}); }) : [];",
    "            o.victor = o.victor || '';",
    "            o.verifier = o.verifier || '';",
    "            o.verifierVideo = o.verifierVideo || '';",
    "            o.verification = o.verification || '';",
    "            if (!o.records.length && o.victor) o.records.push({ user: o.victor, link: o.verification || '', attempts: null, date: '' });",
    "            return o;",
    "          }) : [];",
    "        } else this.serverLevels = [];",
    "      } catch (e) { this.serverLevels = []; }",
    "    },",
    "    shAddRow() {",
    "      this.serverLevels.push({ id: '', name: '', author: '', victor: '', verifier: '', verifierVideo: '', verification: '', thumbnail: '', length: '', note: '', tags: [], records: [{ user: '', link: '', attempts: null, date: '' }] });",
    "    },",
    "    shAddVictor(i) {",
    "      if (!this.serverLevels[i].records) this.serverLevels[i].records = [];",
    "      this.serverLevels[i].records.push({ user: '', link: '', attempts: null, date: '' });",
    "    },",
    "    shRemoveVictor(i, ri) {",
    "      this.serverLevels[i].records.splice(ri, 1);",
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
    "        o.records = (o.records || []).filter(function(r) { return r && String(r.user || '').trim(); }).map(function(r) {",
    "          return { user: String(r.user).trim(), link: r.link || '', attempts: r.attempts != null && r.attempts !== '' ? r.attempts : null, date: r.date || '' };",
    "        });",
    "        if (!o.victor && o.records.length) o.victor = o.records[0].user;",
    "        if (!o.verification && o.records.length) {",
    "          var withLink = o.records.find(function(r) { return r.link; });",
    "          if (withLink) o.verification = withLink.link;",
    "        }",
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
      "      try { var pair = await fetchLeaderboard(); this.board = (pair && pair[0]) || []; } catch (e) { this.board = []; }",
      "    },",
      "    selectBoardPlayer(e) { if (!e) return; this.boardPlayer = e.user; this.boardAdd = { path: '', percent: 100, hz: 240, link: '' }; },",
      "    findLevelByName(name) { return this.list.find(function (pair) { return pair[0] && pair[0].name === name; }); },",
      "    findLevelByPath(path) { return this.list.find(function (pair) { return pair[0] && pair[0].path === path; }); },",
      "    async boardSaveLevel(path, levelObj, msg) {",
      "      var payload = Object.assign({}, levelObj); delete payload.path;",
      "      var ok = await this.pushFile('data/' + path + '.json', JSON.stringify(payload, null, 4), msg || ('Admin: board ' + path));",
      "      if (ok) { var pair = this.findLevelByPath(path); if (pair) pair[0] = Object.assign({}, payload, { path: path }); }",
      "      return ok;",
      "    },",
      "    async boardRemoveRecord(levelName, kind) {",
      "      if (!this.boardPlayer) return;",
      "      var pair = this.findLevelByName(levelName);",
      "      if (!pair || !pair[0]) { this.flash('Level not found: ' + levelName, true); return; }",
      "      var path = pair[0].path; var lv = JSON.parse(JSON.stringify(pair[0])); var user = this.boardPlayer;",
      "      if (kind === 'verified') { if ((lv.verifier || '').toLowerCase() === user.toLowerCase()) lv.verifier = ''; }",
      "      else { lv.records = (lv.records || []).filter(function (r) { return !r || !r.user || r.user.toLowerCase() !== user.toLowerCase(); }); }",
      "      if (!confirm('Remove ' + user + ' from ' + levelName + '?')) return;",
      "      var ok = await this.boardSaveLevel(path, lv, 'Admin: remove ' + user + ' from ' + path);",
      "      if (ok) await this.openBoard();",
      "    },",
      "    async boardAddRecord() {",
      "      if (!this.boardPlayer || !this.boardAdd.path) { this.flash('Pick a level first.', true); return; }",
      "      var path = this.boardAdd.path; var pair = this.findLevelByPath(path);",
      "      if (!pair || !pair[0]) { this.flash('Level not found.', true); return; }",
      "      var lv = JSON.parse(JSON.stringify(pair[0])); var user = this.boardPlayer;",
      "      lv.records = (lv.records || []).filter(function (r) { return !r || !r.user || r.user.toLowerCase() !== user.toLowerCase(); });",
      "      lv.records.push({ user: user, percent: Number(this.boardAdd.percent) || 100, hz: Number(this.boardAdd.hz) || 240, link: this.boardAdd.link || '' });",
      "      var ok = await this.boardSaveLevel(path, lv, 'Admin: add ' + user + ' on ' + path);",
      "      if (ok) { this.boardAdd = { path: '', percent: 100, hz: 240, link: '' }; await this.openBoard(); }",
      "    },",
      "    async boardSetVerifier() {",
      "      if (!this.boardPlayer || !this.boardAdd.path) { this.flash('Pick a level first.', true); return; }",
      "      var path = this.boardAdd.path; var pair = this.findLevelByPath(path); if (!pair || !pair[0]) return;",
      "      var lv = JSON.parse(JSON.stringify(pair[0])); lv.verifier = this.boardPlayer;",
      "      var ok = await this.boardSaveLevel(path, lv, 'Admin: set verifier ' + this.boardPlayer + ' on ' + path);",
      "      if (ok) await this.openBoard();",
      "    },",
      "    async boardRemovePlayer() {",
      "      if (!this.boardPlayer) return;",
      "      var user = this.boardPlayer;",
      "      if (!confirm('Remove ALL records for ' + user + '?')) return;",
      "      var changed = 0;",
      "      for (var i = 0; i < this.list.length; i++) {",
      "        var pair = this.list[i]; if (!pair || !pair[0]) continue;",
      "        var lv = JSON.parse(JSON.stringify(pair[0])); var path = lv.path; var dirty = false;",
      "        if ((lv.verifier || '').toLowerCase() === user.toLowerCase()) { lv.verifier = ''; dirty = true; }",
      "        var before = (lv.records || []).length;",
      "        lv.records = (lv.records || []).filter(function (r) { return !r || !r.user || r.user.toLowerCase() !== user.toLowerCase(); });",
      "        if (lv.records.length !== before) dirty = true;",
      "        if (dirty) { var ok = await this.boardSaveLevel(path, lv, 'Admin: strip ' + user + ' from ' + path); if (ok) changed++; }",
      "      }",
      "      this.flash('Updated ' + changed + ' level(s).'); this.boardPlayer = null; await this.openBoard();",
      "    },",
      "    async boardCreatePlayer() {",
      "      var name = (this.boardSearch || '').trim();",
      "      if (!name) { this.flash('Type a player name first.', true); return; }",
      "      var exists = this.board.find(function (e) { return e.user.toLowerCase() === name.toLowerCase(); });",
      "      if (exists) { this.selectBoardPlayer(exists); return; }",
      "      this.board.unshift({ user: name, total: 0, verified: [], completed: [], progressed: [] });",
      "      this.selectBoardPlayer(this.board[0]);",
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
    '<p class="admin-hint">Each victor = name + their own video. Verifier name + optional verifier video. Main video = card embed.</p>',
    '<div class="admin-actions" style="margin-bottom:0.75rem">',
    '<button type="button" class="auth-btn" @click="shAddRow">+ Add level</button>',
    '<button type="button" class="auth-btn" :disabled="saving" @click="saveServerHardest">Save all</button>',
    '<button type="button" class="auth-btn auth-btn--ghost" @click="openServerHardest">Reload</button>',
    '</div>',
    '<ul class="sh-list">',
    '<li class="sh-item sh-item--block" v-for="(lv, i) in serverLevels" :key="i">',
    '<div class="sh-item__top">',
    '<span class="sh-item__rank">#{{ i + 1 }}</span>',
    '<input class="admin-input" v-model="lv.name" placeholder="Level name" style="flex:1;min-width:8rem" />',
    '<input class="admin-input" v-model="lv.id" placeholder="ID" style="width:6rem" />',
    '<input class="admin-input" v-model="lv.author" placeholder="Creator" style="width:7rem" />',
    '<input class="admin-input" v-model="lv.length" placeholder="Len" style="width:4rem" />',
    '<button type="button" class="auth-btn auth-btn--ghost" style="padding:0.25rem 0.4rem" @click="shMove(i,-1)" :disabled="i===0">↑</button>',
    '<button type="button" class="auth-btn auth-btn--ghost" style="padding:0.25rem 0.4rem" @click="shMove(i,1)" :disabled="i===serverLevels.length-1">↓</button>',
    '<button type="button" class="rec-del" @click="shRemove(i)">✕</button>',
    '</div>',
    '<div class="sh-item__row">',
    '<input class="admin-input" v-model="lv.verification" placeholder="Main video URL (shown on card)" style="flex:1;min-width:12rem" />',
    '<input class="admin-input" v-model="lv.thumbnail" placeholder="Thumbnail optional" style="flex:1;min-width:8rem" />',
    '</div>',
    '<div class="sh-item__row">',
    '<input class="admin-input" v-model="lv.verifier" placeholder="Verifier name" style="width:9rem" />',
    '<input class="admin-input" v-model="lv.verifierVideo" placeholder="Verifier video URL" style="flex:1;min-width:12rem" />',
    '</div>',
    '<div class="sh-victors">',
    '<div class="sh-victors__head"><strong>Victors</strong> <button type="button" class="auth-btn auth-btn--ghost" style="padding:0.15rem 0.5rem" @click="shAddVictor(i)">+ Victor</button></div>',
    '<div class="sh-victor-row" v-for="(r, ri) in (lv.records || [])" :key="ri">',
    '<input class="admin-input" v-model="r.user" placeholder="Victor name" style="width:9rem" />',
    '<input class="admin-input" v-model="r.link" placeholder="Victor video URL" style="flex:1;min-width:12rem" />',
    '<button type="button" class="rec-del" @click="shRemoveVictor(i, ri)">✕</button>',
    '</div>',
    '<p v-if="!(lv.records && lv.records.length)" class="admin-hint">No victors — click + Victor.</p>',
    '</div>',
    '</li></ul>',
    '<p v-if="!serverLevels.length" class="admin-hint">No levels yet. Click + Add level.</p>',
    '</div>',
  ].join('\n');

  if (code.indexOf(oldPanel) !== -1) code = code.split(oldPanel).join(newPanel);

  var boardPanel = [
    '<div v-if="tab===\'board\' && canLevels" class="admin-panel admin-panel--wide">',
    '<h2>Leaderboard</h2>',
    '<div class="admin-row" style="margin-bottom:0.75rem">',
    '<input class="admin-input" v-model="boardSearch" placeholder="Search player" style="min-width:12rem" />',
    '<button type="button" class="auth-btn auth-btn--ghost" @click="openBoard">Refresh</button>',
    '<button type="button" class="auth-btn" @click="boardCreatePlayer">+ Player</button>',
    '</div>',
    '<div class="board-layout" style="display:flex;gap:1rem;flex-wrap:wrap">',
    '<div style="flex:1;min-width:12rem;max-height:28rem;overflow:auto">',
    '<button type="button" class="level-picker__item" v-for="(e, i) in board" :key="e.user" v-show="!(boardSearch||\'\').trim() || (e.user||\'\').toLowerCase().indexOf((boardSearch||\'\').trim().toLowerCase())!==-1" :class="{ active: boardPlayer === e.user }" @click="selectBoardPlayer(e)">',
    '<span class="level-picker__rank">#{{ i + 1 }}</span><span>{{ e.user }}</span><span class="admin-muted">{{ e.total }} pts</span>',
    '</button></div>',
    '<div style="flex:2;min-width:16rem" v-if="boardPlayer">',
    '<h3>{{ boardPlayer }}</h3>',
    '<button type="button" class="auth-btn auth-btn--ghost" style="color:#f66" @click="boardRemovePlayer">Remove player</button>',
    '<h3>Add clear</h3>',
    '<div class="admin-row">',
    '<select class="admin-input" v-model="boardAdd.path"><option value="" disabled>Level…</option><option v-for="p in listOrder" :key="p" :value="p">{{ p }}</option></select>',
    '<input class="admin-input" type="number" v-model.number="boardAdd.percent" placeholder="%" style="width:5rem" />',
    '<input class="admin-input" v-model="boardAdd.link" placeholder="Video" />',
    '</div>',
    '<div class="admin-actions"><button type="button" class="auth-btn" :disabled="saving" @click="boardAddRecord">Add clear</button>',
    '<button type="button" class="auth-btn auth-btn--ghost" :disabled="saving" @click="boardSetVerifier">Set verifier</button></div>',
    '</div></div></div>',
  ].join('\n');

  var serverNeedle = '<div v-if="tab===\'server\' && canLevels" class="admin-panel admin-panel--wide">';
  if (code.indexOf(serverNeedle) !== -1) code = code.split(serverNeedle).join(boardPanel + '\n' + serverNeedle);
  else {
    var serverNeedle2 = '<div v-if="tab===\'server\' && canLevels" class="admin-panel">';
    if (code.indexOf(serverNeedle2) !== -1) code = code.split(serverNeedle2).join(boardPanel + '\n' + serverNeedle2);
  }

  const mod = await import(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })));
  return mod.default;
});
