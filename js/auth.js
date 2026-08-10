/**
 * Auth for static GitHub Pages.
 * Accounts sync through data/_users.json so staff can log in from any PC.
 * ONLY username "akirraaw" is owner.
 */

const USERS_KEY = 'broken_auth_users';
const SESSION_KEY = 'broken_auth_session';
const GH_TOKEN_KEY = 'broken_gh_token';
const GH_REPO = 'ziyyhhk/broken-team-demonlist';
const OWNER_NAME = 'akirraaw';
const USERS_PATH = 'data/_users.json';

const DEFAULT_ADMIN_PERMS = {
    editLevels: true,
    editList: true,
    editEditors: true,
    manageUsers: false,
};

const NO_PERMS = {
    editLevels: false,
    editList: false,
    editEditors: false,
    manageUsers: false,
};

export const auth = Vue.reactive({
    user: null,
    ready: false,
});

function loadLocalUsers() {
    try {
        const raw = localStorage.getItem(USERS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function saveLocalUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

async function fetchRemoteUsers() {
    try {
        const url = './data/_users.json?t=' + Date.now();
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : [];
    } catch (e) {
        return [];
    }
}

export async function loadUsers() {
    const remote = await fetchRemoteUsers();
    const local = loadLocalUsers();
    const finalMap = new Map();
    local.forEach((u) => {
        if (u && u.username) finalMap.set(u.username.toLowerCase(), u);
    });
    remote.forEach((u) => {
        if (u && u.username) finalMap.set(u.username.toLowerCase(), u);
    });
    const finalUsers = Array.from(finalMap.values());
    saveLocalUsers(finalUsers);
    return finalUsers;
}

function loadUsersSync() {
    return loadLocalUsers();
}

async function hashPassword(password, salt) {
    const enc = new TextEncoder();
    const data = enc.encode(salt + '::' + password);
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

function normalizeUsername(username) {
    return String(username || '').trim();
}

function isOwnerName(username) {
    return normalizeUsername(username).toLowerCase() === OWNER_NAME;
}

function publicUserPayload(users) {
    return users.map((u) => ({
        username: u.username,
        salt: u.salt,
        hash: u.hash,
        role: u.role,
        permissions: u.permissions || NO_PERMS,
        createdAt: u.createdAt || new Date().toISOString(),
    }));
}

export async function syncUsersToGithub(users) {
    const token = getGithubToken();
    if (!token) {
        return {
            ok: false,
            error: 'No GitHub token. Settings → paste token, then sync again.',
        };
    }
    const text = JSON.stringify(publicUserPayload(users), null, 4);
    return githubPutFile(USERS_PATH, text, 'Admin: sync staff accounts');
}

export async function register(username, password, options) {
    options = options || {};
    username = normalizeUsername(username);
    password = String(password || '');

    if (username.length < 3) return { ok: false, error: 'Username must be at least 3 characters.' };
    if (password.length < 4) return { ok: false, error: 'Password must be at least 4 characters.' };
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return { ok: false, error: 'Username: letters, numbers, underscore only.' };
    }

    const users = await loadUsers();
    if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
        return { ok: false, error: 'That username is already taken. Pick another.' };
    }

    const role = isOwnerName(username) ? 'owner' : options.role || 'member';
    if (role === 'owner' && !isOwnerName(username)) {
        return { ok: false, error: 'Only akirraaw can be owner.' };
    }

    const salt = crypto.randomUUID();
    const hash = await hashPassword(password, salt);
    const permissions =
        role === 'owner'
            ? { ...DEFAULT_ADMIN_PERMS, manageUsers: true }
            : role === 'admin'
              ? { ...DEFAULT_ADMIN_PERMS }
              : { ...NO_PERMS };

    const user = {
        username,
        salt,
        hash,
        role,
        permissions,
        createdAt: new Date().toISOString(),
    };
    users.push(user);
    saveLocalUsers(users);

    if (options.sync !== false) {
        await syncUsersToGithub(users);
    }

    if (!options.skipLogin) {
        const session = {
            username: user.username,
            role: user.role,
            permissions: user.permissions,
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        auth.user = session;
        return { ok: true, user: session, synced: !!getGithubToken() };
    }
    return { ok: true, user: { username: user.username, role: user.role }, synced: !!getGithubToken() };
}

export async function createAccount(username, password, role) {
    role = role || 'member';
    if (role === 'owner') return { ok: false, error: 'Cannot create another owner.' };
    if (!['member', 'helper', 'admin'].includes(role)) {
        return { ok: false, error: 'Invalid role.' };
    }
    if (isOwnerName(username)) {
        return { ok: false, error: 'That username is reserved for the site owner.' };
    }
    return register(username, password, { role, skipLogin: true, sync: true });
}

export async function login(username, password) {
    username = normalizeUsername(username);
    password = String(password || '');

    const users = await loadUsers();
    const found = users.find((u) => u.username.toLowerCase() === username.toLowerCase());
    if (!found) {
        return {
            ok: false,
            error: 'Wrong username or password. Staff accounts must be created + synced by the owner first.',
        };
    }

    const hash = await hashPassword(password, found.salt);
    if (hash !== found.hash) {
        return { ok: false, error: 'Wrong username or password.' };
    }

    if (isOwnerName(found.username)) {
        found.role = 'owner';
        found.permissions = { ...DEFAULT_ADMIN_PERMS, manageUsers: true };
        saveLocalUsers(users);
    } else if (found.role === 'owner') {
        found.role = 'member';
        found.permissions = { ...NO_PERMS };
        saveLocalUsers(users);
    }

    const session = {
        username: found.username,
        role: found.role,
        permissions: found.permissions || NO_PERMS,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    auth.user = session;
    return { ok: true, user: session };
}

export function logout() {
    localStorage.removeItem(SESSION_KEY);
    auth.user = null;
}

export function restoreSession() {
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) {
            auth.user = null;
            auth.ready = true;
            return;
        }
        const session = JSON.parse(raw);
        if (session && session.username) {
            if (isOwnerName(session.username)) session.role = 'owner';
            auth.user = session;
        } else {
            auth.user = null;
        }
    } catch (e) {
        auth.user = null;
    }
    auth.ready = true;

    loadUsers().then((users) => {
        if (!auth.user) return;
        const found = users.find(
            (u) => u.username.toLowerCase() === auth.user.username.toLowerCase(),
        );
        if (!found) return;
        if (isOwnerName(found.username)) found.role = 'owner';
        auth.user.role = found.role;
        auth.user.permissions = found.permissions || NO_PERMS;
        localStorage.setItem(SESSION_KEY, JSON.stringify(auth.user));
    });
}

export function getUsers() {
    return loadUsersSync();
}

export async function getUsersAsync() {
    return loadUsers();
}

export function isLoggedIn() {
    return !!auth.user;
}

export function isOwner() {
    return !!(auth.user && auth.user.role === 'owner' && isOwnerName(auth.user.username));
}

export function isStaff() {
    return !!(auth.user && ['owner', 'admin', 'helper'].includes(auth.user.role));
}

export function can(perm) {
    if (!auth.user) return false;
    if (isOwner()) return true;
    if (auth.user.role === 'admin') {
        const p = auth.user.permissions || DEFAULT_ADMIN_PERMS;
        return !!p[perm];
    }
    return false;
}

export async function setUserRole(username, role, permissions) {
    username = normalizeUsername(username);
    if (role === 'owner') return { ok: false, error: 'Cannot promote anyone to owner.' };
    if (!['member', 'helper', 'admin'].includes(role)) {
        return { ok: false, error: 'Invalid role.' };
    }
    if (isOwnerName(username)) {
        return { ok: false, error: 'Cannot change the owner account.' };
    }

    const users = await loadUsers();
    const found = users.find((u) => u.username.toLowerCase() === username.toLowerCase());
    if (!found) return { ok: false, error: 'User not found. Create their account first.' };

    found.role = role;
    if (permissions) found.permissions = permissions;
    else if (role === 'admin') found.permissions = { ...DEFAULT_ADMIN_PERMS };
    else found.permissions = { ...NO_PERMS };
    saveLocalUsers(users);

    if (auth.user && auth.user.username.toLowerCase() === username.toLowerCase()) {
        auth.user.role = found.role;
        auth.user.permissions = found.permissions;
        localStorage.setItem(SESSION_KEY, JSON.stringify(auth.user));
    }

    const sync = await syncUsersToGithub(users);
    if (!sync.ok) return { ok: true, warning: sync.error };
    return { ok: true };
}

export function staffFromUsers() {
    return loadUsersSync()
        .filter((u) => ['owner', 'admin', 'helper'].includes(u.role))
        .map((u) => ({
            role: u.role,
            name: u.username,
            link: '',
        }));
}

export function getGithubToken() {
    return localStorage.getItem(GH_TOKEN_KEY) || '';
}

export function setGithubToken(token) {
    if (!token) localStorage.removeItem(GH_TOKEN_KEY);
    else localStorage.setItem(GH_TOKEN_KEY, token.trim());
}

/** List repo collaborators (needs token with metadata/members read). */
export async function fetchGithubCollaborators() {
    const token = getGithubToken();
    if (!token) return { ok: false, error: 'No token.', list: [] };

    const api = 'https://api.github.com/repos/' + GH_REPO + '/collaborators?per_page=100';
    try {
        const res = await fetch(api, {
            headers: {
                Authorization: 'Bearer ' + token,
                Accept: 'application/vnd.github+json',
            },
        });
        if (!res.ok) {
            const t = await res.text();
            return { ok: false, error: 'GitHub ' + res.status + ': ' + t.slice(0, 120), list: [] };
        }
        const data = await res.json();
        const list = (data || []).map((c) => ({
            login: c.login,
            avatar: c.avatar_url,
            admin: !!c.permissions && c.permissions.admin,
            html_url: c.html_url,
        }));
        return { ok: true, list };
    } catch (e) {
        return { ok: false, error: String(e), list: [] };
    }
}

export async function githubPutFile(path, content, message) {
    const token = getGithubToken();
    if (!token) return { ok: false, error: 'No GitHub token set. Add one in Admin → Settings.' };

    const api = 'https://api.github.com/repos/' + GH_REPO + '/contents/' + path;
    let sha;
    try {
        const cur = await fetch(api, {
            headers: {
                Authorization: 'Bearer ' + token,
                Accept: 'application/vnd.github+json',
            },
        });
        if (cur.ok) {
            const j = await cur.json();
            sha = j.sha;
        }
    } catch (e) {
        /* new file */
    }

    const body = {
        message: message || ('Update ' + path + ' via Broken List admin'),
        content: btoa(unescape(encodeURIComponent(content))),
        branch: 'main',
    };
    if (sha) body.sha = sha;

    const res = await fetch(api, {
        method: 'PUT',
        headers: {
            Authorization: 'Bearer ' + token,
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const err = await res.text();
        return { ok: false, error: 'GitHub error: ' + res.status + ' ' + err.slice(0, 200) };
    }
    return { ok: true };
}

export function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 4)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
}

restoreSession();
