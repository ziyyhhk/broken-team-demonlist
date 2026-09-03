import { fetchList, fetchConfig } from '../content.js';
import { auth, getGithubToken, githubPutFile } from '../auth.js';
import Spinner from '../components/Spinner.js';
import { WEBHOOK_KEY, sendDiscordWebhook } from '../discordAnnounce.js';

const LOCAL_KEY = 'broken_my_submissions';
const PAGE_SIZE = 8;

const DEVICES = [
  { value: 'PC', label: 'PC' },
  { value: 'Mobile', label: 'Mobile' },
  { value: 'Laptop', label: 'Laptop' },
  { value: 'Fridge', label: 'Fridge (joke — cannot choose)', disabled: true },
  { value: 'Microwave', label: 'Microwave (joke — cannot choose)', disabled: true },
];

const MOD_MENUS = [
  'Mega Hack v9',
  'Mega Hack v8',
  'Mega Hack v7',
  'Mega Hack v6',
  'QOLMod',
  'Eclipse',
  'iCreate',
  'Prism Menu',
  'GDHM',
  'GDH',
  'Other (specify in notes)',
  'None / vanilla',
];

function loadLocalSubs() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function saveLocalSubs(list) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify((list || []).slice(0, 80)));
}

function uid() {
  return 'sub_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function statusLabel(status) {
  const s = (status || 'pending').toLowerCase();
  if (s === 'approved' || s === 'accepted') return 'accepted';
  if (s === 'rejected') return 'rejected';
  return 'pending';
}

function norm(s) {
  return String(s || '').trim().toLowerCase();
}

function safeHref(url) {
  const u = String(url || '').trim();
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  if (/^[\w.-]+\.[a-z]{2,}/i.test(u) && !/\s/.test(u)) return 'https://' + u;
  return '';
}

/** Update local rows with remote status; never drop local entries. */
function syncLocalWithRemote(local, remote) {
  const byId = new Map();
  (remote || []).forEach((s) => {
    if (s && s.id) byId.set(s.id, s);
  });

  const next = (local || []).map((s) => {
    if (!s) return s;
    if (s.id && byId.has(s.id)) {
      const r = byId.get(s.id);
      return Object.assign({}, s, {
        status: r.status || s.status,
        resolvedAt: r.resolvedAt || s.resolvedAt,
        link: s.link || r.link,
        rawFootage: s.rawFootage || r.rawFootage,
      });
    }
    const match = (remote || []).find(
      (r) =>
        r &&
        norm(r.player) === norm(s.player) &&
        (norm(r.levelPath) === norm(s.levelPath) ||
          norm(r.levelName) === norm(s.levelName) ||
          norm(r.levelName) === norm(s.levelPath) ||
          norm(r.levelPath) === norm(s.levelName)) &&
        statusLabel(r.status) !== 'pending',
    );
    if (match) {
      return Object.assign({}, s, {
        status: match.status,
        resolvedAt: match.resolvedAt || s.resolvedAt,
      });
    }
    return s;
  });

  saveLocalSubs(next);
  return next;
}

export default {
  components: { Spinner },
  data: () => ({
    auth,
    loading: true,
    submitting: false,
    mode: 'classic',
    levels: [],
    devices: DEVICES,
    modMenus: MOD_MENUS,
    form: {
      player: '',
      discordUser: '',
      displayName: '',
      levelPath: '',
      levelName: '',
      percent: 100,
      link: '',
      device: '',
      modMenu: '',
      customId: '',
      length: '',
      attempts: '',
      rawFootage: '',
      notes: '',
    },
    msg: '',
    err: '',
    localSubs: [],
    remoteSubs: [],
    filterLevel: 'All',
    filterDevice: 'All',
    filterStatus: 'All',
    page: 0,
    submissionsWebhook: '',
  }),
  computed: {
    levelOptions() {
      return (this.levels || [])
        .filter((p) => p && p[0] && p[0].path)
        .map((p, i) => ({
          path: p[0].path,
          name: p[0].name || p[0].path,
          rank: i + 1,
        }));
    },
    combinedPrev() {
      const map = new Map();
      (this.remoteSubs || []).forEach((s) => {
        if (s && s.id) map.set(s.id, Object.assign({}, s));
      });
      (this.localSubs || []).forEach((s) => {
        if (!s || !s.id) return;
        if (map.has(s.id)) {
          const r = map.get(s.id);
          map.set(
            s.id,
            Object.assign({}, s, r, {
              status: r.status || s.status,
              resolvedAt: r.resolvedAt || s.resolvedAt,
              link: r.link || s.link,
              rawFootage: r.rawFootage || s.rawFootage,
            }),
          );
        } else {
          map.set(s.id, s);
        }
      });
      let list = Array.from(map.values());

      if (this.filterLevel !== 'All') {
        list = list.filter(
          (s) =>
            s.levelPath === this.filterLevel ||
            String(s.levelName || '').toLowerCase() === String(this.filterLevel).toLowerCase(),
        );
      }
      if (this.filterDevice !== 'All') {
        list = list.filter((s) => s.device === this.filterDevice);
      }
      if (this.filterStatus !== 'All') {
        list = list.filter((s) => statusLabel(s.status) === this.filterStatus);
      }
      list.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
      return list;
    },
    pagedPrev() {
      const start = this.page * PAGE_SIZE;
      return this.combinedPrev.slice(start, start + PAGE_SIZE);
    },
    maxPage() {
      return Math.max(0, Math.ceil(this.combinedPrev.length / PAGE_SIZE) - 1);
    },
  },
  watch: {
    filterLevel() {
      this.page = 0;
    },
    filterDevice() {
      this.page = 0;
    },
    filterStatus() {
      this.page = 0;
    },
  },
  template: `
<main class="page-submit page-shell">
  <div class="submit-wrap" v-if="!loading">
    <div class="submit-main">
      <div class="submit-card">
        <div class="submit-tabs">
          <button type="button" class="submit-tab" :class="{ active: mode==='classic' }" @click="mode='classic'">Classic</button>
          <button type="button" class="submit-tab" :class="{ active: mode==='platformer' }" @click="mode='platformer'">Platformer</button>
        </div>

        <p class="submit-flash submit-flash--ok" v-if="msg">{{ msg }}</p>
        <p class="submit-flash submit-flash--err" v-if="err">{{ err }}</p>

        <div class="submit-grid">
          <div class="submit-field">
            <label>Player name <span class="req">*</span></label>
            <input v-model="form.player" placeholder="Name on the list" maxlength="40" autocomplete="off" />
          </div>

          <div class="submit-field">
            <label>Discord username <span class="req">*</span></label>
            <input v-model="form.discordUser" placeholder="e.g. akirraaw" maxlength="40" autocomplete="off" />
          </div>

          <div class="submit-field">
            <label>Display name</label>
            <input v-model="form.displayName" placeholder="Discord display name (optional)" maxlength="40" autocomplete="off" />
          </div>

          <div class="submit-field">
            <label>Level <span class="req">*</span></label>
            <select v-model="form.levelPath">
              <option value="">Select a level</option>
              <option value="__verifying__">Verifying / not on list yet</option>
              <option v-for="lv in levelOptions" :key="lv.path" :value="lv.path">#{{ lv.rank }} — {{ lv.name }}</option>
            </select>
          </div>

          <div class="submit-field" v-if="form.levelPath==='__verifying__'">
            <label>Level name <span class="req">*</span></label>
            <input v-model="form.levelName" placeholder="Name of the level" />
          </div>

          <div class="submit-field">
            <label>Completion Link <span class="req">*</span></label>
            <input v-model="form.link" type="url" placeholder="Video link to your completion" />
          </div>

          <div class="submit-field">
            <label>Device <span class="req">*</span></label>
            <select v-model="form.device">
              <option value="">Select a device</option>
              <option v-for="d in devices" :key="d.value" :value="d.value" :disabled="d.disabled">{{ d.label }}</option>
            </select>
          </div>

          <div class="submit-field">
            <label>Mod Menu <span class="req">*</span></label>
            <select v-model="form.modMenu">
              <option value="">Select a mod menu</option>
              <option v-for="m in modMenus" :key="m" :value="m">{{ m }}</option>
            </select>
          </div>

          <div class="submit-field">
            <label>Percent</label>
            <input v-model.number="form.percent" type="number" min="1" max="100" />
          </div>

          <div class="submit-field">
            <label>Level length</label>
            <input v-model="form.length" placeholder="e.g. 1:12 or 72s" />
          </div>

          <div class="submit-field">
            <label>Total attempts</label>
            <input v-model="form.attempts" type="number" min="1" placeholder="Attempts on the level" />
          </div>

          <div class="submit-field">
            <label>Custom ID</label>
            <input v-model="form.customId" placeholder="ID of the level copy used" />
          </div>

          <div class="submit-field submit-field--full">
            <label>Raw footage <span class="opt">(optional — helps acceptance)</span></label>
            <input v-model="form.rawFootage" type="url" placeholder="Link to raw footage (not required, but raises chance of accept)" />
          </div>

          <div class="submit-field submit-field--full">
            <label>Additional Notes</label>
            <textarea v-model="form.notes" placeholder="Anything you'd like the staff to know"></textarea>
          </div>
        </div>

        <p class="submit-ack">
          By submitting this record, you acknowledge that it follows the
          <router-link to="/rules">submission guidelines</router-link>.
        </p>

        <button type="button" class="submit-btn" :disabled="submitting" @click="onSubmit">
          {{ submitting ? 'Submitting…' : 'Submit Record' }}
        </button>
      </div>

      <div class="submit-prev">
        <h2>Previous Submissions</h2>
        <div class="submit-prev-filters">
          <label>Level
            <select v-model="filterLevel">
              <option>All</option>
              <option value="__verifying__">Verifying / not on list</option>
              <option v-for="lv in levelOptions" :key="'f-'+lv.path" :value="lv.path">{{ lv.name }}</option>
            </select>
          </label>
          <label>Device
            <select v-model="filterDevice">
              <option>All</option>
              <option>PC</option>
              <option>Mobile</option>
              <option>Laptop</option>
            </select>
          </label>
          <label>Status
            <select v-model="filterStatus">
              <option>All</option>
              <option value="pending">pending</option>
              <option value="accepted">accepted</option>
              <option value="rejected">rejected</option>
            </select>
          </label>
          <div class="submit-prev-nav">
            <button type="button" @click="reloadSubs">Refresh</button>
            <button type="button" :disabled="page<=0" @click="page--">Previous</button>
            <button type="button" :disabled="page>=maxPage" @click="page++">Next</button>
          </div>
        </div>
        <p class="submit-prev-empty" v-if="!pagedPrev.length">No submissions found.</p>
        <ul class="submit-prev-list" v-else>
          <li v-for="s in pagedPrev" :key="s.id">
            <div class="submit-prev-row">
              <span>{{ s.levelName || s.levelPath || '—' }}</span>
              <span>{{ s.device || '—' }}</span>
              <span class="submit-status" :class="'submit-status--'+statusLabel(s.status)">{{ statusLabel(s.status) }}</span>
              <span style="font-size:0.75rem;color:var(--color-muted)">{{ formatDate(s.createdAt) }}</span>
            </div>
            <div class="submit-prev-links" v-if="s.link || s.rawFootage">
              <a v-if="linkHref(s.link)" :href="linkHref(s.link)" target="_blank" rel="noopener">Watch completion</a>
              <span v-else-if="s.link">Video: {{ s.link }}</span>
              <a v-if="linkHref(s.rawFootage)" :href="linkHref(s.rawFootage)" target="_blank" rel="noopener">Watch raw</a>
              <span v-else-if="s.rawFootage">Raw: {{ s.rawFootage }}</span>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <aside class="submit-rules-side">
      <div class="submit-rules-card">
        <h2>Completion rules</h2>
        <p class="submit-rules-intro">Video must prove the run is real. Missing items usually means a deny.</p>

        <div class="submit-rules-block">
          <h3><span class="submit-rules-num">1</span> Record videos</h3>
          <ul class="submit-rules-list">
            <li>No hacks, noclip, speedhacks, or illegal physics.</li>
            <li>Only <strong>240 TPS</strong> — under or over is invalid.</li>
            <li>Exact listed level (correct ID / version).</li>
            <li>Clicks / taps audible, or clear input audio.</li>
            <li>Previous attempt + full death before clear (skip only on true first attempt).</li>
            <li>Attempt count readable on screen.</li>
            <li>CPS + cheat indicator if your menu can show them.</li>
            <li>Must reach the Level Complete screen.</li>
            <li>No bug / secret routes unless that is the listed path.</li>
            <li>No easy mode, start-pos, or editor playtests.</li>
            <li>Prefer one continuous take; heavy cuts get questioned.</li>
            <li>Mobile is fine if required info is visible.</li>
          </ul>
        </div>

        <div class="submit-rules-block">
          <h3><span class="submit-rules-num">2</span> Allowed tools</h3>
          <ul class="submit-rules-list">
            <li><strong>CBF</strong> — allowed</li>
            <li><strong>Click on Steps</strong> — allowed</li>
            <li><strong>TPS / FPS bypass</strong> — only at exactly 240</li>
            <li>Mod menus for CPS, attempts, indicators, recording — allowed</li>
            <li>Anything that changes physics beyond CBF / Click on Steps / locked 240 — <strong>not allowed</strong></li>
          </ul>
        </div>

        <router-link class="submit-rules-link" to="/rules">Full rules →</router-link>
      </div>
    </aside>
  </div>
  <div v-else class="spinner"><Spinner /></div>
</main>
`,
  methods: {
    statusLabel,
    linkHref: safeHref,
    formatDate(iso) {
      if (!iso) return '—';
      try {
        return new Date(iso).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      } catch (e) {
        return iso;
      }
    },
    resolveLevelName() {
      if (this.form.levelPath === '__verifying__') return (this.form.levelName || '').trim();
      const found = this.levelOptions.find((l) => l.path === this.form.levelPath);
      return found ? found.name : this.form.levelPath;
    },
    flash(text, isErr) {
      if (isErr) {
        this.err = text;
        this.msg = '';
      } else {
        this.msg = text;
        this.err = '';
      }
      setTimeout(() => {
        this.msg = '';
        this.err = '';
      }, 6000);
    },
    async reloadSubs() {
      try {
        const res = await fetch('./data/_submissions.json?t=' + Date.now(), { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          this.remoteSubs = Array.isArray(data) ? data : [];
        }
      } catch (e) {}
      this.localSubs = syncLocalWithRemote(loadLocalSubs(), this.remoteSubs);
      this.flash('Status refreshed.');
    },
    validate() {
      const player = (this.form.player || '').trim();
      if (!player || player.length < 2) return 'Player name is required.';
      if (!(this.form.discordUser || '').trim()) return 'Discord username is required.';
      if (!this.form.levelPath) return 'Select a level.';
      if (this.form.levelPath === '__verifying__' && !(this.form.levelName || '').trim()) {
        return 'Enter the level name.';
      }
      if (!(this.form.link || '').trim()) return 'Completion video link is required.';
      if (!this.form.device || this.form.device === 'Fridge' || this.form.device === 'Microwave') {
        return 'Select a real device (PC, Mobile, or Laptop).';
      }
      if (!this.form.modMenu) return 'Select a mod menu.';
      const pct = Number(this.form.percent);
      if (!Number.isFinite(pct) || pct < 1 || pct > 100) return 'Percent must be 1–100.';
      return null;
    },
    async onSubmit() {
      const err = this.validate();
      if (err) {
        this.flash(err, true);
        return;
      }
      this.submitting = true;
      try {
        const player = (this.form.player || '').trim();
        const entry = {
          id: uid(),
          status: 'pending',
          mode: this.mode,
          player,
          discordUser: (this.form.discordUser || '').trim(),
          displayName: (this.form.displayName || '').trim(),
          levelPath: this.form.levelPath,
          levelName: this.resolveLevelName(),
          percent: Number(this.form.percent) || 100,
          link: (this.form.link || '').trim(),
          device: this.form.device,
          modMenu: this.form.modMenu,
          customId: (this.form.customId || '').trim(),
          length: (this.form.length || '').trim(),
          attempts: (this.form.attempts || '').toString().trim(),
          rawFootage: (this.form.rawFootage || '').trim(),
          notes: (this.form.notes || '').trim(),
          createdAt: new Date().toISOString(),
        };

        const local = loadLocalSubs();
        local.unshift(entry);
        saveLocalSubs(local);
        this.localSubs = local;

        let discordOk = false;
        const webhook =
          (this.submissionsWebhook || '').trim() ||
          (typeof localStorage !== 'undefined' ? localStorage.getItem(WEBHOOK_KEY) || '' : '');
        if (webhook) {
          const lines = [
            'New record submission (' + entry.id + ')',
            'Player: ' + entry.player,
            'Discord: ' + entry.discordUser + (entry.displayName ? ' (' + entry.displayName + ')' : ''),
            'Level: ' + entry.levelName + (entry.levelPath === '__verifying__' ? ' (verifying)' : ''),
            'Level path: ' + (entry.levelPath || ''),
            'Percent: ' + entry.percent,
            'Device: ' + entry.device,
            'Mod menu: ' + entry.modMenu,
            'Video: ' + entry.link,
          ];
          if (entry.length) lines.push('Length: ' + entry.length);
          if (entry.attempts) lines.push('Attempts: ' + entry.attempts);
          if (entry.customId) lines.push('Custom ID: ' + entry.customId);
          if (entry.rawFootage) lines.push('Raw: ' + entry.rawFootage);
          if (entry.notes) lines.push('Notes: ' + entry.notes);
          lines.push('Mode: ' + entry.mode);
          lines.push('Status: pending');
          const r = await sendDiscordWebhook(webhook, lines.join('\n'));
          discordOk = !!(r && r.ok);
        }

        let repoOk = false;
        if (getGithubToken()) {
          try {
            const res = await fetch('./data/_submissions.json?t=' + Date.now(), { cache: 'no-store' });
            let queue = [];
            if (res.ok) {
              const data = await res.json();
              queue = Array.isArray(data) ? data : [];
            }
            queue.unshift(entry);
            const put = await githubPutFile(
              'data/_submissions.json',
              JSON.stringify(queue, null, 4),
              'Submission: ' + entry.player + ' — ' + entry.levelName,
            );
            repoOk = !!(put && put.ok);
            if (repoOk) this.remoteSubs = queue;
          } catch (e) {}
        }

        if (repoOk) {
          this.flash('Submitted. Staff can see it in Admin → Submissions.');
        } else if (discordOk) {
          this.flash('Submitted. Staff were notified on Discord. Status: pending.');
        } else {
          this.flash('Saved on this device. Set a Discord webhook in Admin so staff get notified.');
        }

        this.form.levelPath = '';
        this.form.levelName = '';
        this.form.link = '';
        this.form.device = '';
        this.form.modMenu = '';
        this.form.customId = '';
        this.form.length = '';
        this.form.attempts = '';
        this.form.rawFootage = '';
        this.form.notes = '';
        this.form.percent = 100;
      } finally {
        this.submitting = false;
      }
    },
  },
  async mounted() {
    let local = loadLocalSubs();
    try {
      this.levels = (await fetchList()) || [];
    } catch (e) {
      this.levels = [];
    }
    try {
      const cfg = await fetchConfig();
      if (cfg && cfg.submissionsWebhook) this.submissionsWebhook = cfg.submissionsWebhook;
    } catch (e) {}
    try {
      const res = await fetch('./data/_submissions.json?t=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        this.remoteSubs = Array.isArray(data) ? data : [];
      } else {
        this.remoteSubs = [];
      }
    } catch (e) {
      this.remoteSubs = [];
    }
    local = syncLocalWithRemote(local, this.remoteSubs);
    this.localSubs = local;
    this.loading = false;
  },
};
