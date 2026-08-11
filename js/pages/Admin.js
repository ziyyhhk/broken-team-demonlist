import AdminBase from 'https://cdn.jsdelivr.net/gh/ziyyhhk/broken-team-demonlist@1562ed3c8171bf007a22daa608c535e9eef4f659/js/pages/Admin.js';
import { boardMethods } from './AdminExtras.js';

const base = AdminBase;

function baseData() {
  return typeof base.data === 'function' ? base.data() : (base.data || {});
}

const boardBtn = `<button type="button" class="admin-tab" :class="{ active: tab==='board' }" @click="openBoard" v-if="canLevels">Leaderboard</button>
`;

const boardPanel = `<div v-if="tab==='board' && canLevels" class="admin-panel admin-panel--wide">
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
<button type="button" class="rec-del" @click="boardRows.splice(ri,1)">✕</button>
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
`;

let tpl = base.template || '';
tpl = tpl.replace('Levels & records</button>', 'Levels & records</button>\n' + boardBtn);
tpl = tpl.replace(
  "<div v-if=\"tab==='server' && canLevels\" class=\"admin-panel\">",
  boardPanel + "\n<div v-if=\"tab==='server' && canLevels\" class=\"admin-panel\">"
);

export default {
  name: 'Admin',
  components: base.components || {},
  template: tpl,
  data() {
    return Object.assign({}, baseData(), {
      board: [], boardPlayer: null, boardRows: [], verifiedRows: [],
      playerLookup: '', setVerifierPath: '',
      addBeat: { path: '', percent: 100, hz: 240, link: '' },
    });
  },
  computed: base.computed || {},
  methods: Object.assign({}, base.methods || {}, boardMethods),
  beforeUnmount() {
    if (typeof base.beforeUnmount === 'function') base.beforeUnmount.call(this);
  },
  async mounted() {
    if (typeof base.mounted === 'function') await base.mounted.call(this);
  },
};
