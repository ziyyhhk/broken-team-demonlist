/**
 * Admin panel = last good core (CDN) + Submissions tab + verification accept GUI.
 */
import Spinner from '../components/Spinner.js';
import { WEBHOOK_KEY, sendDiscordWebhook } from '../discordAnnounce.js';

const url =
  'https://cdn.jsdelivr.net/gh/ziyyhhk/broken-team-demonlist@01bf14bc226d2ebb59211f19cbef12d93a635f04/js/pages/Admin.js';

const mod = await import(/* @vite-ignore */ url);
const Base = mod.default;

function statusLabel(status) {
  const s = (status || 'pending').toLowerCase();
  if (s === 'approved' || s === 'accepted') return 'accepted';
  if (s === 'rejected') return 'rejected';
  return 'pending';
}

function slugifyPath(name) {
  const s = String(name || '')
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '')
    .replace(/^\d+/, '');
  return s || 'NewLevel' + Date.now().toString(36);
}

function injectExtras(BaseComp) {
  const baseData = BaseComp.data;
  const baseComputed = BaseComp.computed || {};
  const baseMethods = BaseComp.methods || {};
  let template = BaseComp.template || '';

  const sideNeedle =
    '<button type="button" class="admin-tab" :class="{ active: tab===\'settings\' }" @click="tab=\'settings\'" v-if="canToken">Settings</button>';
  const sideInsert =
    '<button type="button" class="admin-tab" :class="{ active: tab===\'submissions\' }" @click="openSubmissions" v-if="canLevels || canList">Submissions <span v-if="pendingSubs.length" class="admin-role-tag">{{ pendingSubs.length }}</span></button>\n' +
    sideNeedle;
  if (template.includes(sideNeedle)) {
    template = template.replace(sideNeedle, sideInsert);
  }

  const orderNeedle =
    '<button type="button" @click="moveToImpossible(i)">→ Imp</button>';
  const orderInsert =
    orderNeedle +
    '\n<button type="button" class="rec-del" title="Remove from list" @click="removeFromList(i)">X</button>';
  if (template.includes(orderNeedle) && !template.includes('removeFromList(i)')) {
    template = template.replace(orderNeedle, orderInsert);
  }

  const panelNeedle =
    '<div v-if="tab===\'settings\' && canToken" class="admin-panel"><h2>Settings</h2>';
  const panel =
    '<div v-if="tab===\'submissions\' && (canLevels || canList)" class="admin-panel admin-panel--wide">' +
    '<h2>Submissions</h2>' +
    '<p class="admin-hint">Accept verification submissions opens a form to create the level (name, length, verification video, etc.). Accept/Reject also posts to Discord.</p>' +
    '<div class="admin-actions" style="margin-bottom:0.75rem;flex-wrap:wrap;gap:0.5rem">' +
    '<button type="button" class="auth-btn" @click="showAddSub=!showAddSub">{{ showAddSub ? \'Hide\' : \'+ Log submission\' }}</button>' +
    '<button type="button" class="auth-btn auth-btn--ghost" @click="loadSubmissions">Reload</button>' +
    '<span class="admin-muted">{{ pendingSubs.length }} pending · {{ submissions.length }} total</span>' +
    '</div>' +
    '<div class="admin-row" style="margin-bottom:0.75rem;gap:0.4rem;flex-wrap:wrap">' +
    '<button type="button" class="auth-btn auth-btn--ghost" @click="subFilter=\'pending\'">pending</button>' +
    '<button type="button" class="auth-btn auth-btn--ghost" @click="subFilter=\'accepted\'">accepted</button>' +
    '<button type="button" class="auth-btn auth-btn--ghost" @click="subFilter=\'rejected\'">rejected</button>' +
    '<button type="button" class="auth-btn auth-btn--ghost" @click="subFilter=\'all\'">all</button>' +
    '</div>' +
    // verification create level form
    '<div class="admin-edit-card" v-if="verifyForm.open" style="margin-bottom:1rem;border:1px solid var(--color-primary)">' +
    '<h3 style="margin:0 0 0.5rem">Accept verification — create level</h3>' +
    '<p class="admin-hint">Fill the level details, then create &amp; accept. Verifier record uses the submission player + video.</p>' +
    '<div class="admin-grid">' +
    '<label>Level name * <input class="admin-input" v-model="verifyForm.name" @input="onVerifyNameInput" /></label>' +
    '<label>File path * <input class="admin-input" v-model="verifyForm.path" placeholder="NoSpacesPath" /></label>' +
    '<label>GD level ID <input class="admin-input" type="number" v-model.number="verifyForm.id" /></label>' +
    '<label>Author <input class="admin-input" v-model="verifyForm.author" /></label>' +
    '<label>Verifier <input class="admin-input" v-model="verifyForm.verifier" /></label>' +
    '<label>Length <input class="admin-input" v-model="verifyForm.length" placeholder="e.g. 1:12 or 40s" /></label>' +
    '<label class="admin-grid--full">Verification video * <input class="admin-input" v-model="verifyForm.verification" /></label>' +
    '<label>Password <input class="admin-input" v-model="verifyForm.password" /></label>' +
    '<label>% to qualify <input class="admin-input" type="number" min="1" max="100" v-model.number="verifyForm.percentToQualify" /></label>' +
    '<label>List position <input class="admin-input" type="number" min="1" v-model.number="verifyForm.rank" placeholder="1 = top" /></label>' +
    '</div>' +
    '<div class="admin-actions" style="margin-top:0.75rem">' +
    '<button type="button" class="auth-btn" :disabled="saving" @click="confirmVerifyAccept">Create level &amp; Accept</button>' +
    '<button type="button" class="auth-btn auth-btn--ghost" @click="verifyForm.open=false">Cancel</button>' +
    '</div>' +
    '</div>' +
    '<div class="admin-edit-card" v-if="showAddSub" style="margin-bottom:1rem">' +
    '<h3 style="margin:0 0 0.5rem">Log submission</h3>' +
    '<div class="admin-grid">' +
    '<label>Player * <input class="admin-input" v-model="newSub.player" /></label>' +
    '<label>Discord <input class="admin-input" v-model="newSub.discordUser" /></label>' +
    '<label>Level path <select class="admin-input" v-model="newSub.levelPath"><option value="">—</option><option value="__verifying__">Verifying</option><option v-for="p in listOrder" :key="\'sp-\'+p" :value="p">{{ p }}</option></select></label>' +
    '<label>Level name <input class="admin-input" v-model="newSub.levelName" /></label>' +
    '<label>Percent <input class="admin-input" type="number" min="1" max="100" v-model.number="newSub.percent" /></label>' +
    '<label>Device <select class="admin-input" v-model="newSub.device"><option>PC</option><option>Mobile</option><option>Laptop</option></select></label>' +
    '<label class="admin-grid--full">Video * <input class="admin-input" v-model="newSub.link" /></label>' +
    '<label>Mod menu <input class="admin-input" v-model="newSub.modMenu" /></label>' +
    '<label>Custom ID <input class="admin-input" v-model="newSub.customId" /></label>' +
    '<label>Raw footage <input class="admin-input" v-model="newSub.rawFootage" /></label>' +
    '<label class="admin-grid--full">Notes <input class="admin-input" v-model="newSub.notes" /></label>' +
    '</div>' +
    '<div class="admin-actions"><button type="button" class="auth-btn" :disabled="saving" @click="addManualSub">Add to queue</button></div>' +
    '</div>' +
    '<p class="admin-hint" v-if="!filteredSubs.length">No submissions in this filter.</p>' +
    '<ul class="admin-sub-list">' +
    '<li class="admin-sub-card" v-for="s in filteredSubs" :key="s.id">' +
    '<div class="admin-sub-card__head">' +
    '<strong>{{ s.player }}</strong>' +
    '<span class="admin-role-tag">{{ statusLabel(s.status) }}</span>' +
    '<span class="admin-muted" v-if="s.discordUser">@{{ s.discordUser }}</span>' +
    '<span class="admin-muted">{{ s.createdAt ? new Date(s.createdAt).toLocaleString() : \'\' }}</span>' +
    '</div>' +
    '<div class="admin-sub-card__meta">' +
    '<div><strong>Level</strong>{{ s.levelName || s.levelPath || \'—\' }}</div>' +
    '<div><strong>%</strong>{{ s.percent != null ? s.percent : 100 }}</div>' +
    '<div><strong>Device</strong>{{ s.device || \'—\' }}</div>' +
    '<div><strong>Mod</strong>{{ s.modMenu || \'—\' }}</div>' +
    '<div><strong>Attempts</strong>{{ s.attempts || \'—\' }}</div>' +
    '<div><strong>Length</strong>{{ s.length || \'—\' }}</div>' +
    '</div>' +
    '<div style="font-size:0.85rem;margin-bottom:0.25rem" v-if="s.link"><strong>Video:</strong> <a :href="safeLink(s.link)" target="_blank" rel="noopener">{{ s.link }}</a></div>' +
    '<div style="font-size:0.85rem;margin-bottom:0.25rem" v-if="s.rawFootage"><strong>Raw:</strong> <a :href="safeLink(s.rawFootage)" target="_blank" rel="noopener">{{ s.rawFootage }}</a></div>' +
    '<div style="font-size:0.85rem;color:var(--color-muted)" v-if="s.notes"><strong>Notes:</strong> {{ s.notes }}</div>' +
    '<div class="admin-sub-actions" v-if="statusLabel(s.status)===\'pending\'">' +
    '<button type="button" class="auth-btn" :disabled="saving" @click="approveSub(s)">{{ isVerifying(s) ? \'Accept verification…\' : \'Accept → add record\' }}</button>' +
    '<button type="button" class="auth-btn auth-btn--ghost" :disabled="saving" @click="rejectSub(s)">Reject</button>' +
    '</div>' +
    '</li>' +
    '</ul>' +
    '</div>';
  if (template.includes(panelNeedle)) {
    template = template.replace(panelNeedle, panel + panelNeedle);
  }

  const whNeedle =
    '<button type="button" class="auth-btn" @click="saveWebhookLocal">Save webhook</button>';
  const whInsert =
    whNeedle +
    '\n<button type="button" class="auth-btn auth-btn--ghost" :disabled="saving" @click="publishWebhookToSite">Publish to site (for public submits)</button>';
  if (template.includes(whNeedle) && !template.includes('publishWebhookToSite')) {
    template = template.replace(whNeedle, whInsert);
  }

  return {
    name: 'Admin',
    components: Object.assign({ Spinner }, BaseComp.components || {}),
    template,
    data() {
      const d = typeof baseData === 'function' ? baseData.call(this) : Object.assign({}, baseData || {});
      return Object.assign({}, d, {
        submissions: [],
        subFilter: 'pending',
        showAddSub: false,
        verifyForm: {
          open: false,
          subId: '',
          name: '',
          path: '',
          id: 0,
          author: '',
          verifier: '',
          verification: '',
          length: '',
          password: 'Free to Copy',
          percentToQualify: 100,
          rank: 1,
        },
        newSub: {
          player: '',
          levelPath: '',
          levelName: '',
          percent: 100,
          link: '',
          device: 'PC',
          modMenu: '',
          customId: '',
          rawFootage: '',
          notes: '',
          discordUser: '',
          displayName: '',
          length: '',
          attempts: '',
        },
      });
    },
    computed: Object.assign({}, baseComputed, {
      pendingSubs() {
        return (this.submissions || []).filter((s) => statusLabel(s.status) === 'pending');
      },
      filteredSubs() {
        const f = this.subFilter || 'all';
        let list = (this.submissions || []).slice();
        if (f !== 'all') {
          list = list.filter((s) => statusLabel(s.status) === f);
        }
        return list.sort((a, b) =>
          String(b.createdAt || '').localeCompare(String(a.createdAt || '')),
        );
      },
    }),
    methods: Object.assign({}, baseMethods, {
      statusLabel,
      isVerifying(s) {
        return !s || !s.levelPath || s.levelPath === '__verifying__';
      },
      safeLink(url) {
        const u = String(url || '').trim();
        if (!u) return '#';
        if (/^https?:\/\//i.test(u)) return u;
        if (/^[\w.-]+\.[a-z]{2,}/i.test(u) && !/\s/.test(u)) return 'https://' + u;
        return u;
      },
      async getWebhookUrl() {
        let w = (this.discordWebhook || '').trim();
        if (!w && typeof localStorage !== 'undefined') {
          w = localStorage.getItem(WEBHOOK_KEY) || '';
        }
        if (!w) {
          try {
            const res = await fetch('./data/_config.json?t=' + Date.now(), { cache: 'no-store' });
            if (res.ok) {
              const cfg = await res.json();
              if (cfg && cfg.submissionsWebhook) w = cfg.submissionsWebhook;
            }
          } catch (e) {}
        }
        return (w || '').trim();
      },
      async notifyDiscordStatus(entry, status) {
        const webhook = await this.getWebhookUrl();
        if (!webhook || !entry) return;
        const lines = [
          'Submission ' + status.toUpperCase(),
          'Player: ' + (entry.player || '—'),
          'Discord: ' + (entry.discordUser || '—'),
          'Level: ' + (entry.levelName || entry.levelPath || '—'),
          'Status: ' + status,
        ];
        if (entry.link) lines.push('Video: ' + entry.link);
        try {
          await sendDiscordWebhook(webhook, lines.join('\n'));
        } catch (e) {}
      },
      onVerifyNameInput() {
        if (!this.verifyForm._pathTouched) {
          this.verifyForm.path = slugifyPath(this.verifyForm.name);
        }
      },
      async openSubmissions() {
        this.tab = 'submissions';
        await this.loadSubmissions();
      },
      async loadSubmissions() {
        try {
          const res = await fetch('./data/_submissions.json?t=' + Date.now(), {
            cache: 'no-store',
          });
          if (res.ok) {
            const data = await res.json();
            this.submissions = Array.isArray(data) ? data : [];
          } else this.submissions = [];
        } catch (e) {
          this.submissions = [];
        }
      },
      async saveSubmissionsQueue(message) {
        return this.pushFile(
          'data/_submissions.json',
          JSON.stringify(this.submissions || [], null, 4),
          message || 'Admin: submissions',
        );
      },
      async addManualSub() {
        const n = this.newSub || {};
        if (!(n.player || '').trim()) {
          this.flash('Player required.', true);
          return;
        }
        if (!(n.link || '').trim()) {
          this.flash('Video link required.', true);
          return;
        }
        let levelName = (n.levelName || '').trim();
        const path = n.levelPath || '';
        if (!levelName && path && path !== '__verifying__') {
          const pair = (this.list || []).find((p) => p[0] && p[0].path === path);
          levelName = (pair && pair[0] && pair[0].name) || path;
        }
        if (!levelName) {
          this.flash('Level name or path required.', true);
          return;
        }
        const entry = {
          id: 'sub_manual_' + Date.now().toString(36),
          status: 'pending',
          mode: 'classic',
          player: n.player.trim(),
          discordUser: (n.discordUser || '').trim(),
          displayName: (n.displayName || '').trim(),
          levelPath: path || '__verifying__',
          levelName,
          percent: Number(n.percent) || 100,
          link: n.link.trim(),
          device: n.device || 'PC',
          modMenu: n.modMenu || '',
          customId: n.customId || '',
          rawFootage: n.rawFootage || '',
          length: n.length || '',
          attempts: n.attempts || '',
          notes: n.notes || '',
          createdAt: new Date().toISOString(),
        };
        this.submissions = [entry].concat(this.submissions || []);
        if (await this.saveSubmissionsQueue('Admin: log submission ' + entry.player)) {
          this.showAddSub = false;
          this.flash('Submission logged.');
        }
      },
      async rejectSub(s) {
        if (!s || !s.id) return;
        if (!confirm('Reject submission from ' + s.player + '?')) return;
        this.submissions = (this.submissions || []).map((x) =>
          x.id === s.id
            ? Object.assign({}, x, {
                status: 'rejected',
                resolvedAt: new Date().toISOString(),
              })
            : x,
        );
        await this.saveSubmissionsQueue('Admin: reject submission ' + s.player);
        await this.notifyDiscordStatus(s, 'rejected');
        this.flash('Rejected — Discord notified.');
      },
      async approveSub(s) {
        if (!s || !s.id) return;
        if (this.isVerifying(s)) {
          const name = (s.levelName || '').trim() || 'New Level';
          this.verifyForm = {
            open: true,
            subId: s.id,
            name,
            path: slugifyPath(name),
            id: Number(s.customId) || 0,
            author: s.player || '',
            verifier: s.player || '',
            verification: s.link || '',
            length: s.length || '',
            password: 'Free to Copy',
            percentToQualify: 100,
            rank: 1,
            _pathTouched: false,
          };
          return;
        }
        await this.acceptRecordOnLevel(s, s.levelPath);
      },
      async confirmVerifyAccept() {
        const f = this.verifyForm;
        const path = String(f.path || '').replace(/[^a-zA-Z0-9_-]/g, '');
        const name = String(f.name || '').trim();
        if (!name) {
          this.flash('Level name required.', true);
          return;
        }
        if (!path) {
          this.flash('File path required (letters/numbers only).', true);
          return;
        }
        if (!(f.verification || '').trim()) {
          this.flash('Verification video required.', true);
          return;
        }
        const sub = (this.submissions || []).find((x) => x.id === f.subId);
        if (!sub) {
          this.flash('Submission not found.', true);
          return;
        }

        const levelPayload = {
          id: Number(f.id) || 0,
          name,
          author: (f.author || sub.player || '').trim() || 'Unknown',
          creators: [(f.author || sub.player || '').trim() || 'Unknown'],
          verifier: (f.verifier || sub.player || '').trim() || 'Unknown',
          verification: String(f.verification || '').trim(),
          thumbnail: '',
          percentToQualify: Number(f.percentToQualify) || 100,
          password: (f.password || 'Free to Copy').trim(),
          length: (f.length || sub.length || '').trim(),
          creationDate: new Date().toLocaleDateString('en-US'),
          tags: [],
          records: [
            {
              user: String(sub.player || '').trim(),
              percent: Number(sub.percent) || 100,
              link: sub.link || f.verification,
            },
          ],
        };

        if (
          !(await this.pushFile(
            'data/' + path + '.json',
            JSON.stringify(levelPayload, null, 4),
            'Admin: create level ' + path + ' from verification',
          ))
        )
          return;

        // insert into list order
        let order = (this.listOrder || []).slice();
        order = order.filter((p) => p !== path);
        let rank = Number(f.rank) || 1;
        if (rank < 1) rank = 1;
        if (rank > order.length + 1) rank = order.length + 1;
        order.splice(rank - 1, 0, path);
        this.listOrder = order;
        if (typeof this.saveList === 'function') {
          await this.saveList();
        } else {
          await this.pushFile(
            'data/_list.json',
            JSON.stringify(order, null, 4),
            'Admin: add ' + path + ' to list',
          );
        }

        // refresh local list cache if present
        if (Array.isArray(this.list)) {
          this.list = [[Object.assign({}, levelPayload, { path }), null]].concat(
            this.list.filter((pair) => !(pair && pair[0] && pair[0].path === path)),
          );
        }

        this.submissions = (this.submissions || []).map((x) =>
          x.id === sub.id
            ? Object.assign({}, x, {
                status: 'accepted',
                levelPath: path,
                levelName: name,
                resolvedAt: new Date().toISOString(),
              })
            : x,
        );
        await this.saveSubmissionsQueue('Admin: accept verification ' + sub.player);
        await this.notifyDiscordStatus(
          Object.assign({}, sub, { levelName: name, levelPath: path }),
          'accepted',
        );
        this.verifyForm.open = false;
        this.flash('Level created and verification accepted for ' + sub.player + '.');
      },
      async acceptRecordOnLevel(s, path) {
        let pair = (this.list || []).find((p) => p[0] && p[0].path === path);
        let levelData = null;
        if (pair && pair[0]) {
          levelData = JSON.parse(JSON.stringify(pair[0]));
        } else {
          try {
            const res = await fetch('./data/' + path + '.json?t=' + Date.now(), {
              cache: 'no-store',
            });
            if (!res.ok) {
              this.flash('Could not load level file: ' + path, true);
              return;
            }
            levelData = await res.json();
          } catch (e) {
            this.flash('Could not load level file.', true);
            return;
          }
        }
        const records = Array.isArray(levelData.records) ? levelData.records.slice() : [];
        const name = String(s.player || '').trim();
        const pct = Number(s.percent) || 100;
        const link = s.link || '';
        const existing = records.findIndex(
          (r) => r && String(r.user || '').toLowerCase() === name.toLowerCase(),
        );
        if (existing >= 0) {
          if (Number(records[existing].percent) < pct) {
            records[existing].percent = pct;
            records[existing].link = link || records[existing].link;
          }
        } else {
          records.push({ user: name, percent: pct, link });
        }
        records.sort((a, b) => Number(b.percent) - Number(a.percent));
        const payload = Object.assign({}, levelData, { records });
        delete payload.path;
        if (
          !(await this.pushFile(
            'data/' + path + '.json',
            JSON.stringify(payload, null, 4),
            'Admin: accept ' + name + ' on ' + path,
          ))
        )
          return;
        if (pair && pair[0]) pair[0] = Object.assign({}, payload, { path });
        this.submissions = (this.submissions || []).map((x) =>
          x.id === s.id
            ? Object.assign({}, x, {
                status: 'accepted',
                resolvedAt: new Date().toISOString(),
              })
            : x,
        );
        await this.saveSubmissionsQueue('Admin: accept submission ' + name);
        await this.notifyDiscordStatus(s, 'accepted');
        this.flash('Accepted — record added for ' + name + '.');
      },
      async removeFromList(i) {
        const p = (this.listOrder || [])[i];
        if (!p) return;
        if (
          !confirm(
            'Remove "' +
              p +
              '" from the main list?\n(The level JSON file stays in the repo; only the list order is updated.)',
          )
        )
          return;
        const order = this.listOrder.slice();
        order.splice(i, 1);
        this.listOrder = order;
        this.list = (this.list || []).filter((pair) => !(pair && pair[0] && pair[0].path === p));
        if (this.selectedPath === p) {
          this.selectedPath = '';
          this.draft = null;
        }
        await this.saveList();
        this.flash(p + ' removed from main list.');
      },
      async publishWebhookToSite() {
        const url = (this.discordWebhook || '').trim();
        if (!url) {
          this.flash('Paste a Discord webhook URL first.', true);
          return;
        }
        try {
          localStorage.setItem(WEBHOOK_KEY, url);
        } catch (e) {}
        const payload = {
          mainCutoff: Number(this.mainCutoff) || 75,
          extendedCutoff: Number(this.extendedCutoff) || 150,
          submissionsWebhook: url,
        };
        const ok = await this.pushFile(
          'data/_config.json',
          JSON.stringify(payload, null, 4),
          'Admin: publish submissions webhook',
        );
        if (ok) {
          this.flash('Webhook published.');
        }
      },
    }),
    mounted: BaseComp.mounted,
  };
}

export default injectExtras(Base);
