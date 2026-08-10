import {
    auth,
    can,
    isOwner,
    logout,
    getUsersAsync,
    setUserRole,
    createAccount,
    syncUsersToGithub,
    getGithubToken,
    setGithubToken,
    githubPutFile,
    downloadJson,
    staffFromUsers,
    fetchGithubCollaborators,
} from '../auth.js';
import { fetchList, fetchEditors, fetchConfig, fetchInfo, fetchRules, fetchLeaderboard } from '../content.js';
import Spinner from '../components/Spinner.js';

export default {
    components: { Spinner },
    data: () => ({
        auth,
        tab: 'levels',
        loading: true,
        list: [],
        listOrder: [],
        editors: [],
        users: [],
        collabs: [],
        collabErr: '',
        board: [],
        boardPlayer: null,
        // editable rows for selected player: { path, levelName, rank, percent, hz, link, kind }
        boardRows: [],
        addBeat: { path: '', percent: 100, hz: 240, link: '' },
        selectedPath: null,
        draft: null,
        draftRecords: [],
        msg: '',
        err: '',
        roleUser: '',
        rolePick: 'helper',
        ghToken: '',
        tokenLocked: false,
        saving: false,
        editorsTextRaw: '',
        newUser: '',
        newPass: '',
        newRole: 'admin',
        creating: false,
        collabPass: '',
        mainCutoff: 2,
        extendedCutoff: 4,
        infoText: '',
        rulesText: '',
        newRec: { user: '', percent: 100, hz: 240, link: '' },
        levelSearch: '',
        syncPhase: '',
        syncSeconds: 60,
        _syncTimer: null,
        _syncTick: null,
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
            var main = Number(this.mainCutoff) || 0;
            var ext = Number(this.extendedCutoff) || 0;
            return this.listOrder.map(function (name, i) {
                var rank = i + 1;
                var tier = rank <= main ? 'Main' : rank <= ext ? 'Extended' : 'Legacy';
                return { name: name, rank: rank, tier: tier };
            });
        },
        filteredLevels() {
            var q = (this.levelSearch || '').trim().toLowerCase();
            if (!q) return this.listOrder;
            return this.listOrder.filter(function (p) {
                return p.toLowerCase().indexOf(q) !== -1;
            });
        },
        siteUsernames() {
            return this.users.map(function (u) { return u.username.toLowerCase(); });
        },
    },
    template: `
        <main v-if="loading" class="page-shell"><Spinner /></main>
        <main v-else class="page-admin page-shell">
            <aside class="admin-side">
                <p class="admin-user">{{ auth.user && auth.user.username }} · {{ auth.user && auth.user.role }}</p>
                <button type="button" class="admin-tab" :class="{ active: tab === 'tiers' }" @click="tab = 'tiers'" v-if="canList">Tiers & order</button>
                <button type="button" class="admin-tab" :class="{ active: tab === 'levels' }" @click="tab = 'levels'" v-if="canLevels">Levels & records</button>
                <button type="button" class="admin-tab" :class="{ active: tab === 'board' }" @click="openBoard" v-if="canLevels">Leaderboard</button>
                <button type="button" class="admin-tab" :class="{ active: tab === 'info' }" @click="tab = 'info'" v-if="canLevels">Info</button>
                <button type="button" class="admin-tab" :class="{ active: tab === 'rules' }" @click="tab = 'rules'" v-if="canLevels">Rules</button>
                <button type="button" class="admin-tab" :class="{ active: tab === 'editors' }" @click="openEditors" v-if="canEditors">Editors</button>
                <button type="button" class="admin-tab" :class="{ active: tab === 'users' }" @click="openUsers" v-if="canUsers">Users</button>
                <button type="button" class="admin-tab" :class="{ active: tab === 'settings' }" @click="tab = 'settings'" v-if="canToken">Settings</button>
                <button type="button" class="admin-tab admin-out" @click="onLogout">Log out</button>
            </aside>

            <section class="admin-main">
                <p class="admin-banner" v-if="msg">{{ msg }}</p>
                <p class="admin-banner admin-banner--err" v-if="err">{{ err }}</p>

                <div class="sync-toast" v-if="syncPhase" :class="'sync-toast--' + syncPhase">
                    <template v-if="syncPhase === 'waiting'">
                        <strong>Sync in progress…</strong> ~{{ syncSeconds }}s
                    </template>
                    <template v-else>
                        <strong>Sync done.</strong> Press <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd>
                        <button type="button" class="sync-toast__x" @click="syncPhase = ''">Dismiss</button>
                    </template>
                </div>

                <!-- TIERS -->
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

                <!-- LEVELS -->
                <div v-if="tab === 'levels' && canLevels" class="admin-panel admin-panel--wide">
                    <h2>Levels & records</h2>
                    <div class="level-picker">
                        <input class="admin-input" type="search" v-model="levelSearch" placeholder="Search…" />
                        <div class="level-picker__list">
                            <button type="button" class="level-picker__item" v-for="p in filteredLevels" :key="p" :class="{ active: selectedPath === p }" @click="selectLevel(p)">
                                <span class="level-picker__rank">#{{ listOrder.indexOf(p) + 1 }}</span>
                                <span>{{ p }}</span>
                            </button>
                        </div>
                    </div>
                    <template v-if="draft">
                        <div class="admin-edit-card">
                            <h3>{{ draft.name || selectedPath }}</h3>
                            <div class="admin-grid">
                                <label>Name <input class="admin-input" v-model="draft.name" /></label>
                                <label>ID <input class="admin-input" v-model.number="draft.id" type="number" /></label>
                                <label>Author <input class="admin-input" v-model="draft.author" /></label>
                                <label>Verifier <input class="admin-input" v-model="draft.verifier" /></label>
                                <label class="admin-grid--full">Verification <input class="admin-input" v-model="draft.verification" /></label>
                                <label>Length <input class="admin-input" v-model="draft.length" /></label>
                                <label>Qualify % <input class="admin-input" v-model.number="draft.percentToQualify" type="number" /></label>
                            </div>
                            <h3>Records</h3>
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

                <!-- LEADERBOARD EDITOR -->
                <div v-if="tab === 'board' && canLevels" class="admin-panel admin-panel--wide">
                    <h2>Edit leaderboard</h2>
                    <p class="admin-hint">
                        Points are calculated from records (rank + %). Edit a player’s clears below, or add a new beat.
                        After Save, the public Leaderboard page updates.
                    </p>
                    <div class="admin-actions">
                        <button type="button" class="auth-btn auth-btn--ghost" @click="openBoard">Refresh</button>
                    </div>

                    <div class="board-layout">
                        <div class="board-players">
                            <button
                                type="button"
                                class="level-picker__item"
                                v-for="(e, i) in board"
                                :key="e.user"
                                :class="{ active: boardPlayer === e.user }"
                                @click="selectBoardPlayer(e)"
                            >
                                <span class="level-picker__rank">#{{ i + 1 }}</span>
                                <span>{{ e.user }}</span>
                                <span class="admin-muted">{{ e.total }} pts</span>
                            </button>
                            <p v-if="!board.length" class="admin-hint">No players yet — add records first.</p>
                        </div>

                        <div class="board-detail" v-if="boardPlayer">
                            <h3>{{ boardPlayer }}</h3>
                            <p class="admin-hint">Edit % / Hz / video, remove a clear, or add another level they beat.</p>

                            <div class="rec-table">
                                <div class="rec-table__head"><span>Level</span><span>%</span><span>Hz</span><span>Video</span><span></span></div>
                                <div class="rec-table__row" v-for="(row, ri) in boardRows" :key="row.path + '-' + ri">
                                    <span class="board-lvl">#{{ row.rank }} {{ row.levelName }}</span>
                                    <input class="admin-input" type="number" v-model.number="row.percent" min="1" max="100" />
                                    <input class="admin-input" type="number" v-model.number="row.hz" />
                                    <input class="admin-input" v-model="row.link" placeholder="Video URL" />
                                    <button type="button" class="rec-del" @click="removeBoardRow(ri)">✕</button>
                                </div>
                            </div>
                            <div class="admin-actions">
                                <button type="button" class="auth-btn" :disabled="saving" @click="saveBoardPlayer">Save this player’s records</button>
                            </div>

                            <h3>Add a level they beat</h3>
                            <div class="admin-row">
                                <select class="admin-input" v-model="addBeat.path">
                                    <option value="" disabled>Select level…</option>
                                    <option v-for="p in listOrder" :key="p" :value="p">{{ p }}</option>
                                </select>
                                <input class="admin-input" type="number" v-model.number="addBeat.percent" placeholder="%" style="width:5rem" />
                                <input class="admin-input" type="number" v-model.number="addBeat.hz" placeholder="Hz" style="width:5rem" />
                                <input class="admin-input" v-model="addBeat.link" placeholder="Video URL" />
                                <button type="button" class="auth-btn auth-btn--ghost" @click="addBeatToPlayer">Add</button>
                            </div>
                        </div>
                        <p v-else class="admin-hint">Pick a player on the left.</p>
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
                    <button type="button" class="auth-btn auth-btn--ghost" @click="buildEditorsFromUsers">Build from users</button>
                    <textarea class="admin-ta" v-model="editorsTextRaw" rows="12"></textarea>
                    <div class="admin-actions"><button type="button" class="auth-btn" :disabled="saving" @click="saveEditors()">Save</button></div>
                </div>

                <!-- USERS + COLLABS -->
                <div v-if="tab === 'users' && canUsers" class="admin-panel">
                    <h2>Users & GitHub collaborators</h2>

                    <h3>GitHub collaborators</h3>
                    <p class="admin-hint">Pulled from your repo. Create a site login for them (they still need the password you set).</p>
                    <div class="admin-actions">
                        <button type="button" class="auth-btn auth-btn--ghost" @click="loadCollabs">Refresh collaborators</button>
                    </div>
                    <p class="admin-banner admin-banner--err" v-if="collabErr">{{ collabErr }}</p>
                    <ul class="admin-userlist">
                        <li v-for="c in collabs" :key="c.login">
                            <strong>{{ c.login }}</strong>
                            <span class="admin-role-tag" v-if="c.admin">repo admin</span>
                            <span class="admin-role-tag" v-if="siteUsernames.indexOf(c.login.toLowerCase()) !== -1">has site account</span>
                            <template v-if="siteUsernames.indexOf(c.login.toLowerCase()) === -1">
                                <input class="admin-input" style="width:8rem" type="password" v-model="collabPass" placeholder="Set password" />
                                <button type="button" class="auth-btn auth-btn--ghost" @click="createFromCollab(c.login)">Create site admin</button>
                            </template>
                        </li>
                        <li v-if="!collabs.length" class="admin-hint">No collaborators loaded — check token / click refresh.</li>
                    </ul>

                    <h3>Site accounts</h3>
                    <div class="admin-actions">
                        <button type="button" class="auth-btn" :disabled="saving" @click="syncAccounts">Sync accounts to GitHub</button>
                    </div>
                    <div class="admin-create">
                        <h3>Create account</h3>
                        <label>Username <input class="admin-input" v-model="newUser" /></label>
                        <label>Password <input class="admin-input" v-model="newPass" type="password" /></label>
                        <label>Role
                            <select class="admin-input" v-model="newRole">
                                <option value="admin">Admin</option>
                                <option value="helper">Helper</option>
                                <option value="member">Member</option>
                            </select>
                        </label>
                        <button type="button" class="auth-btn" :disabled="creating" @click="createUser">Create + sync</button>
                    </div>
                    <ul class="admin-userlist">
                        <li v-for="u in users" :key="u.username">
                            <strong>{{ u.username }}</strong>
                            <span class="admin-role-tag">{{ u.role }}</span>
                        </li>
                    </ul>
                    <div class="admin-row">
                        <input class="admin-input" v-model="roleUser" placeholder="Username" />
                        <select class="admin-input" v-model="rolePick">
                            <option value="helper">Helper</option>
                            <option value="admin">Admin</option>
                            <option value="member">Member</option>
                        </select>
                        <button type="button" class="auth-btn" @click="assignRole">Apply role</button>
                    </div>
                </div>

                <div v-if="tab === 'settings' && canToken" class="admin-panel">
                    <h2>GitHub token</h2>
                    <p class="admin-hint">“All repositories” is fine. Contents: Read and write. Also needs permission to list collaborators if you use that button.</p>
                    <label v-if="!tokenLocked || !hasToken">Token
                        <input class="admin-input" type="password" v-model="ghToken" placeholder="github_pat_…" />
                    </label>
                    <p class="admin-hint" v-else>Token locked on this browser.</p>
                    <div class="admin-actions">
                        <button type="button" class="auth-btn" v-if="!tokenLocked || !hasToken" @click="saveToken">Save</button>
                        <button type="button" class="auth-btn auth-btn--ghost" v-if="hasToken && tokenLocked" @click="tokenLocked = false">Unlock</button>
                        <button type="button" class="auth-btn auth-btn--ghost" v-if="hasToken && !tokenLocked" @click="clearToken">Clear</button>
                    </div>
                </div>
            </section>
        </main>
    `,
    methods: {
        flash(msg, isErr) {
            this.msg = isErr ? '' : msg;
            this.err = isErr ? msg : '';
            var self = this;
            clearTimeout(this._flashTimer);
            this._flashTimer = setTimeout(function () { self.msg = ''; self.err = ''; }, 8000);
        },
        startSyncNotify() {
            var self = this;
            clearTimeout(this._syncTimer);
            clearInterval(this._syncTick);
            this.syncPhase = 'waiting';
            this.syncSeconds = 60;
            this._syncTick = setInterval(function () {
                if (self.syncSeconds > 0) self.syncSeconds -= 1;
            }, 1000);
            this._syncTimer = setTimeout(function () {
                clearInterval(self._syncTick);
                self.syncPhase = 'done';
            }, 60000);
        },
        async pushFile(path, text, message) {
            if (!getGithubToken()) {
                this.flash('No token — open Settings and paste your github_pat_.', true);
                return false;
            }
            this.saving = true;
            var res = await githubPutFile(path, text, message);
            this.saving = false;
            if (!res.ok) { this.flash(res.error, true); return false; }
            this.flash('Saved.');
            this.startSyncNotify();
            return true;
        },
        onLogout() { logout(); this.$router.push('/login'); },
        openEditors() {
            this.editorsTextRaw = JSON.stringify(this.editors, null, 4);
            this.tab = 'editors';
        },
        async openUsers() {
            this.tab = 'users';
            await this.refreshUsers();
            await this.loadCollabs();
        },
        async loadCollabs() {
            this.collabErr = '';
            var res = await fetchGithubCollaborators();
            if (!res.ok) {
                this.collabErr = res.error || 'Could not load collaborators.';
                this.collabs = [];
                return;
            }
            this.collabs = res.list || [];
        },
        async openBoard() {
            this.tab = 'board';
            var pair = await fetchLeaderboard();
            this.board = (pair && pair[0]) || [];
            if (this.boardPlayer) {
                var found = this.board.find(function (e) { return e.user === this.boardPlayer; }.bind(this));
                if (found) this.selectBoardPlayer(found);
                else {
                    this.boardPlayer = null;
                    this.boardRows = [];
                }
            }
        },
        selectBoardPlayer(entry) {
            this.boardPlayer = entry.user;
            var rows = [];
            var name = entry.user;
            // rebuild from raw list data so we can edit accurately
            this.list.forEach(function (pair, idx) {
                var level = pair[0];
                if (!level) return;
                var rank = idx + 1;
                // verifier counts as verified on leaderboard but stored on level, not records
                (level.records || []).forEach(function (r) {
                    if (r.user && r.user.toLowerCase() === name.toLowerCase()) {
                        rows.push({
                            path: level.path,
                            levelName: level.name,
                            rank: rank,
                            percent: r.percent,
                            hz: r.hz || 240,
                            link: r.link || '',
                        });
                    }
                });
            });
            this.boardRows = rows;
            this.addBeat = { path: '', percent: 100, hz: 240, link: '' };
        },
        removeBoardRow(ri) {
            this.boardRows.splice(ri, 1);
        },
        addBeatToPlayer() {
            if (!this.boardPlayer || !this.addBeat.path) {
                this.flash('Pick a level first.', true);
                return;
            }
            var path = this.addBeat.path;
            var pair = this.list.find(function (p) { return p[0] && p[0].path === path; });
            if (!pair || !pair[0]) {
                this.flash('Level not found.', true);
                return;
            }
            var level = pair[0];
            var rank = this.listOrder.indexOf(path) + 1;
            // replace existing row for same level
            this.boardRows = this.boardRows.filter(function (r) { return r.path !== path; });
            this.boardRows.push({
                path: path,
                levelName: level.name,
                rank: rank,
                percent: Number(this.addBeat.percent) || 100,
                hz: Number(this.addBeat.hz) || 240,
                link: this.addBeat.link || '',
            });
            this.addBeat = { path: '', percent: 100, hz: 240, link: '' };
        },
        async saveBoardPlayer() {
            if (!this.boardPlayer) return;
            var player = this.boardPlayer;
            var rows = this.boardRows;
            // group by path
            var byPath = {};
            rows.forEach(function (r) {
                byPath[r.path] = byPath[r.path] || [];
                byPath[r.path].push(r);
            });

            // every level: update this player's records
            var pathsTouched = {};
            this.listOrder.forEach(function (p) { pathsTouched[p] = true; });

            this.saving = true;
            var errors = [];
            for (var i = 0; i < this.listOrder.length; i++) {
                var path = this.listOrder[i];
                var pair = this.list.find(function (p) { return p[0] && p[0].path === path; });
                if (!pair || !pair[0]) continue;
                var level = JSON.parse(JSON.stringify(pair[0]));
                var recs = (level.records || []).filter(function (r) {
                    return !(r.user && r.user.toLowerCase() === player.toLowerCase());
                });
                var mine = byPath[path] || [];
                mine.forEach(function (r) {
                    recs.push({
                        user: player,
                        percent: Number(r.percent) || 100,
                        hz: Number(r.hz) || 240,
                        link: r.link || '',
                    });
                });
                level.records = recs;
                delete level.path;
                var text = JSON.stringify(level, null, 4);
                var res = await githubPutFile('data/' + path + '.json', text, 'Admin: leaderboard ' + player + ' on ' + path);
                if (!res.ok) errors.push(path + ': ' + res.error);
                else {
                    // update local list cache
                    pair[0].records = recs;
                }
            }
            this.saving = false;
            if (errors.length) {
                this.flash(errors[0], true);
                return;
            }
            this.flash('Saved records for ' + player + '. Points will update on the public leaderboard.');
            this.startSyncNotify();
            await this.openBoard();
        },
        async refreshUsers() {
            var list = await getUsersAsync();
            this.users = list.map(function (u) {
                return { username: u.username, role: u.role };
            });
        },
        selectLevel(p) {
            this.selectedPath = p;
            this.loadDraft();
        },
        moveUp(i) {
            if (i <= 0) return;
            var a = this.listOrder.slice();
            var t = a[i - 1]; a[i - 1] = a[i]; a[i] = t;
            this.listOrder = a;
        },
        moveDown(i) {
            if (i >= this.listOrder.length - 1) return;
            var a = this.listOrder.slice();
            var t = a[i + 1]; a[i + 1] = a[i]; a[i] = t;
            this.listOrder = a;
        },
        async createUser() {
            this.creating = true;
            var res = await createAccount(this.newUser, this.newPass, this.newRole);
            this.creating = false;
            if (!res.ok) { this.flash(res.error, true); return; }
            this.flash(res.synced
                ? ('Created + synced ' + this.newUser)
                : 'Created locally — sync needs a token.');
            if (res.synced) this.startSyncNotify();
            this.newUser = '';
            this.newPass = '';
            await this.refreshUsers();
        },
        async createFromCollab(login) {
            if (!this.collabPass || this.collabPass.length < 4) {
                this.flash('Set a password (min 4 chars) in the password box first.', true);
                return;
            }
            var res = await createAccount(login, this.collabPass, 'admin');
            if (!res.ok) { this.flash(res.error, true); return; }
            this.flash('Created site admin for ' + login + '. Tell them the password.');
            this.collabPass = '';
            if (res.synced) this.startSyncNotify();
            await this.refreshUsers();
        },
        async syncAccounts() {
            this.saving = true;
            var users = await getUsersAsync();
            var res = await syncUsersToGithub(users);
            this.saving = false;
            if (!res.ok) { this.flash(res.error, true); return; }
            this.flash('Accounts synced.');
            this.startSyncNotify();
        },
        loadDraft() {
            var path = this.selectedPath;
            var found = this.list.find(function (pair) {
                return pair[0] && pair[0].path === path;
            });
            if (!found || !found[0]) {
                this.draft = null;
                this.draftRecords = [];
                return;
            }
            this.draft = JSON.parse(JSON.stringify(found[0]));
            this.draftRecords = JSON.parse(JSON.stringify(this.draft.records || []));
            delete this.draft.path;
            delete this.draft.records;
        },
        addRecord() {
            if (!this.newRec.user) return;
            this.draftRecords.push({
                user: this.newRec.user,
                percent: Number(this.newRec.percent) || 100,
                hz: Number(this.newRec.hz) || 240,
                link: this.newRec.link || '',
            });
            this.newRec = { user: '', percent: 100, hz: 240, link: '' };
        },
        async saveLevel() {
            if (!this.draft || !this.selectedPath) return;
            var payload = Object.assign({}, this.draft, { records: this.draftRecords || [] });
            var ok = await this.pushFile('data/' + this.selectedPath + '.json', JSON.stringify(payload, null, 4), 'Admin: update ' + this.selectedPath);
            if (ok) {
                var pair = this.list.find(function (p) { return p[0] && p[0].path === this.selectedPath; }.bind(this));
                if (pair) pair[0] = Object.assign({}, payload, { path: this.selectedPath });
            }
        },
        async saveList() {
            await this.pushFile('data/_list.json', JSON.stringify(this.listOrder, null, 4), 'Admin: update list order');
        },
        async saveConfig() {
            var cfg = {
                mainCutoff: Number(this.mainCutoff) || 1,
                extendedCutoff: Number(this.extendedCutoff) || 1,
            };
            if (cfg.extendedCutoff < cfg.mainCutoff) {
                this.flash('Extended cutoff must be ≥ Main cutoff.', true);
                return;
            }
            await this.pushFile('data/_config.json', JSON.stringify(cfg, null, 4), 'Admin: update tier cutoffs');
        },
        async saveInfo() {
            var data;
            try { data = JSON.parse(this.infoText); }
            catch (e) { this.flash('Info JSON invalid.', true); return; }
            await this.pushFile('data/info.json', JSON.stringify(data, null, 4), 'Admin: update info');
        },
        async saveRules() {
            var data;
            try { data = JSON.parse(this.rulesText); }
            catch (e) { this.flash('Rules JSON invalid.', true); return; }
            await this.pushFile('data/rules.json', JSON.stringify(data, null, 4), 'Admin: update rules');
        },
        buildEditorsFromUsers() {
            var fromUsers = staffFromUsers();
            if (fromUsers.length) {
                this.editors = fromUsers;
                this.editorsTextRaw = JSON.stringify(fromUsers, null, 4);
            } else this.flash('No staff users yet.', true);
        },
        async saveEditors() {
            var data;
            try { data = JSON.parse(this.editorsTextRaw); }
            catch (e) { this.flash('Editors JSON invalid.', true); return; }
            this.editors = data;
            await this.pushFile('data/_editors.json', JSON.stringify(data, null, 4), 'Admin: update editors');
        },
        async assignRole() {
            var res = await setUserRole(this.roleUser, this.rolePick);
            if (!res.ok) this.flash(res.error, true);
            else {
                this.flash(res.warning || ('Updated ' + this.roleUser));
                if (!res.warning) this.startSyncNotify();
                await this.refreshUsers();
            }
        },
        saveToken() {
            setGithubToken(this.ghToken);
            this.tokenLocked = !!this.ghToken;
            this.flash(this.ghToken ? 'Token saved.' : 'Token cleared.');
        },
        clearToken() {
            this.ghToken = '';
            setGithubToken('');
            this.tokenLocked = false;
            this.flash('Token cleared.');
        },
    },
    beforeUnmount() {
        clearTimeout(this._syncTimer);
        clearInterval(this._syncTick);
        clearTimeout(this._flashTimer);
    },
    async mounted() {
        if (!auth.user) { this.$router.replace('/login'); return; }
        if (!can('editLevels') && !can('editList') && !can('editEditors') && !can('manageUsers') && !isOwner()) {
            this.$router.replace('/');
            return;
        }
        var tok = getGithubToken();
        this.ghToken = tok;
        this.tokenLocked = !!tok;
        var cfg = await fetchConfig();
        this.mainCutoff = cfg.mainCutoff;
        this.extendedCutoff = cfg.extendedCutoff;
        var list = (await fetchList()) || [];
        this.list = list;
        this.listOrder = list.map(function (pair) { return pair[0] ? pair[0].path : pair[1]; }).filter(Boolean);
        this.editors = (await fetchEditors()) || [];
        this.editorsTextRaw = JSON.stringify(this.editors, null, 4);
        var info = await fetchInfo();
        this.infoText = JSON.stringify(info || {}, null, 4);
        var rules = await fetchRules();
        this.rulesText = JSON.stringify(rules || {}, null, 4);
        await this.refreshUsers();
        this.tab = this.canList ? 'tiers' : 'levels';
        this.loading = false;
    },
};
