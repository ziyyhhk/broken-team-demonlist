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
  localStorage.setItem(LOCAL_KEY, JSON.stringify(list.slice(0, 80)));
}

function uid() {
  return 'sub_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

export default {
  components: { Spinner },
  data: () => ({
    auth,
    loading: true,
    submitting: false,
    mode: 'classic',
    levels: [],
    form: {
      player: '',
      levelPath: '',
      levelName: '',
      percent: 100,
      link: '',
      device: '',
      modMenu: '',
      customId: '',
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
      const opts = (this.levels || [])
        .filter((p) => p && p[0] && p[0].path)
        .map((p, i) => ({
          path: p[0].path,
          name: p[0].name || p[0].path,
          rank: i + 1,
        }));
      return opts;
    },
    combinedPrev() {
      const map = new Map();
      (this.remoteSubs || []).forEach((s) => {
        if (s && s.id) map.set(s.id, s);
      });
      (this.localSubs || []).forEach((s) => {
        if (s && s.id && !map.has(s.id)) map.set(s.id, s);
      });
      let list = Array.from(map.values());
      const player = (this.auth.user && this.auth.user.username) || (this.form.player || '').trim();
      if (player) {
        const me = player.toLowerCase();
        list = list.filter((s) => String(s.player || '').toLowerCase() === me);
      } else {
        list = this.localSubs.slice();
      }
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
        list = list.filter((s) => (s.status || 'pending') === this.filterStatus);
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
          <div class="submit-field" v-if="!auth.user">
            <label>Player name <span class="req">*</span></label>
            <input v-model="form.player" placeholder="Your in-game / list name" maxlength="40" />
          </div>
          <div class="submit-field" v-else>
            <label>Player</label>
            <input :value="auth.user.username" disabled />
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

          <div class="submit-field submit-field--center">
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
            <label>Custom ID</label>
            <input v-model="form.customId" placeholder="ID of the level copy used" />
          </div>

          <div class="submit-field">
            <label>Raw Footage</label>
            <input v-model="form.rawFootage" type="url" placeholder="Link to your raw footage" />
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
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
          <div class="submit-prev-nav">
            <button type="button" :disabled="page<=0" @click="page--">Previous</button>
            <button type="button" :disabled="page>=maxPage" @click="page++">Next</button>
          </div>
        </div>
        <p class="submit-prev-empty" v-if="!pagedPrev.length">No submissions found.</p>
        <ul class="submit-prev-list" v-else>
          <li v-for="s in pagedPrev" :key="s.id">
            <span>{{ s.levelName || s.levelPath || '—' }}</span>
            <span>{{ s.device || '—' }}</span>
            <span class="submit-status" :class="'submit-status--'+(s.status||'pending')">{{ s.status || 'pending' }}</span>
            <span style="font-size:0.75rem;color:var(--color-muted)">{{ formatDate(s.createdAt) }}</span>
          </li>
        </ul>
      </div>
    </div>

    <aside class="submit-rules-side">
      <div class="submit-rules-card">
        <h2>Completion rules</h2>
        <p class="submit-rules-intro">Your video has to prove the run is real. Missing any of this usually means a deny.</p>

        <div class="submit-rules-block">
          <h3><span class="submit-rules-num">2</span> Record videos</h3>
          <ol>
            <li>No hacks. Noclip, speedhacks, and illegal physics mods are out.</li>
            <li>Only 240 TPS is allowed. Below 240 or above 240 is invalid. TPS bypass must land on exactly 240.</li>
            <li>Play the exact listed level (correct ID / version).</li>
            <li>Audio needs click or tap sounds, or clear input audio.</li>
            <li>Show a previous attempt and the full death before the completion (skip only on a true first attempt).</li>
            <li>Show your total attempt count on screen so it is readable.</li>
            <li>Show CPS and a cheat indicator if your mod menu can display them.</li>
            <li>The run must reach the Level Complete screen.</li>
            <li>No bug routes or secret routes unless that path is the listed one.</li>
            <li>No easy modes, start-pos completions, or editor playtests as records.</li>
            <li>One continuous take is better. Heavy cuts around death to clear will get questioned.</li>
            <li>Mobile is fine if the video still shows the required info.</li>
          </ol>
        </div>

        <div class="submit-rules-block">
          <h3><span class="submit-rules-num">3</span> Allowed tools</h3>
          <ol>
            <li>CBF (Click Between Frames) — allowed.</li>
            <li>Click on Steps — allowed.</li>
            <li>TPS / FPS bypass — allowed at exactly 240 TPS only. Under or over 240 is not accepted.</li>
            <li>Mod menus for CPS, attempts, indicators, or recording helpers — allowed.</li>
            <li>Anything that changes physics beyond CBF / Click on Steps / locked 240 TPS — not allowed.</li>
          </ol>
        </div>

        <router-link class="submit-rules-link" to="/rules">Full rules →</router-link>
      </div>
    </aside>
  </div>
  <div v-else class="spinner"><Spinner /></div>
</main>
`,
  methods: {
    devices: () => DEVICES,
    modMenus: () => MOD_MENUS,
    formatDate(iso) {
      if (!iso) return '—';
      try {
        const d = new Date(iso);
        return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
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
    validate() {
      const player = (this.auth.user && this.auth.user.username) || (this.form.player || '').trim();
      if (!player || player.length < 2) return 'Player name is required.';
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
        const player = (this.auth.user && this.auth.user.username) || (this.form.player || '').trim();
        const entry = {
          id: uid(),
          status: 'pending',
          mode: this.mode,
          player,
          levelPath: this.form.levelPath,
          levelName: this.resolveLevelName(),
          percent: Number(this.form.percent) || 100,
          link: (this.form.link || '').trim(),
          device: this.form.device,
          modMenu: this.form.modMenu,
          customId: (this.form.customId || '').trim(),
          rawFootage: (this.form.rawFootage || '').trim(),
          notes: (this.form.notes || '').trim(),
          createdAt: new Date().toISOString(),
        };

        // Always keep a local copy for Previous Submissions
        const local = loadLocalSubs();
        local.unshift(entry);
        saveLocalSubs(local);
        this.localSubs = local;

        // Notify staff via Discord if webhook is available
        let discordOk = false;
        const webhook =
          (this.submissionsWebhook || '').trim() ||
          (typeof localStorage !== 'undefined' ? localStorage.getItem(WEBHOOK_KEY) || '' : '');
        if (webhook) {
          const lines = [
            '**New record submission** (`' + entry.id + '`)',
            '**Player:** ' + entry.player,
            '**Level:** ' + entry.levelName + (entry.levelPath === '__verifying__' ? ' _(verifying)_' : ''),
            '**%:** ' + entry.percent,
            '**Device:** ' + entry.device,
            '**Mod menu:** ' + entry.modMenu,
            '**Video:** ' + entry.link,
          ];
          if (entry.customId) lines.push('**Custom ID:** ' + entry.customId);
          if (entry.rawFootage) lines.push('**Raw:** ' + entry.rawFootage);
          if (entry.notes) lines.push('**Notes:** ' + entry.notes);
          lines.push('_Mode: ' + entry.mode + '_');
          const r = await sendDiscordWebhook(webhook, lines.join('\n'));
          discordOk = !!(r && r.ok);
        }

        // If a GitHub token is present (staff testing), also push into repo queue
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
          } catch (e) {
            /* ignore */
          }
        }

        if (repoOk) {
          this.flash('Submitted. Staff can see it in Admin → Submissions.');
        } else if (discordOk) {
          this.flash('Submitted. Staff were notified on Discord. Status: pending.');
        } else {
          this.flash(
            'Saved on this device. Paste a Discord webhook in Admin → Settings (or Player ID) so staff get notified, or ask staff to log the submission.',
          );
        }

        // Reset most fields, keep player
        this.form.levelPath = '';
        this.form.levelName = '';
        this.form.link = '';
        this.form.device = '';
        this.form.modMenu = '';
        this.form.customId = '';
        this.form.rawFootage = '';
        this.form.notes = '';
        this.form.percent = 100;
      } finally {
        this.submitting = false;
      }
    },
  },
  async mounted() {
    this.localSubs = loadLocalSubs();
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
      }
    } catch (e) {
      this.remoteSubs = [];
    }
    if (this.auth.user) this.form.player = this.auth.user.username;
    this.loading = false;
  },
};
