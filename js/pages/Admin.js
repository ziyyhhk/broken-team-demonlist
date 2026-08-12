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
  "import { boardMethods } from '" + pagesBase + "AdminExtras.js';\nimport Spinner from"
);

code = code.replace(
  "activityLogs: [], serverHardestText: '[]',",
  "activityLogs: [], serverHardestText: '[]',\n    board: [], boardPlayer: null, boardRows: [], verifiedRows: [], playerLookup: '', setVerifierPath: '',\n    addBeat: { path: '', percent: 100, hz: 240, link: '' },"
);

code = code.replace(
  'Levels & records</button>',
  'Levels & records</button>\n<button type="button" class="admin-tab" :class="{ active: tab===\'board\' }" @click="openBoard" v-if="canLevels">Leaderboard</button>'
);

code = code.replace(
  "<div v-if=\"tab==='server' && canLevels\" class=\"admin-panel\">",
  "<div v-if=\"tab==='board' && canLevels\" class=\"admin-panel admin-panel--wide\">\n<h2>Leaderboard</h2>\n<div class=\"admin-row\" style=\"margin-bottom:0.75rem\">\n<input class=\"admin-input\" v-model=\"playerLookup\" placeholder=\"Player name\" style=\"min-width:12rem\" />\n<button type=\"button\" class=\"auth-btn\" @click=\"openPlayerByName\">Open / create</button>\n<button type=\"button\" class=\"auth-btn auth-btn--ghost\" @click=\"openBoard\">Refresh</button>\n</div>\n<div class=\"board-layout\">\n<div class=\"board-players\">\n<button type=\"button\" class=\"level-picker__item\" v-for=\"(e, i) in board\" :key=\"e.user\" :class=\"{ active: boardPlayer === e.user }\" @click=\"selectBoardPlayer(e)\">\n<span class=\"level-picker__rank\">#{{ i + 1 }}</span><span>{{ e.user }}</span><span class=\"admin-muted\">{{ e.total }} pts</span>\n</button>\n</div>\n<div class=\"board-detail\" v-if=\"boardPlayer\">\n<h3>{{ boardPlayer }}</h3>\n<h3>Verified</h3>\n<ul class=\"admin-userlist\" v-if=\"verifiedRows.length\">\n<li v-for=\"v in verifiedRows\" :key=\"'v-'+v.path\"><strong>#{{ v.rank }} {{ v.levelName }}</strong>\n<button type=\"button\" class=\"auth-btn auth-btn--ghost\" style=\"margin-left:auto;padding:0.3rem 0.5rem;font-size:0.75rem\" @click=\"clearVerifier(v.path)\">Remove</button></li>\n</ul>\n<p v-else class=\"admin-hint\">None yet.</p>\n<div class=\"admin-row\" style=\"margin:0.75rem 0\">\n<select class=\"admin-input\" v-model=\"setVerifierPath\"><option value=\"\" disabled>Pick level…</option>\n<option v-for=\"p in listOrder\" :key=\"'sv-'+p\" :value=\"p\">{{ p }}</option></select>\n<button type=\"button\" class=\"auth-btn\" :disabled=\"saving\" @click=\"setAsVerifier\">Set verifier</button>\n</div>\n<h3>Victors</h3>\n<div class=\"rec-table\">\n<div class=\"rec-table__row\" v-for=\"(row, ri) in boardRows\" :key=\"row.path+ri\">\n<span class=\"board-lvl\">#{{ row.rank }} {{ row.levelName }}</span>\n<input class=\"admin-input\" type=\"number\" v-model.number=\"row.percent\" />\n<input class=\"admin-input\" type=\"number\" v-model.number=\"row.hz\" />\n<input class=\"admin-input\" v-model=\"row.link\" />\n<button type=\"button\" class=\"rec-del\" @click=\"boardRows.splice(ri,1)\">✕</button>\n</div>\n</div>\n<div class=\"admin-actions\"><button type=\"button\" class=\"auth-btn\" :disabled=\"saving\" @click=\"saveBoardPlayer\">Save records</button></div>\n<div class=\"admin-row\">\n<select class=\"admin-input\" v-model=\"addBeat.path\"><option value=\"\" disabled>Level…</option>\n<option v-for=\"p in listOrder\" :key=\"p\" :value=\"p\">{{ p }}</option></select>\n<input class=\"admin-input\" type=\"number\" v-model.number=\"addBeat.percent\" placeholder=\"%\" style=\"width:5rem\" />\n<input class=\"admin-input\" type=\"number\" v-model.number=\"addBeat.hz\" placeholder=\"Hz\" style=\"width:5rem\" />\n<input class=\"admin-input\" v-model=\"addBeat.link\" placeholder=\"Video\" />\n<button type=\"button\" class=\"auth-btn auth-btn--ghost\" @click=\"addBeatToPlayer\">Add</button>\n</div>\n</div>\n<p v-else class=\"admin-hint\">Type a player name and Open.</p>\n</div>\n</div>\n<div v-if=\"tab==='server' && canLevels\" class=\"admin-panel\">"
);

code = code.replace(
  'async openServerHardest()',
  'async openBoard() { return boardMethods.openBoard.call(this); },\n    selectBoardPlayer(e) { return boardMethods.selectBoardPlayer.call(this, e); },\n    openPlayerByName() { return boardMethods.openPlayerByName.call(this); },\n    async setAsVerifier() { return boardMethods.setAsVerifier.call(this); },\n    async clearVerifier(p) { return boardMethods.clearVerifier.call(this, p); },\n    addBeatToPlayer() { return boardMethods.addBeatToPlayer.call(this); },\n    async saveBoardPlayer() { return boardMethods.saveBoardPlayer.call(this); },\n    async openServerHardest()'
);

const mod = await import(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })));
return mod.default;
});
