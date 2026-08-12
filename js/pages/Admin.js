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

  // Pull in form helpers
  code = code.replace(
    'import Spinner from',
    "import { boardMethods, shMethods, TAG_GROUPS, emptyShLevel } from '" + pagesBase + "AdminExtras.js';\nimport Spinner from"
  );

  // Extra data fields for form + leaderboard
  code = code.replace(
    "activityLogs: [], serverHardestText: '[]',",
    [
      "activityLogs: [], serverHardestText: '[]',",
      "board: [], boardPlayer: null, boardRows: [], verifiedRows: [], playerLookup: '', setVerifierPath: '',",
      "addBeat: { path: '', percent: 100, hz: 240, link: '' },",
      "serverLevels: [], shEditIndex: -2,",
      "shForm: { id: '', name: '', author: '', verifier: '', verification: '', length: '', note: '', tags: [], records: [] },",
      "shNewRec: { user: '', attempts: '', date: '', link: '' },",
      "TAG_GROUPS,",
    ].join('\n    ')
  );

  // Override open/save Server Hardest to use form data model
  code = code.replace(
    /async openServerHardest\(\) \{[\s\S]*?\n    \},\n    async saveServerHardest\(\) \{[\s\S]*?\n    \},/,
    [
      'async openServerHardest() { return shMethods.openServerHardest.call(this); },',
      'async saveServerHardest() { return shMethods.saveServerHardest.call(this); },',
      'startNewSh() { return shMethods.startNewSh.call(this); },',
      'editSh(i) { return shMethods.editSh.call(this, i); },',
      'cancelShEdit() { return shMethods.cancelShEdit.call(this); },',
      'applyShForm() { return shMethods.applyShForm.call(this); },',
      'moveSh(i, d) { return shMethods.moveSh.call(this, i, d); },',
      'removeSh(i) { return shMethods.removeSh.call(this, i); },',
      'addShRec() { return shMethods.addShRec.call(this); },',
      'toggleTag(a, t) { return shMethods.toggleTag.call(this, a, t); },',
      'async openBoard() { return boardMethods.openBoard.call(this); },',
      'selectBoardPlayer(e) { return boardMethods.selectBoardPlayer.call(this, e); },',
      'openPlayerByName() { return boardMethods.openPlayerByName.call(this); },',
      'async setAsVerifier() { return boardMethods.setAsVerifier.call(this); },',
      'async clearVerifier(p) { return boardMethods.clearVerifier.call(this, p); },',
      'addBeatToPlayer() { return boardMethods.addBeatToPlayer.call(this); },',
      'async saveBoardPlayer() { return boardMethods.saveBoardPlayer.call(this); },',
    ].join('\n    ')
  );

  // Replace JSON textarea panel with simple form UI
  const oldPanel = [
    'tab===\'server\' && canLevels" class="admin-panel">',
    '<h2>Server Hardest</h2>',
    '<p class="admin-hint">JSON array. Rank = order in the list. Each item: name, id, author, verifier, verification (video), length, note, records: [{ user, attempts, date, link }]</p>',
    '<textarea class="admin-ta" v-model="serverHardestText" rows="18"></textarea>',
    '<div class="admin-actions"><button type="button" class="auth-btn" :disabled="saving" @click="saveServerHardest">Save Server Hardest</button></div>',
    '</div>',
  ].join('\n');

  const newPanel = [
    'tab===\'server\' && canLevels" class="admin-panel admin-panel--wide">',
    '<h2>Server Hardest</h2>',
    '<p class="admin-hint">Rank = order in the list. Edit a level, Apply, then Save all.</p>',
    '<div class="admin-actions" style="margin-bottom:0.75rem">',
    '<button type="button" class="auth-btn" @click="startNewSh">+ Add level</button>',
    '<button type="button" class="auth-btn" :disabled="saving" @click="saveServerHardest">Save all</button>',
    '<button type="button" class="auth-btn auth-btn--ghost" @click="openServerHardest">Reload</button>',
    '</div>',
    '<div v-if="shEditIndex !== -2" class="sh-form" style="background:rgba(128,128,128,0.1);border:1px solid rgba(128,128,128,0.25);border-radius:12px;padding:0.9rem;margin-bottom:1rem">',
    '<h3>{{ shEditIndex >= 0 ? ("Edit #" + (shEditIndex + 1)) : "New level" }}</h3>',
    '<div class="admin-row">',
    '<input class="admin-input" v-model="shForm.name" placeholder="Level name *" style="flex:2" />',
    '<input class="admin-input" v-model="shForm.id" placeholder="Level ID" style="width:8rem" />',
    '<input class="admin-input" v-model="shForm.length" placeholder="Length" style="width:7rem" />',
    '</div>',
    '<div class="admin-row">',
    '<input class="admin-input" v-model="shForm.author" placeholder="Author" />',
    '<input class="admin-input" v-model="shForm.verifier" placeholder="Verifier" />',
    '<input class="admin-input" v-model="shForm.verification" placeholder="Video URL" style="flex:2" />',
    '</div>',
    '<input class="admin-input" v-model="shForm.note" placeholder="Note (optional)" style="width:100%;margin:0.4rem 0" />',
    '<div class="admin-tags">',
    '<div v-for="g in TAG_GROUPS" :key="g.name" style="margin-bottom:0.4rem">',
    '<div class="admin-tags__group-title">{{ g.name }}</div>',
    '<div class="admin-tags__row">',
    '<button type="button" class="admin-tag" v-for="t in g.tags" :key="t" :class="{ on: (shForm.tags || []).includes(t) }" @click="toggleTag(shForm.tags, t)">{{ t }}</button>',
    '</div></div></div>',
    '<h3 style="margin-top:0.7rem">Clears</h3>',
    '<div class="rec-table" v-if="shForm.records && shForm.records.length">',
    '<div class="rec-table__row" v-for="(r, ri) in shForm.records" :key="ri">',
    '<input class="admin-input" v-model="r.user" placeholder="Player" />',
    '<input class="admin-input" v-model="r.attempts" placeholder="Attempts" style="width:6rem" />',
    '<input class="admin-input" v-model="r.date" placeholder="Date" style="width:8rem" />',
    '<input class="admin-input" v-model="r.link" placeholder="Video" />',
    '<button type="button" class="rec-del" @click="shForm.records.splice(ri,1)">X</button>',
    '</div></div>',
    '<div class="admin-row" style="margin-top:0.4rem">',
    '<input class="admin-input" v-model="shNewRec.user" placeholder="Player" />',
    '<input class="admin-input" v-model="shNewRec.attempts" placeholder="Attempts" style="width:6rem" />',
    '<input class="admin-input" v-model="shNewRec.date" placeholder="YYYY-MM-DD" style="width:8rem" />',
    '<input class="admin-input" v-model="shNewRec.link" placeholder="Video" />',
    '<button type="button" class="auth-btn auth-btn--ghost" @click="addShRec">+ Record</button>',
    '</div>',
    '<div class="admin-actions" style="margin-top:0.7rem">',
    '<button type="button" class="auth-btn" @click="applyShForm">Apply to list</button>',
    '<button type="button" class="auth-btn auth-btn--ghost" @click="cancelShEdit">Cancel</button>',
    '</div></div>',
    '<ul class="sh-list" v-if="serverLevels.length">',
    '<li class="sh-item" v-for="(lv, i) in serverLevels" :key="i">',
    '<span class="sh-item__rank">#{{ i + 1 }}</span>',
    '<strong>{{ lv.name || "(unnamed)" }}</strong>',
    '<span class="admin-muted" v-if="lv.id">ID {{ lv.id }}</span>',
    '<span class="admin-muted">{{ (lv.records || []).length }} clears</span>',
    '<div class="sh-item__actions">',
    '<button type="button" class="auth-btn auth-btn--ghost" style="padding:0.25rem 0.5rem" @click="moveSh(i,-1)" :disabled="i===0">Up</button>',
    '<button type="button" class="auth-btn auth-btn--ghost" style="padding:0.25rem 0.5rem" @click="moveSh(i,1)" :disabled="i===serverLevels.length-1">Down</button>',
    '<button type="button" class="auth-btn auth-btn--ghost" style="padding:0.25rem 0.5rem" @click="editSh(i)">Edit</button>',
    '<button type="button" class="rec-del" @click="removeSh(i)">X</button>',
    '</div></li></ul>',
    '<p v-else class="admin-hint">No levels yet. Click + Add level.</p>',
    '</div>',
  ].join('\n');

  if (code.includes(oldPanel)) {
    code = code.replace(oldPanel, newPanel);
  } else {
    console.warn('[Admin] Server Hardest panel pattern not found — keeping JSON editor');
  }

  const mod = await import(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })));
  return mod.default;
});
