/**
 * Admin panel — load last known good Admin from pinned commit, then add Platformer List.
 */
import Spinner from '../components/Spinner.js';
import { WEBHOOK_KEY, sendDiscordEmbed, buildSubmissionStatusEmbed } from '../discordAnnounce.js';

const url =
  'https://cdn.jsdelivr.net/gh/ziyyhhk/broken-team-demonlist@a21cd1e624b6eda140b1018346af282b7ca1b80e/js/pages/Admin.js';

const mod = await import(/* @vite-ignore */ url);
const Outer = mod.default;

function listLabel(t) {
  if (t === 'impossible') return 'Impossible List';
  if (t === 'server_hardest') return 'Server Hardest';
  if (t === 'platformer') return 'Platformer List';
  return 'Main List';
}

function slugifyPath(name) {
  const s = String(name || '').trim().replace(/[^a-zA-Z0-9]+/g, '').replace(/^\d+/, '');
  return s || 'NewLevel' + Date.now().toString(36);
}

function injectPlatformer(BaseComp) {
  const baseData = BaseComp.data;
  const baseComputed = BaseComp.computed || {};
  const baseMethods = BaseComp.methods || {};
  let template = BaseComp.template || '';

  const impTabNeedle =
    '<button type="button" class="admin-tab" :class="{ active: tab===\'impossible\' }" @click="openImpossible" v-if="canLevels || canList">Impossible List</button>';
  const platTab =
    impTabNeedle +
    '\n<button type="button" class="admin-tab" :class="{ active: tab===\'platformer\' }" @click="openPlatformer" v-if="canLevels || canList">Platformer List</button>';
  if (template.includes(impTabNeedle)) template = template.replace(impTabNeedle, platTab);

  const platPanel =
    '<div v-if="tab===\'platformer\' && (canLevels || canList)" class="admin-panel admin-panel--wide">' +
    '<h2>Platformer List</h2>' +
    '<div class="admin-actions" style="margin-bottom:0.75rem">' +
    '<button type="button" class="auth-btn" @click="showAddPlatformer=!showAddPlatformer">{{ showAddPlatformer?\'Hide\':\'+ Add Platformer level\' }}</button>' +
    '<button type="button" class="auth-btn" :disabled="saving" @click="savePlatformer">Save order</button>' +
    '</div>' +
    '<div class="admin-edit-card" v-if="showAddPlatformer">' +
    '<div class="admin-grid">' +
    '<label>Name * <input class="admin-input" v-model="newPlat.name" /></label>' +
    '<label>ID <input class="admin-input" v-model="newPlat.id" type="number" /></label>' +
    '<label>Creator / Author * <input class="admin-input" v-model="newPlat.author" /></label>' +
    '<label>Verifier <input class="admin-input" v-model="newPlat.verifier" /></label>' +
    '<label class="admin-grid--full">Video (optional) <input class="admin-input" v-model="newPlat.verification" /></label>' +
    '<label>Length <input class="admin-input" v-model="newPlat.length" /></label>' +
    '</div>' +
    '<div class="admin-actions"><button type="button" class="auth-btn" :disabled="saving" @click="createPlatformerLevel">Create on Platformer</button></div>' +
    '</div>' +
    '<ul class="admin-order">' +
    '<li v-for="(p, i) in platformerOrder" :key="\'plat-\'+p">' +
    '<span class="admin-order__rank">#{{ i+1 }}</span>' +
    '<span style="flex:1;cursor:pointer" @click="selectLevel(p)">{{ p }}</span>' +
    '<span class="admin-order__btns">' +
    '<button type="button" @click="platMoveUp(i)" :disabled="i===0">↑</button>' +
    '<button type="button" @click="platMoveDown(i)" :disabled="i===platformerOrder.length-1">↓</button>' +
    '<button type="button" class="rec-del" @click="removeFromPlatformer(i)">X</button>' +
    '</span></li></ul>' +
    '<div class="admin-edit-card" v-if="draft && isSelectedPlatformer">' +
    '<h3>{{ draft.name || selectedPath }} <span class="admin-role-tag">Platformer</span></h3>' +
    '<div class="admin-grid">' +
    '<label>Name <input class="admin-input" v-model="draft.name" /></label>' +
    '<label>ID <input class="admin-input" v-model.number="draft.id" type="number" /></label>' +
    '<label>Creator / Author <input class="admin-input" v-model="draft.author" /></label>' +
    '<label>Verifier <input class="admin-input" v-model="draft.verifier" /></label>' +
    '<label class="admin-grid--full">Video <input class="admin-input" v-model="draft.verification" /></label>' +
    '<label>Length <input class="admin-input" v-model="draft.length" /></label>' +
    '</div>' +
    '<div class="admin-actions"><button type="button" class="auth-btn" :disabled="saving" @click="saveDraft">Save level</button></div>' +
    '</div>' +
    '<p class="admin-muted" v-if="!platformerOrder.length">No platformer levels yet.</p>' +
    '</div>';

  const serverNeedle = '<div v-if="tab===\'server\' && canLevels" class="admin-panel admin-panel--wide">';
  if (template.includes(serverNeedle) && !template.includes("tab==='platformer'")) {
    template = template.replace(serverNeedle, platPanel + serverNeedle);
  }

  return {
    name: 'Admin',
    components: Object.assign({ Spinner }, BaseComp.components || {}),
    template,
    data() {
      const d = typeof baseData === 'function' ? baseData.call(this) : Object.assign({}, baseData || {});
      return Object.assign({}, d, {
        platformerOrder: [],
        showAddPlatformer: false,
        newPlat: { name: '', id: '', author: '', verifier: '', verification: '', length: '' },
      });
    },
    computed: Object.assign({}, baseComputed, {
      isSelectedPlatformer() {
        return !!(this.selectedPath && (this.platformerOrder || []).includes(this.selectedPath));
      },
    }),
    methods: Object.assign({}, baseMethods, {
      listLabel,
      async getWebhookUrl() {
        let w = (this.discordWebhook || '').trim();
        if (!w && typeof localStorage !== 'undefined') {
          try { w = localStorage.getItem(WEBHOOK_KEY) || ''; } catch (e) {}
        }
        try {
          const res = await fetch('./data/_config.json?t=' + Date.now(), { cache: 'no-store' });
          if (res.ok) {
            const cfg = await res.json();
            if (cfg && cfg.submissionsWebhook) {
              const cfgW = String(cfg.submissionsWebhook).trim();
              if (cfgW) w = cfgW;
            }
          }
        } catch (e) {}
        return (w || '').trim();
      },
      async notifyDiscordStatus(entry, status) {
        const webhook = await this.getWebhookUrl();
        if (!webhook) {
          this.flash('No Discord webhook configured (Settings / _config).', true);
          return;
        }
        if (!entry) return;
        try {
          const result = await sendDiscordEmbed(webhook, buildSubmissionStatusEmbed(entry, status));
          if (result && result.ok === false) {
            this.flash('Discord notify failed: ' + (result.error || 'unknown'), true);
          }
        } catch (e) {
          this.flash('Discord notify error: ' + (e && e.message ? e.message : e), true);
        }
      },
      async rejectSub(s) {
        if (!s || !s.id) return;
        this.submissions = (this.submissions || []).map((x) =>
          x.id === s.id
            ? Object.assign({}, x, {
                status: 'rejected',
                resolvedAt: new Date().toISOString(),
              })
            : x,
        );
        await this.saveSubmissionsQueue('Admin: reject submission ' + (s.player || ''));
        await this.notifyDiscordStatus(s, 'rejected');
        this.flash('Rejected ' + (s.player || 'submission') + '.');
      },
      openPlatformer() {
        this.tab = 'platformer';
        this.showAddPlatformer = false;
        this.loadPlatformerOrder();
      },
      async loadPlatformerOrder() {
        try {
          const res = await fetch('./data/_platformer.json?t=' + Date.now(), { cache: 'no-store' });
          if (res.ok) {
            const data = await res.json();
            this.platformerOrder = Array.isArray(data) ? data.slice() : [];
          } else this.platformerOrder = [];
        } catch (e) {
          this.platformerOrder = [];
        }
      },
      platMoveUp(i) {
        if (i <= 0) return;
        const a = this.platformerOrder.slice();
        const tmp = a[i];
        a[i] = a[i - 1];
        a[i - 1] = tmp;
        this.platformerOrder = a;
      },
      platMoveDown(i) {
        if (i >= this.platformerOrder.length - 1) return;
        const a = this.platformerOrder.slice();
        const tmp = a[i];
        a[i] = a[i + 1];
        a[i + 1] = tmp;
        this.platformerOrder = a;
      },
      async savePlatformer() {
        await this.pushFile(
          'data/_platformer.json',
          JSON.stringify(this.platformerOrder, null, 4),
          'Admin: platformer order',
        );
        this.flash('Platformer order saved.');
      },
      async removeFromPlatformer(i) {
        const p = this.platformerOrder[i];
        if (!p) return;
        if (!confirm('Remove "' + p + '" from Platformer list?')) return;
        const a = this.platformerOrder.slice();
        a.splice(i, 1);
        this.platformerOrder = a;
        if (this.selectedPath === p) {
          this.selectedPath = '';
          this.draft = null;
        }
        await this.savePlatformer();
      },
      async createPlatformerLevel() {
        const name = String(this.newPlat.name || '').trim();
        if (!name) {
          this.flash('Name required.', true);
          return;
        }
        let path = slugifyPath(name);
        const used = []
          .concat(this.listOrder || [])
          .concat(this.impossibleOrder || [])
          .concat(this.platformerOrder || []);
        if (used.includes(path)) path = path + Date.now().toString().slice(-4);
        const author = String(this.newPlat.author || '').trim() || 'Unknown';
        const payload = {
          id: Number(this.newPlat.id) || 0,
          name,
          author,
          creators: [author],
          verifier: String(this.newPlat.verifier || '').trim() || 'Unknown',
          verification: String(this.newPlat.verification || '').trim(),
          percentToQualify: 100,
          password: 'Free to Copy',
          length: String(this.newPlat.length || '').trim(),
          creationDate: new Date().toLocaleDateString('en-US'),
          tags: ['Platformer'],
          records: [],
        };
        if (
          !(await this.pushFile(
            'data/' + path + '.json',
            JSON.stringify(payload, null, 4),
            'Admin: add platformer ' + path,
          ))
        )
          return;
        const order = this.platformerOrder.slice();
        order.unshift(path);
        if (
          !(await this.pushFile(
            'data/_platformer.json',
            JSON.stringify(order, null, 4),
            'Admin: platformer add',
          ))
        )
          return;
        this.platformerOrder = order;
        this.showAddPlatformer = false;
        this.newPlat = { name: '', id: '', author: '', verifier: '', verification: '', length: '' };
        this.selectLevel(path);
        this.flash('Added to Platformer.');
      },
      async placeOnPlatformer(sub, f, name, rank) {
        const path = String(f.path || '').replace(/[^a-zA-Z0-9_-]/g, '');
        if (!path) { this.flash('File path required.', true); return; }
        const author = (f.author || sub.creator || sub.player || '').trim() || 'Unknown';
        const levelPayload = {
          id: Number(f.id) || 0, name, author, creators: [author],
          verifier: (f.verifier || sub.verifier || sub.player || '').trim() || 'Unknown',
          verification: String(f.verification || '').trim(),
          percentToQualify: 100, password: 'Free to Copy',
          length: (f.length || sub.length || '').trim(),
          creationDate: new Date().toLocaleDateString('en-US'),
          tags: ['Platformer'], records: [],
        };
        if (!(await this.pushFile('data/' + path + '.json', JSON.stringify(levelPayload, null, 4), 'Admin: create platformer ' + path))) return;
        let order = [];
        try {
          const res = await fetch('./data/_platformer.json?t=' + Date.now(), { cache: 'no-store' });
          if (res.ok) { const data = await res.json(); order = Array.isArray(data) ? data.slice() : []; }
        } catch (e) {}
        order = order.filter((p) => p !== path);
        if (rank > order.length + 1) rank = order.length + 1;
        order.splice(rank - 1, 0, path);
        if (!(await this.pushFile('data/_platformer.json', JSON.stringify(order, null, 4), 'Admin: place platformer #' + rank))) return;
        this.platformerOrder = order;
        this.submissions = (this.submissions || []).map((x) =>
          x.id === sub.id ? Object.assign({}, x, { status: 'accepted', levelPath: path, levelName: name, resolvedAt: new Date().toISOString() }) : x
        );
        await this.saveSubmissionsQueue('Admin: accept platformer ' + sub.player);
        await this.notifyDiscordStatus(Object.assign({}, sub, { levelName: name, levelPath: path, listTarget: 'platformer' }), 'accepted');
        this.placeForm.open = false;
        this.flash('Placed on Platformer List at #' + rank + '.');
      },
      async confirmPlaceAccept() {
        const f = this.placeForm;
        if (f && f.listTarget === 'platformer') {
          const sub = (this.submissions || []).find((x) => x.id === f.subId);
          if (!sub) { this.flash('Submission not found.', true); return; }
          const name = String(f.name || '').trim();
          if (!name) { this.flash('Level name required.', true); return; }
          if (!(f.verification || '').trim()) { this.flash('Video required.', true); return; }
          let rank = Number(f.rank) || 1;
          if (rank < 1) rank = 1;
          await this.placeOnPlatformer(sub, f, name, rank);
          return;
        }
        return baseMethods.confirmPlaceAccept.call(this);
      },
      acceptButtonLabel(s) {
        const t = (s && s.listTarget) || 'main';
        if (t === 'platformer') return 'Accept → Platformer…';
        if (typeof baseMethods.acceptButtonLabel === 'function') return baseMethods.acceptButtonLabel.call(this, s);
        return 'Accept';
      },
    }),
    async mounted() {
      if (typeof BaseComp.mounted === 'function') {
        await BaseComp.mounted.call(this);
      }
      try {
        await this.loadPlatformerOrder();
      } catch (e) {}
    },
  };
}

export default injectPlatformer(Outer);
