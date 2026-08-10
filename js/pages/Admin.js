import {
    auth,
    can,
    isOwner,
    isStaff,
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
    }),
    computed: {
        isOwner() {
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
    },
    template: `
        <main v-if="loading" class="page-shell"><Spinner /></main>
        <main v-else class="page-admin page-shell">
            <aside class="admin-side">
                <p class="admin-user">{{ auth.user && auth.user.username }} · {{ auth.user && auth.user.role }}</p>
                <button type="button" class="admin-tab" :class="{ active: tab === 'levels' }" @click="tab = 'levels'" v-if="canLevels">Levels</button>
                <button type="button" class="admin-tab" :class="{ active: tab === 'list' }" @click="tab = 'list'" v-if="canList">List order</button>
                <button type="button" class="admin-tab" :class="{ active: tab === 'editors' }" @click="tab = 'editors'" v-if="canEditors">Editors JSON</button>
                <button type="button" class="admin-tab" :class="{ active: tab === 'users' }" @click="refreshUsers(); tab = 'users'" v-if="canUsers">Users & roles</button>
                <button type="button" class="admin-tab" :class="{ active: tab === 'settings' }" @click="tab = 'settings'" v-if="isOwner">Settings</button>
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
                        <label>Creators (comma) <input :value="(draft.creators||[]).join(', ')" @input="draft.creators = $event.target.value.split(',').map(s=>s.trim()).filter(Boolean)" /></label>
                        <label>Verifier <input v-model="draft.verifier" /></label>
                        <label>Verification URL <input v-model="draft.verification" /></label>
                        <label>Password <input v-model="draft.password" /></label>
                        <label>Length <input v-model="draft.length" placeholder="1m 12s" /></label>
                        <label>Creation date <input v-model="draft.creationDate" placeholder="3/14/2025" /></label>
                        <label>Percent to qualify <input v-model.number="draft.percentToQualify" type="number" /></label>
                        <label>Tags (comma) <input :value="(draft.tags||[]).join(', ')" @input="draft.tags = $event.target.value.split(',').map(s=>s.trim()).filter(Boolean)" /></label>
                        <div class="admin-actions">
                            <button type="button" class="auth-btn" :disabled="saving" @click="saveLevel(true)">Save to GitHub</button>
                            <button type="button" class="auth-btn auth-btn--ghost" @click="saveLevel(false)">Download JSON</button>
                        </div>
                    </template>
                </div>

                <div v-if="tab === 'list' && canList" class="admin-panel">
                    <h2>List order (_list.json)</h2>
                    <p class="admin-hint">One filename per line (no .json). Top = hardest.</p>
                    <textarea class="admin-ta" v-model="listText" rows="12"></textarea>
                    <div class="admin-actions">
                        <button type="button" class="auth-btn" :disabled="saving" @click="saveList(true)">Save to GitHub</button>
                        <button type="button" class="auth-btn auth-btn--ghost" @click="saveList(false)">Download JSON</button>
                    </div>
                </div>

                <div v-if="tab === 'editors' && canEditors" class="admin-panel">
                    <h2>Editors (_editors.json)</h2>
                    <p class="admin-hint">Synced from staff roles when you click “Build from users”, or edit JSON manually.</p>
                    <div class="admin-actions" style="margin-bottom:0.75rem">
                        <button type="button" class="auth-btn auth-btn--ghost" @click="buildEditorsFromUsers">Build from users</button>
                    </div>
                    <textarea class="admin-ta" v-model="editorsText" rows="14"></textarea>
                    <div class="admin-actions">
                        <button type="button" class="auth-btn" :disabled="saving" @click="saveEditors(true)">Save to GitHub</button>
                        <button type="button" class="auth-btn auth-btn--ghost" @click="saveEditors(false)">Download JSON</button>
                    </div>
                </div>

                <div v-if="tab === 'users' && canUsers" class="admin-panel">
                    <h2>Users & roles</h2>
                    <p class="admin-hint">
                        Accounts are stored in <strong>this browser</strong> only (GitHub Pages has no server).
                        Register on this device first, then assign roles here. Owner username is always <code>akirraaw</code>.
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

                    <template v-if="isOwner">
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

                <div v-if="tab === 'settings' && isOwner" class="admin-panel">
                    <h2>GitHub save token</h2>
                    <p class="admin-hint">
                        Create a fine-grained PAT with Contents: Read & write on <code>ziyyhhk/broken-team-demonlist</code>.
                        Token stays in your browser only — never commit it.
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
    computed: {
        listText: {
            get() {
                return this.listOrder.join('\n');
            },
            set(v) {
                this.listOrder = String(v)
                    .split('\n')
                    .map((s) => s.trim())
                    .filter(Boolean);
            },
        },
        editorsText: {
            get() {
                return JSON.stringify(this.editors, null, 4);
            },
            set(v) {
                try {
                    this.editors = JSON.parse(v);
                    this.err = '';
                } catch (e) {
                    this.err = 'Editors JSON is invalid.';
                }
            },
        },
    },
    methods: {
        flash(msg, isErr) {
            this.msg = isErr ? '' : msg;
            this.err = isErr ? msg : '';
            var self = this;
            setTimeout(function () {
                self.msg = '';
                self.err = '';
            }, 4000);
        },
        onLogout() {
            logout();
            this.$router.push('/login');
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
            delete this.draft.path;
            delete this.draft.records; // keep records from original on save
            this._recordsBackup = found[0].records || [];
        },
        async saveLevel(toGithub) {
            if (!this.draft || !this.selectedPath) return;
            var payload = Object.assign({}, this.draft, {
                records: this._recordsBackup || this.draft.records || [],
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
            else this.flash('Pushed data/' + this.selectedPath + '.json — hard refresh the site in a minute.');
        },
        async saveList(toGithub) {
            var text = JSON.stringify(this.listOrder, null, 4);
            if (!toGithub) {
                downloadJson('_list.json', this.listOrder);
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
            if (fromUsers.length) this.editors = fromUsers;
            else this.flash('No staff users yet. Register akirraaw / assign roles first.', true);
        },
        async saveEditors(toGithub) {
            var text = JSON.stringify(this.editors, null, 4);
            if (!toGithub) {
                downloadJson('_editors.json', this.editors);
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
            var found = users.find(
                (u) => u.username.toLowerCase() === this.permsEditUser.trim().toLowerCase(),
            );
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
        if (!auth.user || !isStaff() || (auth.user.role === 'helper')) {
            // helpers can view credits only; admin panel needs admin/owner
            if (!auth.user || !can('editLevels') && !can('editList') && !can('editEditors') && !can('manageUsers') && !isOwner()) {
                this.$router.replace('/login');
                return;
            }
        }
        this.ghToken = getGithubToken();
        const list = (await fetchList()) || [];
        this.list = list;
        this.listOrder = list.map(function (pair) {
            return pair[0] ? pair[0].path : pair[1];
        }).filter(Boolean);
        this.editors = (await fetchEditors()) || [];
        this.refreshUsers();
        this.loading = false;
    },
};
