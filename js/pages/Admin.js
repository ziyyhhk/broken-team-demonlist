import {
  auth, can, isOwner, logout, getUsersAsync, createAccount,
  getGithubToken, setGithubToken, githubPutFile, testGithubToken,
} from '../auth.js';
import { fetchList, fetchEditors, fetchConfig, fetchInfo, fetchRules, fetchImpossible, fetchLeaderboard } from '../content.js';
import Spinner from '../components/Spinner.js';
import { TAG_GROUPS } from '../tags.js';
import {
  WEBHOOK_KEY,
  DEFAULT_MESSAGES,
  resolveDiscordId,
  formatMessage,
  buildVars,
  sendDiscordWebhook,
  diffLevelAnnouncements,
  diffListOrder,
} from '../discordAnnounce.js';

function slugify(n) {
  return String(n || '').trim().replace(/[^a-zA-Z0-9]+/g, '').replace(/^\\d+/, '') || 'NewLevel';
}

export default {
  components: { Spinner },
  data: () => ({
    auth, tab: 'levels', loading: true, list: [], listOrder: [], impossibleOrder: [], users: [],
    editors: null, config: null, infoText: '', rulesText: '', editorsText: '',
    selectedPath: null, draft: null, draftRecords: [], msg: '', err: '',
    saving: false, showAddLevel: false, showAddImpossible: false, mainCutoff: 75, extendedCutoff: 150,
    TAG_GROUPS,
    newLevel: { name: '', id: '', author: '', verifier: '', verification: '', thumbnail: '', length: '', percentToQualify: 100, tags: [], targetList: 'main', placeAt: 1 },
    newImp: { name: '', id: '', author: '', verifier: '', verification: '', thumbnail: '', length: '', tags: [] },
    newRec: { user: '', percent: 100, link: '' },
    levelSearch: '', impSearch: '', newUser: '', newPass: '', newRole: 'helper',
    ghToken: '', activityLogs: [], serverHardestText: '[]', serverLevels: [],
    leaderboard: [], playerDiscord: {}, playerSearch: '', discordWebhook: '',
    manualPlayerName: '', manualPlayerId: '', testingWebhook: false,
    discordMessages: Object.assign({}, DEFAULT_MESSAGES),
    levelSnapshot: null,
    listOrderSnapshot: [],
    announceOnSave: true,
  }),
  computed: {
    canLevels() { return can('editLevels'); },
    canList() { return can('editList'); },
    canEditors() { return can('editEditors'); },
    canUsers() { return isOwner(); },
    canToken() { return isOwner() || (auth.user && auth.user.role === 'admin'); },
    filteredLevels() {
      const q = (this.levelSearch || '').trim().toLowerCase();
      if (!q) return this.listOrder;
      return this.listOrder.filter((p) => p.toLowerCase().includes(q));
    },
    filteredImpossible() {
      const q = (this.impSearch || '').trim().toLowerCase();
      if (!q) return this.impossibleOrder;
      return this.impossibleOrder.filter((p) => p.toLowerCase().includes(q));
    },
    isSelectedImpossible() {
      return this.selectedPath && this.impossibleOrder.includes(this.selectedPath);
    },
    playerRows() {
      const map = this.playerDiscord || {};
      const q = (this.playerSearch || '').trim().toLowerCase();
      const fromLb = (this.leaderboard || []).map((p, i) => ({
        rank: i + 1, name: p.user, total: p.total, onLeaderboard: true,
        discordId: map[p.user] || this.findDiscordCaseInsensitive(p.user) || '',
      }));
      const lbNames = new Set(fromLb.map((r) => r.name.toLowerCase()));
      const extras = Object.keys(map).filter((n) => !lbNames.has(n.toLowerCase())).map((n) => ({
        rank: null, name: n, total: null, onLeaderboard: false, discordId: map[n] || '',
      }));
      let rows = fromLb.concat(extras);
      if (q) rows = rows.filter((r) => r.name.toLowerCase().includes(q) || String(r.discordId).includes(q));
      return rows;
    },
    linkedCount() {
      return Object.values(this.playerDiscord || {}).filter((id) => String(id || '').trim()).length;
    },
  },
  template: `<main class="page-admin page-shell"><p class="admin-banner admin-banner--err">Admin panel file is being restored. Please hard-refresh in a minute. Use Levels tab after restore.</p><button type="button" class="auth-btn" @click="onLogout">Log out</button></main>`,
  methods: {
    onLogout() { logout(); location.hash = '#/login'; },
  },
  async mounted() {
    if (!auth.user) { location.hash = '#/login'; return; }
    this.loading = false;
  },
};
