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

code = code.replace(
  'import Spinner from',
  "import { boardMethods, shMethods, TAG_GROUPS } from '" + pagesBase + "AdminExtras.js";\nimport Spinner from"
);

code = code.replace(
  "activityLogs: [], serverHardestText: '[]',",
  "activityLogs: [], serverHardestText: '[]',\n    board: [], boardPlayer: null, boardRows: [], verifiedRows: [], playerLookup: '', setVerifierPath: '',\n    addBeat: { path: '', percent: 100, hz: 240, link: '' },\n    serverLevels: [], shEditIndex: -2, shForm: { id: '', name: '', author: '', verifier: '', verification: '', length: '', note: '', tags: [], records: [] }, shNewRec: { user: '', attempts: '', date: '', link: '' }, TAG_GROUPS,"
);

code = code.replace(
  'Levels & records</button>',
  'Levels & records</button>\n<button type="button" class="admin-tab" :class="{ active: tab===\'board\' }" @click="openBoard" v-if="canLevels">Leaderboard</button>'
);

code = code.replace("tab==='server' && canLevels\" class=\"admin-panel\">\n<h2>Server Hardest</h2>\n<p class=\"admin-hint\">JSON array. Rank = order in the list. Each item: name, id, author, verifier, verification (video), length, note, records: [{ user, attempts, date, link }]</p>\n<textarea class=\"admin-ta\" v-model=\"serverHardestText\" rows=\"18\"></textarea>\n<div class=\"admin-actions\"><button type=\"button\" class=\"auth-btn\" :disabled=\"saving\" @click=\"saveServerHardest\">Save Server Hardest</button></div>\n</div>\n\n<div v-if=\"tab==='info", "tab==='server' && canLevels\" class=\"admin-panel admin-panel--wide\">\n<h2>Server Hardest</h2>\n<p class=\"admin-hint\">Rank = list order. Use Up/Down to reorder. Edit a row, Apply, then Save all.</p>\n<div class=\"admin-actions\" style=\"margin-bottom:0.75rem\">\n<button type=\"button\" class=\"auth-btn\" @click=\"startNewSh\">+ Add level</button>\n<button type=\"button\" class=\"auth-btn\" :disabled=\"saving\" @click=\"saveServerHardest\">Save all</button>\n<button type=\"button\" class=\"auth-btn auth-btn--ghost\" @click=\"openServerHardest\">Reload</button>\n</div>\n<div v-if=\"shEditIndex !== -2\" class=\"sh-form\" style=\"background:rgba(128,128,128,0.08);border:1px solid rgba(128,128,128,0.25);border-radius:12px;padding:0.9rem;margin-bottom:1rem\">\n<h3>{{ shEditIndex >= 0 ? ('Edit #' + (shEditIndex + 1)) : 'New level' }}</h3>\n<div class=\"admin-row\">\n<input class=\"admin-input\" v-model=\"shForm.name\" placeholder=\"Level name *\" style=\"flex:2\" />\n<input class=\"admin-input\" v-model=\"shForm.id\" placeholder=\"Level ID\" style=\"width:8rem\" />\n<input class=\"admin-input\" v-model=\"shForm.length\" placeholder=\"Length\" style=\"width:7rem\" />\n</div>\n<div class=\"admin-row\">\n<input class=\"admin-input\" v-model=\"shForm.author\" placeholder=\"Author\" />\n<input class=\"admin-input\" v-model=\"shForm.verifier\" placeholder=\"Verifier\" />\n<input class=\"admin-input\" v-model=\"shForm.verification\" placeholder=\"Video URL\" style=\"flex:2\" />\n</div>\n<input class=\"admin-input\" v-model=\"shForm.note\" placeholder=\"Note (optional)\" style=\"width:100%;margin:0.4rem 0\" />\n<div class=\"admin-tags\">\n<div v-for=\"g in TAG_GROUPS\" :key=\"g.name\" style=\"margin-bottom:0.45rem\">\n<div class=\"admin-tags__group-title\">{{ g.name }}</div>\n<div class=\"admin-tags__row\">\n<button type=\"button\" class=\"admin-tag\" v-for=\"t in g.tags\" :key=\"t\" :class=\"{ on: (shForm.tags || []).includes(t) }\" @click=\"toggleTag(shForm.tags, t)\">{{ t }}</button>\n</div>\n</div>\n</div>\n<h3 style=\"margin-top:0.75rem\">Clears</h3>\n<div class=\"rec-table\" v-if=\"shForm.records && shForm.records.length\">\n<div class=\"rec-table__row\" v-for=\"(r, ri) in shForm.records\" :key=\"ri\">\n<input class=\"admin-input\" v-model=\"r.user\" placeholder=\"Player\" />\n<input class=\"admin-input\" v-model=\"r.attempts\" placeholder=\"Attempts\" style=\"width:6rem\" />\n<input class=\"admin-input\" v-model=\"r.date\" placeholder=\"Date\" style=\"width:8rem\" />\n<input class=\"admin-input\" v-model=\"r.link\" placeholder=\"Video\" />\n<button type=\"button\" class=\"rec-del\" @click=\"shForm.records.splice(ri,1)\">X</button>\n</div>\n</div>\n<div class=\"admin-row\" style=\"margin-top:0.4rem\">\n<input class=\"admin-input\" v-model=\"shNewRec.user\" placeholder=\"Player\" />\n<input class=\"admin-input\" v-model=\"shNewRec.attempts\" placeholder=\"Attempts\" style=\"width:6rem\" />\n<input class=\"admin-input\" v-model=\"shNewRec.date\" placeholder=\"YYYY-MM-DD\" style=\"width:8rem\" />\n<input class=\"admin-input\" v-model=\"shNewRec.link\" placeholder=\"Video link\" />\n<button type=\"button\" class=\"auth-btn auth-btn--ghost\" @click=\"addShRec\">+ Record</button>\n</div>\n<div class=\"admin-actions\" style=\"margin-top:0.75rem\">\n<button type=\"button\" class=\"auth-btn\" @click=\"applyShForm\">Apply to list</button>\n<button type=\"button\" class=\"auth-btn auth-btn--ghost\" @click=\"cancelShEdit\">Cancel</button>\n</div>\n</div>\n<ul class=\"sh-list\" v-if=\"serverLevels.length\">\n<li class=\"sh-item\" v-for=\"(lv, i) in serverLevels\" :key=\"i\">\n<span class=\"sh-item__rank\">#{{ i + 1 }}</span>\n<strong>{{ lv.name || '(unnamed)' }}</strong>\n<span class=\"admin-muted\" v-if=\"lv.id\">ID {{ lv.id }}</span>\n<span class=\"admin-muted\">{{ (lv.records || []).length }} clears</span>\n<span class=\"admin-muted\" v-if=\"lv.tags && lv.tags.length\">{{ lv.tags.slice(0,4).join(', ') }}</span>\n<div class=\"sh-item__actions\">\n<button type=\"button\" class=\"auth-btn auth-btn--ghost\" style=\"padding:0.25rem 0.5rem\" @click=\"moveSh(i,-1)\" :disabled=\"i===0\">Up</button>\n<button type=\"button\" class=\"auth-btn auth-btn--ghost\" style=\"padding:0.25rem 0.5rem\" @click=\"moveSh(i,1)\" :disabled=\"i===serverLevels.length-1\">Down</button>\n<button type=\"button\" class=\"auth-btn auth-btn--ghost\" style=\"padding:0.25rem 0.5rem\" @click=\"editSh(i)\">Edit</button>\n<button type=\"button\" class=\"rec-del\" @click=\"removeSh(i)\">X</button>\n</div>\n</li>\n</ul>\n<p v-else class=\"admin-hint\">No levels yet. Click + Add level.</p>\n</div>\n\n<div v-if=\"tab==='info");

code = code.replace(
  '<div v-if="tab===\'server\' && canLevels" class="admin-panel admin-panel--wide">',
  `<div v-if="tab==='board' && canLevels" class="admin-panel admin-panel--wide">
<h2>Leaderboard</h2>
<div class="admin-row" style="margin-bottom:0.75rem">
<input class="admin-input" v-model="playerLookup" placeholder="Player name" style="min-width:12rem" />
<button type="button" class="auth-btn" @click="openPlayerByName">Open / create</button>
<button type="button" class="auth-btn auth-btn--ghost" @click="openBoard">Refresh</button>
</div>
<div class="board-layout">
<div class="board-players">
<button type="button" class="level-picker__item" v-for="(e, i) in board" :key="e.user" :class="{ active: boardPlayer === e.user }" @click="selectBoardPlayer(e)">
<span class="level-picker__rank">#{{ i + 1 }}</span><span>{{ e.user }}</span><span class="admin-muted">{{ e.total }} pts</span>
</button>
</div>
<div class="board-detail" v-if="boardPlayer">
<h3>{{ boardPlayer }}</h3>
<h3>Verified</h3>
<ul class="admin-userlist" v-if="verifiedRows.length">
<li v-for="v in verifiedRows" :key="'v-'+v.path"><strong>#{{ v.rank }} {{ v.levelName }}</strong>
<button type="button" class="auth-btn auth-btn--ghost" style="margin-left:auto;padding:0.3rem 0.5rem;font-size:0.75rem" @click="clearVerifier(v.path)">Remove</button></li>
</ul>
<p v-else class="admin-hint">None yet.</p>
<div class="admin-row" style="margin:0.75rem 0">
<select class="admin-input" v-model="setVerifierPath"><option value="" disabled>Pick level…</option>
<option v-for="p in listOrder" :key="'sv-'+p" :value="p">{{ p }}</option></select>
<button type="button" class="auth-btn" :disabled="saving" @click="setAsVerifier">Set verifier</button>
</div>
<h3>Victors</h3>
<div class="rec-table">
<div class="rec-table__row" v-for="(row, ri) in boardRows" :key="row.path+ri">
<span class="board-lvl">#{{ row.rank }} {{ row.levelName }}</span>
<input class="admin-input" type="number" v-model.number="row.percent" />
<input class="admin-input" type="number" v-model.number="row.hz" />
<input class="admin-input" v-model="row.link" />
<button type="button" class="rec-del" @click="boardRows.splice(ri,1)">X</button>
</div>
</div>
<div class="admin-actions"><button type="button" class="auth-btn" :disabled="saving" @click="saveBoardPlayer">Save records</button></div>
<div class="admin-row">
<select class="admin-input" v-model="addBeat.path"><option value="" disabled>Level…</option>
<option v-for="p in listOrder" :key="p" :value="p">{{ p }}</option></select>
<input class="admin-input" type="number" v-model.number="addBeat.percent" placeholder="%" style="width:5rem" />
<input class="admin-input" type="number" v-model.number="addBeat.hz" placeholder="Hz" style="width:5rem" />
<input class="admin-input" v-model="addBeat.link" placeholder="Video" />
<button type="button" class="auth-btn auth-btn--ghost" @click="addBeatToPlayer">Add</button>
</div>
</div>
<p v-else class="admin-hint">Type a player name and Open.</p>
</div>
</div>
<div v-if="tab==='server' && canLevels" class="admin-panel admin-panel--wide">`
);

code = code.replace(
  'async openServerHardest()',
  `async openBoard() { return boardMethods.openBoard.call(this); },
    selectBoardPlayer(e) { return boardMethods.selectBoardPlayer.call(this, e); },
    openPlayerByName() { return boardMethods.openPlayerByName.call(this); },
    async setAsVerifier() { return boardMethods.setAsVerifier.call(this); },
    async clearVerifier(p) { return boardMethods.clearVerifier.call(this, p); },
    addBeatToPlayer() { return boardMethods.addBeatToPlayer.call(this); },
    async saveBoardPlayer() { return boardMethods.saveBoardPlayer.call(this); },
    startNewSh() { return shMethods.startNewSh.call(this); },
    editSh(i) { return shMethods.editSh.call(this, i); },
    cancelShEdit() { return shMethods.cancelShEdit.call(this); },
    applyShForm() { return shMethods.applyShForm.call(this); },
    moveSh(i, d) { return shMethods.moveSh.call(this, i, d); },
    removeSh(i) { return shMethods.removeSh.call(this, i); },
    addShRec() { return shMethods.addShRec.call(this); },
    toggleTag(a, t) { return shMethods.toggleTag.call(this, a, t); },
    async openServerHardest()`
);

code = code.replace(
  /async openServerHardest\(\) \{[\s\S]*?\n    \},\n    async saveServerHardest\(\) \{[\s\S]*?\n    \},/,
  `async openServerHardest() { return shMethods.openServerHardest.call(this); },
    async saveServerHardest() { return shMethods.saveServerHardest.call(this); },`
);

const mod = await import(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })));
return mod.default;
});
