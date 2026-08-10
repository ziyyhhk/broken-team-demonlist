import {
    auth,
    can,
    isOwner,
    logout,
    getUsers,
    setUserRole,
    createAccount,
    getGithubToken,
    setGithubToken,
    githubPutFile,
    downloadJson,
    staffFromUsers,
} from '../auth.js';
import { fetchList, fetchEditors, fetchConfig, fetchInfo, fetchRules } from '../content.js';
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
        selectedPath: null,
        draft: null,
        draftRecords: [],
        msg: '',
        err: '',
        roleUser: '',
        rolePick: 'helper',
        ghToken: '',
        saving: false,
        permsEditUser: '',
        permsDraft: {
            editLevels: true,
            editList: true,
            editEditors: true,
            manageUsers: false,
        },
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
    }),
    computed: {
        owner() {
            return isOwner();
        },
        canLevels() {
            return can('editLevels');
        },
        canList() {
            return can('editList');
        },
        canEditors() {
            return can('editEditors');
        },
        canUsers() {
            return can('manageUsers') || isOwner();
        },
        tierPreview() {
            var main = Number(this.mainCutoff) || 0;
            var ext = Number(this.extendedCutoff) || 0;
            return this.listOrder.map(function (name, i) {
                var rank = i + 1;
                var tier = rank <= main ? 'Main' : rank <= ext ? 'Extended' : 'Legacy';
                return { name: name, rank: rank, tier: tier };
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
                <button type="button" class="admin-tab" :class="{ active: tab === 'info' }" @click="tab = 'info'" v-if="canLevels">Info page</button>
                <button type="button" class="admin-tab" :class="{ active: tab === 'rules' }" @click="tab = 'rules'" v-if="canLevels">Rules page</button>
                <button type="button" class="admin-tab" :class="{ active: tab === 'editors' }" @click="openEditors" v-if="canEditors">Editors</button>
                <button type="button" class="admin-tab" :class="{ active: tab === 'users' }" @click="refreshUsers(); tab = 'users'" v-if="canUsers">Users</button>
                <button type="button" class="admin-tab" :class="{ active: tab === 'settings' }" @click="tab = 'settings'" v-if="owner">Settings</button>
                <button type="button" class="admin-tab admin-out" @click="onLogout">Log out</button>
            </aside>

            <section class="admin-main">
                <p class="admin-banner" v-if="msg">{{ msg }}</p>
                <p class="admin-banner admin-banner--err" v-if="err">{{ err }}</p>

                <!-- TIERS -->
                <div v-if="tab === 'tiers' && canList" class="admin-panel">
                    <h2>Main / Extended / Legacy</h2>
                    <p class="admin-hint">
                        <strong>Order decides rank.</strong> #1 is the top of the list (hardest).<br/>
                        Ranks 1 → Main cutoff = <strong>Main</strong><br/>
                        Next ranks until Extended cutoff = <strong>Extended</strong><br/>
                        Everything after = <strong>Legacy</strong><br/>
                        Leaderboard points update automatically from level records + this order.
                    </p>
                    <div class="admin-row">
                        <label>Main cutoff (last Main rank)
                            <input type="number" min="1" v-model.number="mainCutoff" />
                        </label>
                        <label>Extended cutoff (last Extended rank)
                            <input type="number" min="1" v-model.number="extendedCutoff" />
                        </label>
                    </div>
                    <div class="admin-actions">
                        <button type="button" class="auth-btn" :disabled="saving" @click="saveConfig(true)">Save cutoffs to GitHub</button>
                    </div>

                    <h3>List order (drag with buttons)</h3>
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
                        <button type="button" class="auth-btn" :disabled="saving" @click="saveList(true)">Save order to GitHub</button>
                        <button type="button" class="auth-btn auth-btn--ghost" @click="saveList(false)">Download _list.json</button>
                    </div>
                </div>

                <!-- LEVELS + RECORDS -->
                <div v-if="tab === 'levels' && canLevels" class="admin-panel">
                    <h2>Levels & records</h2>
                    <p class="admin-hint">Editing records changes the <strong>leaderboard</strong> (it is calculated from these). Save to GitHub to sync globally.</p>
                    <div class="admin-row">
                        <select v-model="selectedPath" @change="loadDraft">
                            <option :value="null" disabled>Select level…</option>
                            <option v-for="p in listOrder" :key="p" :value="p">{{ p }}</option>
                        </select>
                    </div>
                    <template v-if="draft">
                        <label>Name <input v-model="draft.name" /></label>
                        <label>ID <input v-model.number="draft.id" type="number" /></label>
                        <label>Author / uploader <input v-model="draft.author" /></label>
                        <label>Creators (comma) <input :value="(draft.creators||[]).join(', ')" @input="onCreators" /></label>
                        <label>Verifier <input v-model="draft.verifier" /></label>
                        <label>Verification URL <input v-model="draft.verification" /></label>
                        <label>Password <input v-model="draft.password" /></label>
                        <label>Length <input v-model="draft.length" placeholder="1m 12s" /></label>
                        <label>Creation date <input v-model="draft.creationDate" placeholder="3/14/2025" /></label>
                        <label>Percent to qualify <input v-model.number="draft.percentToQualify" type="number" /></label>
                        <label>Tags (comma) <input :value="(draft.tags||[]).join(', ')" @input="onTags" /></label>

                        <h3>Records (leaderboard source)</h3>
                        <ul class="admin-userlist">
                            <li v-for="(r, ri) in draftRecords" :key="ri">
                                <input v-model="r.user" placeholder="Player" style="width:7rem" />
                                <input v-model.number="r.percent" type="number" placeholder="%" style="width:4rem" />
                                <input v-model.number="r.hz" type="number" placeholder="Hz" style="width:4rem" />
                                <input v-model="r.link" placeholder="Video URL" style="flex:1;min-width:8rem" />
                                <button type="button" class="auth-btn auth-btn--ghost" @click="draftRecords.splice(ri,1)">✕</button>
                            </li>
                        </ul>
                        <div class="admin-row">
                            <input v-model="newRec.user" placeholder="Player" />
                            <input v-model.number="newRec.percent" type="number" placeholder="%" style="width:4rem" />
                            <input v-model.number="newRec.hz" type="number" placeholder="Hz" style="width:4rem" />
                            <input v-model="newRec.link" placeholder="https://youtu.be/…" />
                            <button type="button" class="auth-btn auth-btn--ghost" @click="addRecord">Add record</button>
                        </div>

                        <div class="admin-actions">
                            <button type="button" class="auth-btn" :disabled="saving" @click="saveLevel(true)">Save to GitHub</button>
                            <button type="button" class="auth-btn auth-btn--ghost" @click="saveLevel(false)">Download JSON</button>
                        </div>
                    </template>
                </div>

                <!-- INFO -->
                <div v-if="tab === 'info' && canLevels" class="admin-panel">
                    <h2>Info page</h2>
                    <p class="admin-hint">JSON for data/info.json. Edit carefully, then Save to GitHub.</p>
                    <textarea class="admin-ta" v-model="infoText" rows="18"></textarea>
                    <div class="admin-actions">
                        <button type="button" class="auth-btn" :disabled="saving" @click="saveInfo(true)">Save to GitHub</button>
                        <button type="button" class="auth-btn auth-btn--ghost" @click="saveInfo(false)">Download</button>
                    </div>
                </div>

                <!-- RULES -->
                <div v-if="tab === 'rules' && canLevels" class="admin-panel">
                    <h2>Rules page</h2>
                    <p class="admin-hint">JSON for data/rules.json (chapters + rules arrays).</p>
                    <textarea class="admin-ta" v-model="rulesText" rows="18"></textarea>
                    <div class="admin-actions">
                        <button type="button" class="auth-btn" :disabled="saving" @click="saveRules(true)">Save to GitHub</button>
                        <button type="button" class="auth-btn auth-btn--ghost" @click="saveRules(false)">Download</button>
                    </div>
                </div>

                <!-- EDITORS -->
                <div v-if="tab === 'editors' && canEditors" class="admin-panel">
                    <h2>Editors</h2>
                    <div class="admin-actions" style="margin-bottom:0.75rem">
                        <button type="button" class="auth-btn auth-btn--ghost" @click="buildEditorsFromUsers">Build from users</button>
                    </div>
                    <textarea class="admin-ta" v-model="editorsTextRaw" rows="14"></textarea>
                    <div class="admin-actions">
                        <button type="button" class="auth-btn" :disabled="saving" @click="saveEditors(true)">Save to GitHub</button>
                    </div>
                </div>

                <!-- USERS -->
                <div v-if="tab === 'users' && canUsers" class="admin-panel">
                    <h2>Users & roles</h2>
                    <div class="admin-create" v-if="owner">
                        <h3>Create account for someone</h3>
                        <label>Username <input v-model="newUser" autocomplete="off" /></label>
                        <label>Password <input v-model="newPass" type="password" autocomplete="new-password" /></label>
                        <label>Role
                            <select v-model="newRole">
                                <option value="admin">Admin</option>
                                <option value="helper">Helper</option>
                                <option value="member">Member</option>
                            </select>
                        </label>
                        <button type="button" class="auth-btn" :disabled="creating" @click="createUser">Create account</button>
                    </div>
                    <ul class="admin-userlist">
                        <li v-for="u in users" :key="u.username">
                            <strong>{{ u.username }}</strong>
                            <span class="admin-role-tag">{{ u.role }}</span>
                        </li>
                    </ul>
                    <h3>Change role</h3>
                    <div class="admin-row">
                        <input v-model="roleUser" placeholder="Username" />
                        <select v-model="rolePick">
                            <option value="helper">Helper</option>
                            <option value="admin">Admin</option>
                            <option value="member">Member</option>
                        </select>
                        <button type="button" class="auth-btn" @click="assignRole">Apply</button>
                    </div>
                </div>

                <!-- SETTINGS -->
                <div v-if="tab === 'settings' && owner" class="admin-panel">
                    <h2>GitHub token</h2>
                    <p class="admin-hint"><code>github_pat_…</code> is fine. Contents: Read and write.</p>
                    <label>Token <input type="password" v-model="ghToken" autocomplete="off" /></label>
                    <div class="admin-actions">
                        <button type="button" class="auth-btn" @click="saveToken">Save token</button>
                        <button type="button" class="auth-btn auth-btn--ghost" @click="clearToken">Clear</button>
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
            setTimeout(function () { self.msg = ''; self.err = ''; }, 5000);
        },
        onLogout() {
            logout();
            this.$router.push('/login');
        },
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
        refreshUsers() {
            this.users = getUsers().map(function (u) {
                return { username: u.username, role: u.role, createdAt: u.createdAt };
            });
        },
        moveUp(i) {
            if (i <= 0) return;
            var a = this.listOrder.slice();
            var t = a[i - 1];
            a[i - 1] = a[i];
            a[i] = t;
            this.listOrder = a;
        },
        moveDown(i) {
            if (i >= this.listOrder.length - 1) return;
            var a = this.listOrder.slice();
            var t = a[i + 1];
            a[i + 1] = a[i];
            a[i] = t;
            this.listOrder = a;
        },
        async createUser() {
            this.creating = true;
            var res = await createAccount(this.newUser, this.newPass, this.newRole);
            this.creating = false;
            if (!res.ok) { this.flash(res.error, true); return; }
            this.flash('Created ' + this.newUser + ' as ' + this.newRole);
            this.newUser = '';
            this.newPass = '';
            this.refreshUsers();
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
        async saveLevel(toGithub) {
            if (!this.draft || !this.selectedPath) return;
            var payload = Object.assign({}, this.draft, {
                records: this.draftRecords || [],
            });
            var text = JSON.stringify(payload, null, 4);
            if (!toGithub) {
                downloadJson(this.selectedPath + '.json', payload);
                this.flash('Downloaded');
                return;
            }
            this.saving = true;
            var res = await githubPutFile('data/' + this.selectedPath + '.json', text, 'Admin: update ' + this.selectedPath);
            this.saving = false;
            if (!res.ok) this.flash(res.error, true);
            else this.flash('Level + records saved. Leaderboard will update after rebuild.');
        },
        async saveList(toGithub) {
            var order = this.listOrder.slice();
            var text = JSON.stringify(order, null, 4);
            if (!toGithub) {
                downloadJson('_list.json', order);
                this.flash('Downloaded _list.json');
                return;
            }
            this.saving = true;
            var res = await githubPutFile('data/_list.json', text, 'Admin: update list order');
            this.saving = false;
            if (!res.ok) this.flash(res.error, true);
            else this.flash('List order saved.');
        },
        async saveConfig(toGithub) {
            var cfg = {
                mainCutoff: Number(this.mainCutoff) || 1,
                extendedCutoff: Number(this.extendedCutoff) || 1,
            };
            if (cfg.extendedCutoff < cfg.mainCutoff) {
                this.flash('Extended cutoff must be ≥ Main cutoff.', true);
                return;
            }
            var text = JSON.stringify(cfg, null, 4);
            if (!toGithub) {
                downloadJson('_config.json', cfg);
                return;
            }
            this.saving = true;
            var res = await githubPutFile('data/_config.json', text, 'Admin: update tier cutoffs');
            this.saving = false;
            if (!res.ok) this.flash(res.error, true);
            else this.flash('Cutoffs saved. Main ends at #' + cfg.mainCutoff + ', Extended at #' + cfg.extendedCutoff);
        },
        async saveInfo(toGithub) {
            var data;
            try { data = JSON.parse(this.infoText); }
            catch (e) { this.flash('Info JSON invalid.', true); return; }
            var text = JSON.stringify(data, null, 4);
            if (!toGithub) { downloadJson('info.json', data); return; }
            this.saving = true;
            var res = await githubPutFile('data/info.json', text, 'Admin: update info');
            this.saving = false;
            if (!res.ok) this.flash(res.error, true);
            else this.flash('Info page saved.');
        },
        async saveRules(toGithub) {
            var data;
            try { data = JSON.parse(this.rulesText); }
            catch (e) { this.flash('Rules JSON invalid.', true); return; }
            var text = JSON.stringify(data, null, 4);
            if (!toGithub) { downloadJson('rules.json', data); return; }
            this.saving = true;
            var res = await githubPutFile('data/rules.json', text, 'Admin: update rules');
            this.saving = false;
            if (!res.ok) this.flash(res.error, true);
            else this.flash('Rules page saved.');
        },
        buildEditorsFromUsers() {
            var fromUsers = staffFromUsers();
            if (fromUsers.length) {
                this.editors = fromUsers;
                this.editorsTextRaw = JSON.stringify(fromUsers, null, 4);
            } else this.flash('No staff users yet.', true);
        },
        async saveEditors(toGithub) {
            var data;
            try { data = JSON.parse(this.editorsTextRaw); }
            catch (e) { this.flash('Editors JSON invalid.', true); return; }
            this.editors = data;
            var text = JSON.stringify(data, null, 4);
            this.saving = true;
            var res = await githubPutFile('data/_editors.json', text, 'Admin: update editors');
            this.saving = false;
            if (!res.ok) this.flash(res.error, true);
            else this.flash('Editors saved.');
        },
        assignRole() {
            var res = setUserRole(this.roleUser, this.rolePick);
            if (!res.ok) this.flash(res.error, true);
            else { this.flash('Updated ' + this.roleUser); this.refreshUsers(); }
        },
        saveToken() {
            setGithubToken(this.ghToken);
            this.flash(this.ghToken ? 'Token saved.' : 'Token cleared.');
        },
        clearToken() {
            this.ghToken = '';
            setGithubToken('');
            this.flash('Token cleared.');
        },
    },
    async mounted() {
        if (!auth.user) {
            this.$router.replace('/login');
            return;
        }
        if (!can('editLevels') && !can('editList') && !can('editEditors') && !can('manageUsers') && !isOwner()) {
            this.$router.replace('/');
            return;
        }
        this.ghToken = getGithubToken();
        var cfg = await fetchConfig();
        this.mainCutoff = cfg.mainCutoff;
        this.extendedCutoff = cfg.extendedCutoff;
        var list = (await fetchList()) || [];
        this.list = list;
        this.listOrder = list
            .map(function (pair) { return pair[0] ? pair[0].path : pair[1]; })
            .filter(Boolean);
        this.editors = (await fetchEditors()) || [];
        this.editorsTextRaw = JSON.stringify(this.editors, null, 4);
        var info = await fetchInfo();
        this.infoText = JSON.stringify(info || {}, null, 4);
        var rules = await fetchRules();
        this.rulesText = JSON.stringify(rules || {}, null, 4);
        this.refreshUsers();
        this.tab = this.canList ? 'tiers' : 'levels';
        this.loading = false;
    },
};
