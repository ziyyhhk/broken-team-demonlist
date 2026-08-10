import {
    auth,
    can,
    isOwner,
    logout,
    getUsers,
    setUserRole,
    getGithubToken,
    setGithubToken,
    githubPutFile,
    downloadJson,
    staffFromUsers,
} from '../auth.js';
import { fetchList, fetchEditors } from '../content.js';
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
        _recordsBackup: [],
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
        listTextRaw: '',
        editorsTextRaw: '',
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
        hasAnyAdmin() {
            return this.canLevels || this.canList || this.canEditors || this.canUsers || this.owner;
        },
    },
    template: `
        <main v-if="loading" class="page-shell"><Spinner /></main>
        <main v-else class="page-admin page-shell">
            <aside class="admin-side">
                <p class="admin-user">{{ auth.user && auth.user.username }} · {{ auth.user && auth.user.role }}</p>
                <button type="button" class="admin-tab" :class="{ active: tab === 'levels' }" @click="tab = 'levels'" v-if="canLevels">Levels</button>
                <button type="button" class="admin-tab" :class="{ active: tab === 'list' }" @click="openList" v-if="canList">List order</button>
                <button type="button" class="admin-tab" :class="{ active: tab === 'editors' }" @click="openEditors" v-if="canEditors">Editors JSON</button>
                <button type="button" class="admin-tab" :class="{ active: tab === 'users' }" @click="refreshUsers(); tab = 'users'" v-if="canUsers">Users & roles</button>
                <button type="button" class="admin-tab" :class="{ active: tab === 'settings' }" @click="tab = 'settings'" v-if="owner">Settings</button>
                <button type="button" class="admin-tab admin-out" @click="onLogout">Log out</button>
            </aside>

            <section class="admin-main">
                <p class="admin-banner" v-if="msg">{{ msg }}</p>
                <p class="admin-banner admin-banner--err" v-if="err">{{ err }}</p>

                <div v-if="tab === 'levels' && canLevels" class="admin-panel">
                    <h2>Edit levels</h2>
                    <p class="admin-hint">Pick a level, edit fields, then Save to GitHub (needs token) or Download JSON.</p>
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
                        <div class="admin-actions">
                            <button type="button" class="auth-btn" :disabled="saving" @click="saveLevel(true)">Save to GitHub</button>
                            <button type="button" class="auth-btn auth-btn--ghost" @click="saveLevel(false)">Download JSON</button>
                        </div>
                    </template>
                </div>

                <div v-if="tab === 'list' && canList" class="admin-panel">
                    <h2>List order (_list.json)</h2>
                    <p class="admin-hint">One filename per line (no .json). Top = hardest.</p>
                    <textarea class="admin-ta" v-model="listTextRaw" rows="12"></textarea>
                    <div class="admin-actions">
                        <button type="button" class="auth-btn" :disabled="saving" @click="saveList(true)">Save to GitHub</button>
                        <button type="button" class="auth-btn auth-btn--ghost" @click="saveList(false)">Download JSON</button>
                    </div>
                </div>

                <div v-if="tab === 'editors' && canEditors" class="admin-panel">
                    <h2>Editors (_editors.json)</h2>
                    <p class="admin-hint">Use “Build from users” after people register and get roles, or edit JSON manually.</p>
                    <div class="admin-actions" style="margin-bottom:0.75rem">
                        <button type="button" class="auth-btn auth-btn--ghost" @click="buildEditorsFromUsers">Build from users</button>
                    </div>
                    <textarea class="admin-ta" v-model="editorsTextRaw" rows="14"></textarea>
                    <div class="admin-actions">
                        <button type="button" class="auth-btn" :disabled="saving" @click="saveEditors(true)">Save to GitHub</button>
                        <button type="button" class="auth-btn auth-btn--ghost" @click="saveEditors(false)">Download JSON</button>
                    </div>
                </div>

                <div v-if="tab === 'users' && canUsers" class="admin-panel">
                    <h2>Users & roles</h2>
                    <p class="admin-hint">
                        Accounts are stored in <strong>this browser</strong> (GitHub Pages has no server).
                        Someone must register on a browser, then you assign roles here on <em>that same browser</em>,
                        or you register accounts yourself here.
                        Owner username is always <code>akirraaw</code>.
                    </p>
                    <ul class="admin-userlist">
                        <li v-for="u in users" :key="u.username">
                            <strong>{{ u.username }}</strong>
                            <span class="admin-role-tag">{{ u.role }}</span>
                            <span class="admin-muted">{{ u.createdAt && u.createdAt.slice(0,10) }}</span>
                        </li>
                    </ul>
                    <h3>Assign role</h3>
                    <div class="admin-row">
                        <input v-model="roleUser" placeholder="Username" />
                        <select v-model="rolePick">
                            <option value="helper">Helper</option>
                            <option value="admin">Admin</option>
                            <option value="member">Member (no staff)</option>
                        </select>
                        <button type="button" class="auth-btn" @click="assignRole">Apply</button>
                    </div>

                    <template v-if="owner">
                        <h3>Admin permissions</h3>
                        <div class="admin-row">
                            <input v-model="permsEditUser" placeholder="Admin username" />
                            <button type="button" class="auth-btn auth-btn--ghost" @click="loadPerms">Load</button>
                        </div>
                        <label class="admin-check"><input type="checkbox" v-model="permsDraft.editLevels" /> Edit levels</label>
                        <label class="admin-check"><input type="checkbox" v-model="permsDraft.editList" /> Edit list order</label>
                        <label class="admin-check"><input type="checkbox" v-model="permsDraft.editEditors" /> Edit editors</label>
                        <label class="admin-check"><input type="checkbox" v-model="permsDraft.manageUsers" /> Manage users</label>
                        <button type="button" class="auth-btn" @click="savePerms">Save permissions</button>
                    </template>
                </div>

                <div v-if="tab === 'settings' && owner" class="admin-panel">
                    <h2>GitHub save token</h2>
                    <p class="admin-hint">
                        Create a fine-grained PAT with Contents: Read and write on
                        <code>ziyyhhk/broken-team-demonlist</code>.
                        Token stays in your browser only — never put it in the repo.
                    </p>
                    <label>Personal access token
                        <input type="password" v-model="ghToken" placeholder="ghp_…" autocomplete="off" />
                    </label>
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
            setTimeout(function () {
                self.msg = '';
                self.err = '';
            }, 4500);
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
        openList() {
            this.listTextRaw = this.listOrder.join('\n');
            this.tab = 'list';
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
        loadDraft() {
            var path = this.selectedPath;
            var found = this.list.find(function (pair) {
                return pair[0] && pair[0].path === path;
            });
            if (!found || !found[0]) {
                this.draft = null;
                return;
            }
            this.draft = JSON.parse(JSON.stringify(found[0]));
            this._recordsBackup = this.draft.records || [];
            delete this.draft.path;
        },
        async saveLevel(toGithub) {
            if (!this.draft || !this.selectedPath) return;
            var payload = Object.assign({}, this.draft, {
                records: this._recordsBackup || [],
            });
            var text = JSON.stringify(payload, null, 4);
            if (!toGithub) {
                downloadJson(this.selectedPath + '.json', payload);
                this.flash('Downloaded ' + this.selectedPath + '.json');
                return;
            }
            this.saving = true;
            var res = await githubPutFile('data/' + this.selectedPath + '.json', text, 'Admin: update ' + this.selectedPath);
            this.saving = false;
            if (!res.ok) this.flash(res.error, true);
            else this.flash('Pushed data/' + this.selectedPath + '.json — hard refresh in a minute.');
        },
        async saveList(toGithub) {
            var order = this.listTextRaw.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
            this.listOrder = order;
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
            else this.flash('Pushed data/_list.json');
        },
        buildEditorsFromUsers() {
            var fromUsers = staffFromUsers();
            if (fromUsers.length) {
                this.editors = fromUsers;
                this.editorsTextRaw = JSON.stringify(fromUsers, null, 4);
            } else {
                this.flash('No staff users yet. Register akirraaw / assign roles first.', true);
            }
        },
        async saveEditors(toGithub) {
            var data;
            try {
                data = JSON.parse(this.editorsTextRaw);
            } catch (e) {
                this.flash('Editors JSON is invalid.', true);
                return;
            }
            this.editors = data;
            var text = JSON.stringify(data, null, 4);
            if (!toGithub) {
                downloadJson('_editors.json', data);
                this.flash('Downloaded _editors.json');
                return;
            }
            this.saving = true;
            var res = await githubPutFile('data/_editors.json', text, 'Admin: update editors');
            this.saving = false;
            if (!res.ok) this.flash(res.error, true);
            else this.flash('Pushed data/_editors.json');
        },
        assignRole() {
            var res = setUserRole(this.roleUser, this.rolePick);
            if (!res.ok) this.flash(res.error, true);
            else {
                this.flash('Updated ' + this.roleUser + ' → ' + this.rolePick);
                this.refreshUsers();
            }
        },
        loadPerms() {
            var users = getUsers();
            var name = this.permsEditUser.trim().toLowerCase();
            var found = users.find(function (u) {
                return u.username.toLowerCase() === name;
            });
            if (!found) {
                this.flash('User not found.', true);
                return;
            }
            if (found.role !== 'admin') {
                this.flash('That user is not an admin. Set role to admin first.', true);
                return;
            }
            this.permsDraft = Object.assign(
                { editLevels: true, editList: true, editEditors: true, manageUsers: false },
                found.permissions || {},
            );
            this.flash('Loaded permissions for ' + found.username);
        },
        savePerms() {
            var res = setUserRole(this.permsEditUser, 'admin', Object.assign({}, this.permsDraft));
            if (!res.ok) this.flash(res.error, true);
            else this.flash('Permissions saved.');
        },
        saveToken() {
            setGithubToken(this.ghToken);
            this.flash(this.ghToken ? 'Token saved in this browser.' : 'Token cleared.');
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
        // need at least one permission
        if (!can('editLevels') && !can('editList') && !can('editEditors') && !can('manageUsers') && !isOwner()) {
            this.$router.replace('/');
            return;
        }
        this.ghToken = getGithubToken();
        var list = (await fetchList()) || [];
        this.list = list;
        this.listOrder = list
            .map(function (pair) {
                return pair[0] ? pair[0].path : pair[1];
            })
            .filter(Boolean);
        this.listTextRaw = this.listOrder.join('\n');
        this.editors = (await fetchEditors()) || [];
        this.editorsTextRaw = JSON.stringify(this.editors, null, 4);
        this.refreshUsers();
        if (this.canLevels) this.tab = 'levels';
        else if (this.canList) this.tab = 'list';
        else if (this.canUsers) this.tab = 'users';
        else this.tab = 'settings';
        this.loading = false;
    },
};
