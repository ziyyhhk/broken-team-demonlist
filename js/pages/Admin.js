import {
    auth,
    can,
    isOwner,
    logout,
    getUsersAsync,
    createAccount,
    syncUsersToGithub,
    getGithubToken,
    setGithubToken,
    githubPutFile,
    testGithubToken,
} from '../auth.js';
import { fetchList, fetchEditors, fetchConfig, fetchInfo, fetchRules, fetchLeaderboard } from '../content.js';
import Spinner from '../components/Spinner.js';

function slugify(name) {
    return String(name || '').trim().replace(/[^a-zA-Z0-9]+/g, '').replace(/^\d+/, '') || 'NewLevel';
}

export default {
    components: { Spinner },
    data: () => ({
        auth, tab: 'levels', loading: true, list: [], listOrder: [], editors: [], users: [],
        board: [], boardPlayer: null, boardRows: [], verifiedRows: [], playerLookup: '', setVerifierPath: '',
        addBeat: { path: '', percent: 100, hz: 240, link: '' },
        selectedPath: null, draft: null, draftRecords: [], msg: '', err: '',
        ghToken: '', tokenTestLines: [], tokenTesting: false, saving: false,
        editorsTextRaw: '', newUser: '', newPass: '', newRole: 'admin', creating: false,
        mainCutoff: 75, extendedCutoff: 150, infoText: '', rulesText: '',
        newRec: { user: '', percent: 100, hz: 240, link: '' }, levelSearch: '',
        syncPhase: '', syncSeconds: 60, showAddLevel: false,
        newLevel: { name: '', id: '', author: '', verifier: '', verification: '', length: '', percentToQualify: 100 },
        _syncTimer: null, _syncTick: null,
    }),
    computed: {
        owner() { return isOwner(); },
        canLevels() { return can('editLevels'); },
        canList() { return can('editList'); },
        canEditors() { return can('editEditors'); },
        canUsers() { return can('manageUsers') || isOwner(); },
        canToken() { return isOwner() || can('editLevels') || can('editList'); },
        hasToken() { return !!getGithubToken(); },
        tierPreview() {
            var main = Number(this.mainCutoff) || 0, ext = Number(this.extendedCutoff) || 0;
            return this.listOrder.map(function (name, i) {
                var rank = i + 1;
                return { name: name, rank: rank, tier: rank <= main ? 'Main' : rank <= ext ? 'Extended' : 'Legacy' };
            });
        },
        filteredLevels() {
            var q = (this.levelSearch || '').trim().toLowerCase();
            if (!q) return this.listOrder;
            return this.listOrder.filter(function (p) { return p.toLowerCase().indexOf(q) !== -1; });
        },
    },
    template: `
        <main v-if="loading" class="page-shell"><Spinner /></main>
        <main v-else class="page-admin page-shell">
            <aside class="admin-side">
                <p class="admin-user">{{ auth.user && auth.user.username }} · {{ auth.user && auth.user.role }}</p>
                <button type="button" class="admin-tab" :class="{ active: tab === 'tiers' }" @click="setTab('tiers')" v-if="canList">Tiers & order</button>
                <button type="button" class="admin-tab" :class="{ active: tab === 'levels' }" @click="setTab('levels')" v-if="canLevels">Levels & records</button>
                <button type="button" class="admin-tab" :class="{ active: tab === 'board' }" @click="openBoard" v-if="canLevels">Leaderboard</button>
                <button type="button" class="admin-tab" :class="{ active: tab === 'info' }" @click="setTab('info')" v-if="canLevels">Info</button>
                <button type="button" class="admin-tab" :class="{ active: tab === 'rules' }" @click="setTab('rules')" v-if="canLevels">Rules</button>
                <button type="button" class="admin-tab" :class="{ active: tab === 'editors' }" @click="openEditors" v-if="canEditors">Editors</button>
                <button type="button" class="admin-tab" :class="{ active: tab === 'users' }" @click="openUsers" v-if="canUsers">Users</button>
                <button type="button" class="admin-tab" :class="{ active: tab === 'settings' }" @click="setTab('settings')" v-if="canToken">Settings</button>
                <button type="button" class="admin-tab admin-out" @click="onLogout">Log out</button>
            </aside>
            <section class="admin-main">
                <p class="admin-banner" v-if="msg">{{ msg }}</p>
                <p class="admin-banner admin-banner--err" v-if="err">{{ err }}</p>
                <div class="sync-toast" v-if="syncPhase" :class="'sync-toast--' + syncPhase">
                    <template v-if="syncPhase === 'waiting'"><strong>Sync…</strong> ~{{ syncSeconds }}s</template>
                    <template v-else><strong>Sync done.</strong> Press <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd>
                        <button type="button" class="sync-toast__x" @click="syncPhase = ''">Dismiss</button></template>
                </div>
                <transition name="admin-tab" mode="out-in">
                    <div :key="tab" class="admin-tab-body">

                <div v-if="tab === 'tiers' && canList" class="admin-panel">
                    <h2>Tiers & order</h2>
                    <div class="admin-row">
                        <label>Main cutoff <input class="admin-input" type="number" min="1" v-model.number="mainCutoff" /></label>
                        <label>Extended cutoff <input class="admin-input" type="number" min="1" v-model.number="extendedCutoff" /></label>
                    </div>
                    <div class="admin-actions"><button type="button" class="auth-btn" :disabled="saving" @click="saveConfig()">Save cutoffs</button></div>
                    <ul class="admin-order">
                        <li v-for="(row, i) in tierPreview" :key="row.name">
                            <span class="admin-order__rank">#{{ row.rank }}</span>
                            <span class="admin-role-tag">{{ row.tier }}</span>
                            <strong>{{ row.name }}</strong>
                            <span class="admin-order__btns">
                                <button type="button" @click="moveUp(i)" :disabled="i===0">↑</button>
                                <button type="button" @click="moveDown(i)" :disabled="i===listOrder.length-1">↓</button>
                            </span>
                        </li>
                    </ul>
                    <div class="admin-actions"><button type="button" class="auth-btn" :disabled="saving" @click="saveList()">Save order</button></div>
                </div>

                <div v-if="tab === 'levels' && canLevels" class="admin-panel admin-panel--wide">
                    <h2>Levels & people</h2>
                    <div class="admin-howto">
                        <strong>Verifier vs victor</strong>
                        <ol>
                            <li><b>Verifier</b> → field “Player who verified” (real name like Nyx)</li>
                            <li><b>Victor</b> → table below (people who beat it after)</li>
                            <li>Or use <b>Leaderboard</b> tab → type name → Set as verifier</li>
                        </ol>
                    </div>
                    <div class="admin-actions">
                        <button type="button" class="auth-btn" @click="showAddLevel = !showAddLevel">{{ showAddLevel ? 'Hide new level' : '+ New level' }}</button>
                    </div>
                    <div class="admin-edit-card" v-if="showAddLevel">
                        <h3>Add a new level</h3>
                        <div class="admin-grid">
                            <label>Level name * <input class="admin-input" v-model="newLevel.name" /></label>
                            <label>In-game ID <input class="admin-input" v-model="newLevel.id" type="number" /></label>
                            <label>Author <input class="admin-input" v-model="newLevel.author" /></label>
                            <label>Player who verified * <input class="admin-input" v-model="newLevel.verifier" placeholder="Nyx" /></label>
                            <label class="admin-grid--full">Verification video * <input class="admin-input" v-model="newLevel.verification" /></label>
                            <label>Length <input class="admin-input" v-model="newLevel.length" /></label>
                            <label>Qualify % <input class="admin-input" v-model.number="newLevel.percentToQualify" type="number" /></label>
                        </div>
                        <div class="admin-actions"><button type="button" class="auth-btn" :disabled="saving" @click="createLevel">Create level on list</button></div>
                    </div>
                    <div class="level-picker">
                        <input class="admin-input" type="search" v-model="levelSearch" placeholder="Search…" />
                        <div class="level-picker__list">
                            <button type="button" class="level-picker__item" v-for="p in filteredLevels" :key="p" :class="{ active: selectedPath === p }" @click="selectLevel(p)">
                                <span class="level-picker__rank">#{{ listOrder.indexOf(p) + 1 }}</span><span>{{ p }}</span>
                            </button>
                        </div>
                    </div>
                    <template v-if="draft">
                        <div class="admin-edit-card">
                            <h3>Edit: {{ draft.name || selectedPath }}</h3>
                            <div class="admin-grid">
                                <label>Name <input class="admin-input" v-model="draft.name" /></label>
                                <label>ID <input class="admin-input" v-model.number="draft.id" type="number" /></label>
                                <label>Author <input class="admin-input" v-model="draft.author" /></label>
                                <label>Player who verified <input class="admin-input" v-model="draft.verifier" placeholder="Real name e.g. Nyx" /></label>
                                <label class="admin-grid--full">Verification video <input class="admin-input" v-model="draft.verification" /></label>
                                <label>Length <input class="admin-input" v-model="draft.length" /></label>
                                <label>Qualify % <input class="admin-input" v-model.number="draft.percentToQualify" type="number" /></label>
                            </div>
                            <h3>Victors (people who beat it)</h3>
                            <div class="rec-table">
                                <div class="rec-table__row" v-for="(r, ri) in draftRecords" :key="ri">
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
                            <div class="admin-actions"><button type="button" class="auth-btn" :disabled="saving" @click="saveLevel()">Save level</button></div>
                        </div>
                    </template>
                </div>

                <div v-if="tab === 'board' && canLevels" class="admin-panel admin-panel--wide">
                    <h2>Leaderboard editor</h2>
                    <div class="admin-howto">
                        <strong>Put someone on the board</strong>
                        <ol>
                            <li>Type their name → <b>Open / create player</b></li>
                            <li><b>VERIFIED:</b> pick level → <b>Set as verifier of this level</b></li>
                            <li><b>COMPLETED:</b> Add level they beat → <b>Save victor records</b></li>
                        </ol>
                    </div>
                    <div class="admin-row" style="margin-bottom:0.75rem">
                        <input class="admin-input" v-model="playerLookup" placeholder="Player name" style="min-width:12rem" />
                        <button type="button" class="auth-btn" @click="openPlayerByName">Open / create player</button>
                        <button type="button" class="auth-btn auth-btn--ghost" @click="openBoard">Refresh</button>
                    </div>
                    <div class="board-layout">
                        <div class="board-players">
                            <button type="button" class="level-picker__item" v-for="(e, i) in board" :key="e.user" :class="{ active: boardPlayer === e.user }" @click="selectBoardPlayer(e)">
                                <span class="level-picker__rank">#{{ i + 1 }}</span>
                                <span>{{ e.user }}</span>
                                <span class="admin-muted">{{ e.total }} pts</span>
                            </button>
                        </div>
                        <div class="board-detail" v-if="boardPlayer">
                            <h3>{{ boardPlayer }}</h3>
                            <h3>Verified ({{ verifiedRows.length }})</h3>
                            <ul class="admin-userlist" v-if="verifiedRows.length">
                                <li v-for="v in verifiedRows" :key="'v-'+v.path">
                                    <strong>#{{ v.rank }} {{ v.levelName }}</strong>
                                    <button type="button" class="auth-btn auth-btn--ghost" style="margin-left:auto;padding:0.3rem 0.5rem;font-size:0.75rem" @click="clearVerifier(v.path)">Remove</button>
                                </li>
                            </ul>
                            <p v-else class="admin-hint">None yet — set below.</p>
                            <div class="admin-row" style="margin:0.75rem 0">
                                <select class="admin-input" v-model="setVerifierPath">
                                    <option value="" disabled>Pick level…</option>
                                    <option v-for="p in listOrder" :key="'sv-'+p" :value="p">{{ p }}</option>
                                </select>
                                <button type="button" class="auth-btn" :disabled="saving" @click="setAsVerifier">Set as verifier</button>
                            </div>
                            <h3>Victors / records</h3>
                            <div class="rec-table">
                                <div class="rec-table__row" v-for="(row, ri) in boardRows" :key="row.path+ri">
                                    <span class="board-lvl">#{{ row.rank }} {{ row.levelName }}</span>
                                    <input class="admin-input" type="number" v-model.number="row.percent" />
                                    <input class="admin-input" type="number" v-model.number="row.hz" />
                                    <input class="admin-input" v-model="row.link" />
                                    <button type="button" class="rec-del" @click="removeBoardRow(ri)">✕</button>
                                </div>
                            </div>
                            <div class="admin-actions"><button type="button" class="auth-btn" :disabled="saving" @click="saveBoardPlayer">Save victor records</button></div>
                            <h3>Add level they beat</h3>
                            <div class="admin-row">
                                <select class="admin-input" v-model="addBeat.path">
                                    <option value="" disabled>Level…</option>
                                    <option v-for="p in listOrder" :key="p" :value="p">{{ p }}</option>
                                </select>
                                <input class="admin-input" type="number" v-model.number="addBeat.percent" placeholder="%" style="width:5rem" />
                                <input class="admin-input" type="number" v-model.number="addBeat.hz" placeholder="Hz" style="width:5rem" />
                                <input class="admin-input" v-model="addBeat.link" placeholder="Video" />
                                <button type="button" class="auth-btn auth-btn--ghost" @click="addBeatToPlayer">Add</button>
                            </div>
                        </div>
                        <p v-else class="admin-hint">Type a player name above and click Open.</p>
                    </div>
                </div>

                <div v-if="tab === 'info' && canLevels" class="admin-panel">
                    <h2>Info</h2>
                    <textarea class="admin-ta" v-model="infoText" rows="14"></textarea>
                    <div class="admin-actions"><button type="button" class="auth-btn" :disabled="saving" @click="saveInfo()">Save</button></div>
                </div>
                <div v-if="tab === 'rules' && canLevels" class="admin-panel">
                    <h2>Rules</h2>
                    <textarea class="admin-ta" v-model="rulesText" rows="14"></textarea>
                    <div class="admin-actions"><button type="button" class="auth-btn" :disabled="saving" @click="saveRules()">Save</button></div>
                </div>
                <div v-if="tab === 'editors' && canEditors" class="admin-panel">
                    <h2>Editors</h2>
                    <textarea class="admin-ta" v-model="editorsTextRaw" rows="12"></textarea>
                    <div class="admin-actions"><button type="button" class="auth-btn" :disabled="saving" @click="saveEditors()">Save</button></div>
                </div>
                <div v-if="tab === 'users' && canUsers" class="admin-panel">
                    <h2>Users</h2>
                    <div class="admin-create">
                        <label>Username <input class="admin-input" v-model="newUser" /></label>
                        <label>Password <input class="admin-input" v-model="newPass" type="password" /></label>
                        <label>Role <select class="admin-input" v-model="newRole"><option value="admin">Admin</option><option value="helper">Helper</option><option value="member">Member</option></select></label>
                        <button type="button" class="auth-btn" :disabled="creating" @click="createUser">Create + sync</button>
                    </div>
                    <ul class="admin-userlist"><li v-for="u in users" :key="u.username"><strong>{{ u.username }}</strong> <span class="admin-role-tag">{{ u.role }}</span></li></ul>
                </div>
                <div v-if="tab === 'settings' && canToken" class="admin-panel">
                    <h2>GitHub token</h2>
                    <label>Token <input class="admin-input" type="password" v-model="ghToken" placeholder="ghp_… or github_pat_…" autocomplete="off" /></label>
                    <div class="admin-actions">
                        <button type="button" class="auth-btn" @click="saveToken">Save token</button>
                        <button type="button" class="auth-btn auth-btn--ghost" :disabled="tokenTesting" @click="runTokenTest">{{ tokenTesting ? 'Testing…' : 'Test token' }}</button>
                    </div>
                    <ul class="admin-userlist" v-if="tokenTestLines.length" style="margin-top:0.75rem"><li v-for="(line, i) in tokenTestLines" :key="i">{{ line }}</li></ul>
                </div>

                    </div>
                </transition>
            </section>
        </main>
    `,
    methods: {
        setTab(t) { this.tab = t; },
        flash(msg, isErr) {
            this.msg = isErr ? '' : msg; this.err = isErr ? msg : '';
            var self = this; clearTimeout(this._flashTimer);
            this._flashTimer = setTimeout(function () { self.msg = ''; self.err = ''; }, 10000);
        },
        startSyncNotify() {
            var self = this; clearTimeout(this._syncTimer); clearInterval(this._syncTick);
            this.syncPhase = 'waiting'; this.syncSeconds = 60;
            this._syncTick = setInterval(function () { if (self.syncSeconds > 0) self.syncSeconds -= 1; }, 1000);
            this._syncTimer = setTimeout(function () { clearInterval(self._syncTick); self.syncPhase = 'done'; }, 60000);
        },
        async pushFile(path, text, message) {
            if (!getGithubToken()) { this.flash('No token — Settings first.', true); return false; }
            this.saving = true;
            var res = await githubPutFile(path, text, message);
            this.saving = false;
            if (!res.ok) { this.flash(res.error, true); return false; }
            this.flash('Saved to GitHub.'); this.startSyncNotify(); return true;
        },
        onLogout() { logout(); this.$router.push('/login'); },
        openEditors() { this.editorsTextRaw = JSON.stringify(this.editors, null, 4); this.tab = 'editors'; },
        async openUsers() { this.tab = 'users'; await this.refreshUsers(); },
        async openBoard() {
            this.tab = 'board';
            var pair = await fetchLeaderboard();
            this.board = (pair && pair[0]) || [];
            if (this.boardPlayer) this.selectBoardPlayer(this.boardPlayer);
        },
        selectBoardPlayer(entry) {
            var name = typeof entry === 'string' ? entry : entry.user;
            this.boardPlayer = name; this.playerLookup = name;
            var rows = [], verified = [];
            this.list.forEach(function (pair, idx) {
                var level = pair[0]; if (!level) return;
                var rank = idx + 1;
                if (level.verifier && String(level.verifier).toLowerCase() === name.toLowerCase()) {
                    verified.push({ path: level.path, levelName: level.name, rank: rank });
                }
                (level.records || []).forEach(function (r) {
                    if (r.user && r.user.toLowerCase() === name.toLowerCase()) {
                        rows.push({ path: level.path, levelName: level.name, rank: rank, percent: r.percent, hz: r.hz || 240, link: r.link || '' });
                    }
                });
            });
            this.verifiedRows = verified; this.boardRows = rows;
            this.addBeat = { path: '', percent: 100, hz: 240, link: '' }; this.setVerifierPath = '';
        },
        openPlayerByName() {
            var name = (this.playerLookup || '').trim();
            if (!name) { this.flash('Type a player name first.', true); return; }
            this.selectBoardPlayer(name);
            this.flash('Editing ' + name);
        },
        async setAsVerifier() {
            if (!this.boardPlayer || !this.setVerifierPath) { this.flash('Pick player + level.', true); return; }
            var path = this.setVerifierPath;
            var pair = this.list.find(function (p) { return p[0] && p[0].path === path; });
            if (!pair || !pair[0]) { this.flash('Level not found.', true); return; }
            var level = JSON.parse(JSON.stringify(pair[0]));
            level.verifier = this.boardPlayer; delete level.path;
            var ok = await this.pushFile('data/' + path + '.json', JSON.stringify(level, null, 4), 'Admin: verifier ' + this.boardPlayer);
            if (!ok) return;
            pair[0].verifier = this.boardPlayer;
            this.selectBoardPlayer(this.boardPlayer);
            this.flash(this.boardPlayer + ' verified ' + path);
        },
        async clearVerifier(path) {
            var pair = this.list.find(function (p) { return p[0] && p[0].path === path; });
            if (!pair || !pair[0]) return;
            var level = JSON.parse(JSON.stringify(pair[0]));
            level.verifier = ''; delete level.path;
            var ok = await this.pushFile('data/' + path + '.json', JSON.stringify(level, null, 4), 'Admin: clear verifier');
            if (!ok) return;
            pair[0].verifier = '';
            this.selectBoardPlayer(this.boardPlayer);
        },
        removeBoardRow(ri) { this.boardRows.splice(ri, 1); },
        addBeatToPlayer() {
            if (!this.boardPlayer || !this.addBeat.path) { this.flash('Pick a level.', true); return; }
            var path = this.addBeat.path;
            var pair = this.list.find(function (p) { return p[0] && p[0].path === path; });
            if (!pair || !pair[0]) return;
            var level = pair[0], rank = this.listOrder.indexOf(path) + 1;
            this.boardRows = this.boardRows.filter(function (r) { return r.path !== path; });
            this.boardRows.push({ path: path, levelName: level.name, rank: rank, percent: Number(this.addBeat.percent) || 100, hz: Number(this.addBeat.hz) || 240, link: this.addBeat.link || '' });
            this.addBeat = { path: '', percent: 100, hz: 240, link: '' };
        },
        async saveBoardPlayer() {
            if (!this.boardPlayer) return;
            var player = this.boardPlayer, byPath = {};
            this.boardRows.forEach(function (r) { byPath[r.path] = byPath[r.path] || []; byPath[r.path].push(r); });
            this.saving = true; var errors = [];
            for (var i = 0; i < this.listOrder.length; i++) {
                var path = this.listOrder[i];
                var pair = this.list.find(function (p) { return p[0] && p[0].path === path; });
                if (!pair || !pair[0]) continue;
                var level = JSON.parse(JSON.stringify(pair[0]));
                var recs = (level.records || []).filter(function (r) { return !(r.user && r.user.toLowerCase() === player.toLowerCase()); });
                (byPath[path] || []).forEach(function (r) {
                    recs.push({ user: player, percent: Number(r.percent) || 100, hz: Number(r.hz) || 240, link: r.link || '' });
                });
                level.records = recs; delete level.path;
                var res = await githubPutFile('data/' + path + '.json', JSON.stringify(level, null, 4), 'Admin: board ' + player);
                if (!res.ok) errors.push(res.error); else pair[0].records = recs;
            }
            this.saving = false;
            if (errors.length) { this.flash(errors[0], true); return; }
            this.flash('Saved records for ' + player); this.startSyncNotify(); await this.openBoard();
        },
        async refreshUsers() {
            var list = await getUsersAsync();
            this.users = list.map(function (u) { return { username: u.username, role: u.role }; });
        },
        selectLevel(p) { this.selectedPath = p; this.loadDraft(); },
        moveUp(i) { if (i <= 0) return; var a = this.listOrder.slice(); var t = a[i - 1]; a[i - 1] = a[i]; a[i] = t; this.listOrder = a; },
        moveDown(i) { if (i >= this.listOrder.length - 1) return; var a = this.listOrder.slice(); var t = a[i + 1]; a[i + 1] = a[i]; a[i] = t; this.listOrder = a; },
        async createUser() {
            this.creating = true;
            var res = await createAccount(this.newUser, this.newPass, this.newRole);
            this.creating = false;
            if (!res.ok) { this.flash(res.error, true); return; }
            this.flash('Created ' + this.newUser); if (res.synced) this.startSyncNotify();
            this.newUser = ''; this.newPass = ''; await this.refreshUsers();
        },
        loadDraft() {
            var path = this.selectedPath;
            var found = this.list.find(function (pair) { return pair[0] && pair[0].path === path; });
            if (!found || !found[0]) { this.draft = null; this.draftRecords = []; return; }
            this.draft = JSON.parse(JSON.stringify(found[0]));
            this.draftRecords = JSON.parse(JSON.stringify(this.draft.records || []));
            delete this.draft.path; delete this.draft.records;
        },
        addRecord() {
            if (!this.newRec.user) return;
            this.draftRecords.push({ user: this.newRec.user, percent: Number(this.newRec.percent) || 100, hz: Number(this.newRec.hz) || 240, link: this.newRec.link || '' });
            this.newRec = { user: '', percent: 100, hz: 240, link: '' };
        },
        async createLevel() {
            var n = this.newLevel;
            if (!(n.name || '').trim()) { this.flash('Name required.', true); return; }
            if (!(n.verifier || '').trim()) { this.flash('Verifier name required.', true); return; }
            if (!(n.verification || '').trim()) { this.flash('Video required.', true); return; }
            var path = slugify(n.name);
            if (this.listOrder.indexOf(path) !== -1) path = path + Date.now().toString().slice(-4);
            var payload = {
                id: Number(n.id) || 0, name: n.name.trim(), author: (n.author || n.verifier).trim(),
                creators: [(n.author || n.verifier).trim()], verifier: n.verifier.trim(), verification: n.verification.trim(),
                percentToQualify: Number(n.percentToQualify) || 100, password: 'Free to Copy', length: n.length || '',
                creationDate: new Date().toLocaleDateString('en-US'), tags: [], records: [],
            };
            if (!(await this.pushFile('data/' + path + '.json', JSON.stringify(payload, null, 4), 'Admin: add ' + path))) return;
            var order = this.listOrder.slice(); order.unshift(path);
            if (!(await this.pushFile('data/_list.json', JSON.stringify(order, null, 4), 'Admin: list add'))) return;
            this.listOrder = order; this.list.unshift([Object.assign({}, payload, { path: path }), null]);
            this.showAddLevel = false;
            this.newLevel = { name: '', id: '', author: '', verifier: '', verification: '', length: '', percentToQualify: 100 };
            this.selectLevel(path); this.flash('Level added at #1.');
        },
        async saveLevel() {
            if (!this.draft || !this.selectedPath) return;
            var payload = Object.assign({}, this.draft, { records: this.draftRecords || [] });
            var ok = await this.pushFile('data/' + this.selectedPath + '.json', JSON.stringify(payload, null, 4), 'Admin: update');
            if (ok) {
                var pair = this.list.find(function (p) { return p[0] && p[0].path === this.selectedPath; }.bind(this));
                if (pair) pair[0] = Object.assign({}, payload, { path: this.selectedPath });
            }
        },
        async saveList() { await this.pushFile('data/_list.json', JSON.stringify(this.listOrder, null, 4), 'Admin: order'); },
        async saveConfig() {
            var cfg = { mainCutoff: Number(this.mainCutoff) || 1, extendedCutoff: Number(this.extendedCutoff) || 1 };
            if (cfg.extendedCutoff < cfg.mainCutoff) { this.flash('Extended must be ≥ Main.', true); return; }
            await this.pushFile('data/_config.json', JSON.stringify(cfg, null, 4), 'Admin: cutoffs');
        },
        async saveInfo() {
            try { var data = JSON.parse(this.infoText); } catch (e) { this.flash('Invalid JSON', true); return; }
            await this.pushFile('data/info.json', JSON.stringify(data, null, 4), 'Admin: info');
        },
        async saveRules() {
            try { var data = JSON.parse(this.rulesText); } catch (e) { this.flash('Invalid JSON', true); return; }
            await this.pushFile('data/rules.json', JSON.stringify(data, null, 4), 'Admin: rules');
        },
        async saveEditors() {
            try { var data = JSON.parse(this.editorsTextRaw); } catch (e) { this.flash('Invalid JSON', true); return; }
            this.editors = data;
            await this.pushFile('data/_editors.json', JSON.stringify(data, null, 4), 'Admin: editors');
        },
        saveToken() { setGithubToken(this.ghToken); this.flash(getGithubToken() ? 'Token saved.' : 'Cleared.'); },
        async runTokenTest() {
            if (this.ghToken) setGithubToken(this.ghToken);
            this.tokenTesting = true; this.tokenTestLines = ['Testing…'];
            var res = await testGithubToken(this.ghToken || getGithubToken());
            this.tokenTesting = false; this.tokenTestLines = res.steps || [];
            this.flash(res.ok ? 'Token OK.' : 'Token failed.', !res.ok);
        },
    },
    beforeUnmount() { clearTimeout(this._syncTimer); clearInterval(this._syncTick); clearTimeout(this._flashTimer); },
    async mounted() {
        if (!auth.user) { this.$router.replace('/login'); return; }
        if (!can('editLevels') && !can('editList') && !can('editEditors') && !can('manageUsers') && !isOwner()) {
            this.$router.replace('/'); return;
        }
        this.ghToken = getGithubToken();
        var cfg = await fetchConfig();
        this.mainCutoff = cfg.mainCutoff; this.extendedCutoff = cfg.extendedCutoff;
        var list = (await fetchList()) || [];
        this.list = list;
        this.listOrder = list.map(function (pair) { return pair[0] ? pair[0].path : pair[1]; }).filter(Boolean);
        this.editors = (await fetchEditors()) || [];
        this.editorsTextRaw = JSON.stringify(this.editors, null, 4);
        this.infoText = JSON.stringify((await fetchInfo()) || {}, null, 4);
        this.rulesText = JSON.stringify((await fetchRules()) || {}, null, 4);
        await this.refreshUsers();
        this.tab = this.canList ? 'tiers' : 'levels';
        this.loading = false;
    },
};
