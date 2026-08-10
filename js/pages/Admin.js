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
        board: [],
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
        // any staff who can push content may store their own PAT
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
    },
    template: `
        <main v-if="loading" class="page-shell"><Spinner /></main>
        <main v-else class="page-admin page-shell">
            <aside class="admin-side">
                <p class="admin-user">{{ auth.user && auth.user.username }} · {{ auth.user && auth.user.role }}</p>
                <button type="button" class="admin-tab" :class="{ active: tab === 'tiers' }" @click="tab = 'tiers'" v-if="canList">Tiers & order</button>
                <button type="button" class="admin-tab" :class="{ active: tab === 'levels' }" @click="tab = 'levels'" v-if="canLevels">Levels & records</button>
                <button type="button" class="admin-tab" :class="{ active: tab === 'board' }" @click="openBoard" v-if="canLevels">Leaderboard</button>
                <button type="button" class="admin-tab" :class="{ active: tab === 'info' }" @click="tab = 'info'" v-if="canLevels">Info page</button>
                <button type="button" class="admin-tab" :class="{ active: tab === 'rules' }" @click="tab = 'rules'" v-if="canLevels">Rules page</button>
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
                        <strong>Sync in progress…</strong>
                        <span>Wait ~{{ syncSeconds }}s for GitHub Pages.</span>
                    </template>
                    <template v-else>
                        <strong>Sync done.</strong>
                        <span>Press <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd> to refresh.</span>
                        <button type="button" class="sync-toast__x" @click="syncPhase = ''">Dismiss</button>
                    </template>
                </div>

                <div v-if="tab === 'tiers' && canList" class="admin-panel">
                    <h2>Main / Extended / Legacy</h2>
                    <p class="admin-hint">Order = rank. #1 hardest. Cutoffs control which ranks are Main / Extended / Legacy.</p>
                    <div class="admin-row">
                        <label>Main cutoff <input class="admin-input" type="number" min="1" v-model.number="mainCutoff" /></label>
                        <label>Extended cutoff <input class="admin-input" type="number" min="1" v-model.number="extendedCutoff" /></label>
                    </div>
                    <div class="admin-actions">
                        <button type="button" class="auth-btn" :disabled="saving" @click="saveConfig()">Save cutoffs</button>
                    </div>
                    <h3>List order</h3>
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
                    <div class="admin-actions">
                        <button type="button" class="auth-btn" :disabled="saving" @click="saveList()">Save order</button>
                    </div>
                </div>

                <div v-if="tab === 'levels' && canLevels" class="admin-panel admin-panel--wide">
                    <h2>Levels & records</h2>
                    <p class="admin-hint">Records on each level build the public leaderboard. Add a player’s clear here, then Save.</p>
                    <div class="level-picker">
                        <input class="admin-input level-picker__search" type="search" v-model="levelSearch" placeholder="Search levels…" />
                        <div class="level-picker__list">
                            <button type="button" class="level-picker__item" v-for="p in filteredLevels" :key="p" :class="{ active: selectedPath === p }" @click="selectLevel(p)">
                                <span class="level-picker__rank">#{{ listOrder.indexOf(p) + 1 }}</span>
                                <span class="level-picker__name">{{ p }}</span>
                            </button>
                        </div>
                    </div>
                    <template v-if="draft">
                        <div class="admin-edit-card">
                            <h3 class="admin-edit-card__title">{{ draft.name || selectedPath }}</h3>
                            <div class="admin-grid">
                                <label>Name <input class="admin-input" v-model="draft.name" /></label>
                                <label>ID <input class="admin-input" v-model.number="draft.id" type="number" /></label>
                                <label>Author <input class="admin-input" v-model="draft.author" /></label>
                                <label>Verifier <input class="admin-input" v-model="draft.verifier" /></label>
                                <label class="admin-grid--full">Creators <input class="admin-input" :value="(draft.creators||[]).join(', ')" @input="onCreators" /></label>
                                <label class="admin-grid--full">Verification URL <input class="admin-input" v-model="draft.verification" /></label>
                                <label>Password <input class="admin-input" v-model="draft.password" /></label>
                                <label>Length <input class="admin-input" v-model="draft.length" /></label>
                                <label>Created <input class="admin-input" v-model="draft.creationDate" /></label>
                                <label>Qualify % <input class="admin-input" v-model.number="draft.percentToQualify" type="number" /></label>
                            </div>
                            <h3>Records (leaderboard source)</h3>
                            <div class="rec-table">
                                <div class="rec-table__head"><span>Player</span><span>%</span><span>Hz</span><span>Video</span><span></span></div>
                                <div class="rec-table__row" v-for="(r, ri) in draftRecords" :key="ri">
                                    <input class="admin-input" v-model="r.user" />
                                    <input class="admin-input" v-model.number="r.percent" type="number" />
                                    <input class="admin-input" v-model.number="r.hz" type="number" />
                                    <input class="admin-input" v-model="r.link" />
                                    <button type="button" class="rec-del" @click="draftRecords.splice(ri,1)">✕</button>
                                </div>
                                <div class="rec-table__row">
                                    <input class="admin-input" v-model="newRec.user" placeholder="Player" />
                                    <input class="admin-input" v-model.number="newRec.percent" type="number" placeholder="100" />
                                    <input class="admin-input" v-model.number="newRec.hz" type="number" placeholder="240" />
                                    <input class="admin-input" v-model="newRec.link" placeholder="https://youtu.be/…" />
                                    <button type="button" class="auth-btn auth-btn--ghost rec-add" @click="addRecord">Add</button>
                                </div>
                            </div>
                            <div class="admin-actions">
                                <button type="button" class="auth-btn" :disabled="saving" @click="saveLevel()">Save to GitHub</button>
                            </div>
                        </div>
                    </template>
                </div>

                <div v-if="tab === 'board' && canLevels" class="admin-panel">
                    <h2>Leaderboard</h2>
                    <p class="admin-hint">
                        The leaderboard is <strong>calculated automatically</strong> from level records + list order.
                        To change someone’s points: open <strong>Levels & records</strong>, pick the level, add/edit their record, Save.
                    </p>
                    <div class="admin-actions" style="margin-bottom:0.75rem">
                        <button type="button" class="auth-btn auth-btn--ghost" @click="openBoard">Refresh preview</button>
                        <button type="button" class="auth-btn" @click="tab = 'levels'">Edit records</button>
                    </div>
                    <ul class="admin-userlist" v-if="board.length">
                        <li v-for="(e, i) in board" :key="e.user">
                            <span class="admin-order__rank">#{{ i + 1 }}</span>
                            <strong>{{ e.user }}</strong>
                            <span class="admin-muted">{{ e.total }} pts · {{ e.completed.length }} clears · {{ e.verified.length }} verifs</span>
                        </li>
                    </ul>
                    <p v-else class="admin-hint">No players yet — add records on levels first.</p>
                </div>

                <div v-if="tab === 'info' && canLevels" class="admin-panel">
                    <h2>Info page</h2>
                    <textarea class="admin-ta" v-model="infoText" rows="16"></textarea>
                    <div class="admin-actions"><button type="button" class="auth-btn" :disabled="saving" @click="saveInfo()">Save</button></div>
                </div>

                <div v-if="tab === 'rules' && canLevels" class="admin-panel">
                    <h2>Rules page</h2>
                    <textarea class="admin-ta" v-model="rulesText" rows="16"></textarea>
                    <div class="admin-actions"><button type="button" class="auth-btn" :disabled="saving" @click="saveRules()">Save</button></div>
                </div>

                <div v-if="tab === 'editors' && canEditors" class="admin-panel">
                    <h2>Editors</h2>
                    <button type="button" class="auth-btn auth-btn--ghost" @click="buildEditorsFromUsers">Build from users</button>
                    <textarea class="admin-ta" v-model="editorsTextRaw" rows="12"></textarea>
                    <div class="admin-actions"><button type="button" class="auth-btn" :disabled="saving" @click="saveEditors()">Save</button></div>
                </div>

                <div v-if="tab === 'users' && canUsers" class="admin-panel">
                    <h2>Users & roles</h2>
                    <p class="admin-hint">
                        Friend self-register does <strong>not</strong> show here until you create them (or they sync with a token).
                        Use <strong>Create + sync</strong> so they can log in from any device.
                    </p>
                    <div class="admin-actions" style="margin-bottom:0.75rem">
                        <button type="button" class="auth-btn" :disabled="saving" @click="syncAccounts">Sync accounts to GitHub</button>
                    </div>
                    <div class="admin-create" v-if="owner || canUsers">
                        <h3>Create account for a friend</h3>
                        <label>Username <input class="admin-input" v-model="newUser" autocomplete="off" /></label>
                        <label>Password <input class="admin-input" v-model="newPass" type="password" autocomplete="new-password" /></label>
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
                    <h3>Change role</h3>
                    <div class="admin-row">
                        <input class="admin-input" v-model="roleUser" placeholder="Username" />
                        <select class="admin-input" v-model="rolePick">
                            <option value="helper">Helper</option>
                            <option value="admin">Admin</option>
                            <option value="member">Member</option>
                        </select>
                        <button type="button" class="auth-btn" @click="assignRole">Apply</button>
                    </div>
                </div>

                <div v-if="tab === 'settings' && canToken" class="admin-panel">
                    <h2>GitHub token</h2>
                    <p class="admin-hint">
                        <strong>All repositories</strong> on a fine-grained token is fine if “Only select repositories” is missing.
                        Paste your own <code>github_pat_…</code> here (Contents: Read and write). Stored only in this browser.
                    </p>
                    <p class="admin-hint" v-if="hasToken && tokenLocked">Token saved and locked on this device.</p>
                    <label v-if="!tokenLocked || !hasToken">Token
                        <input class="admin-input" type="password" v-model="ghToken" autocomplete="off" placeholder="github_pat_…" />
                    </label>
                    <div class="admin-actions">
                        <button type="button" class="auth-btn" v-if="!tokenLocked || !hasToken" @click="saveToken">Save token</button>
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
            this._flashTimer = setTimeout(function () { self.msg = ''; self.err = ''; }, 7000);
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
                this.flash('No token on this browser. Open Settings and paste your github_pat_.', true);
                return false;
            }
            this.saving = true;
            var res = await githubPutFile(path, text, message);
            this.saving = false;
            if (!res.ok) { this.flash(res.error, true); return false; }
            this.flash('Saved to GitHub.');
            this.startSyncNotify();
            return true;
        },
        onLogout() { logout(); this.$router.push('/login'); },
        onCreators(e) {
            this.draft.creators = e.target.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        },
        onTags(e) {
            this.draft.tags = e.target.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        },
        openEditors() {
            this.editorsTextRaw = JSON.stringify(this.editors, null, 4);
            this.tab = 'editors';
        },
        async openUsers() {
            this.tab = 'users';
            await this.refreshUsers();
        },
        async openBoard() {
            this.tab = 'board';
            var pair = await fetchLeaderboard();
            this.board = (pair && pair[0]) || [];
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
            if (res.synced) {
                this.flash('Created + synced. Friend waits ~1 min, hard refreshes, then logs in.');
                this.startSyncNotify();
            } else {
                this.flash('Created locally only. Set token in Settings, then Sync accounts.', true);
            }
            this.newUser = '';
            this.newPass = '';
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
            await this.pushFile('data/' + this.selectedPath + '.json', JSON.stringify(payload, null, 4), 'Admin: update ' + this.selectedPath);
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
            this.flash(this.ghToken ? 'Token saved on this browser.' : 'Token cleared.');
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
