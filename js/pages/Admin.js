/**
 * Admin — Outer base + secure webhooks (single layer, loads reliably).
 */
import Spinner from '../components/Spinner.js';
import {
  WEBHOOK_KEY,
  hideSecret,
  revealSecret,
} from '../discordAnnounce.js';

const OUTER_URL =
  'https://cdn.jsdelivr.net/gh/ziyyhhk/broken-team-demonlist@a21cd1e624b6eda140b1018346af282b7ca1b80e/js/pages/Admin.js';
const jsBase = new URL('../', import.meta.url).href;

const src = await (await fetch(OUTER_URL + '?t=' + Date.now())).text();
const code = src.replace(/(from\s+['"])\.\.\/([^'"]+)(['"])/g, (_, a, p, c) => a + jsBase + p + c);
const mod = await import(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })));
const Outer = mod.default;

const baseData = Outer.data;
const baseMethods = Outer.methods || {};
let template = Outer.template || '';

if (template.includes('saveWebhookLocal') && !template.includes('publishWebhookToSite')) {
  template = template.replace(
    '@click="saveWebhookLocal">Save webhook</button>',
    '@click="saveWebhookLocal">Save webhook</button>\n<button type="button" class="auth-btn auth-btn--ghost" :disabled="saving" @click="publishWebhookToSite">Publish hidden webhook</button>',
  );
}

export default {
  name: 'Admin',
  components: Object.assign({ Spinner }, Outer.components || {}),
  template,
  data() {
    const d = typeof baseData === 'function' ? baseData.call(this) : Object.assign({}, baseData || {});
    return Object.assign({}, d, { acceptWebhook: '' });
  },
  computed: Outer.computed,
  methods: Object.assign({}, baseMethods, {
    async getWebhookUrl() {
      let w = (this.discordWebhook || '').trim();
      if (!w && typeof localStorage !== 'undefined') {
        try {
          w = localStorage.getItem(WEBHOOK_KEY) || '';
        } catch (e) {}
      }
      try {
        const res = await fetch('./data/_config.json?t=' + Date.now(), { cache: 'no-store' });
        if (res.ok) {
          const cfg = await res.json();
          if (cfg) {
            const decoded = revealSecret(cfg.sw || cfg.aw || cfg.submissionsWebhook || '');
            if (decoded) w = decoded;
          }
        }
      } catch (e) {}
      return revealSecret(w || '').trim();
    },
    async getSubmissionsWebhook() {
      return this.getWebhookUrl();
    },
    async getAcceptWebhook() {
      let w = (this.acceptWebhook || '').trim();
      try {
        const res = await fetch('./data/_config.json?t=' + Date.now(), { cache: 'no-store' });
        if (res.ok) {
          const cfg = await res.json();
          if (cfg) {
            const decoded = revealSecret(cfg.aw || cfg.sw || '');
            if (decoded) w = decoded;
          }
        }
      } catch (e) {}
      if (!w) w = await this.getWebhookUrl();
      return revealSecret(w || '').trim();
    },
    async publishWebhookToSite() {
      const url = revealSecret((this.discordWebhook || '').trim());
      if (!url || url.indexOf('/api/webhooks/') < 0) {
        this.flash('Paste a valid Discord webhook URL first.', true);
        return;
      }
      let cfg = {};
      try {
        const res = await fetch('./data/_config.json?t=' + Date.now(), { cache: 'no-store' });
        if (res.ok) cfg = await res.json();
      } catch (e) {}
      cfg = Object.assign({}, cfg || {});
      delete cfg.submissionsWebhook;
      delete cfg.acceptWebhook;
      cfg.sw = hideSecret(url);
      cfg.aw = hideSecret(url);
      if (!(await this.pushFile('data/_config.json', JSON.stringify(cfg, null, 4), 'Admin: hidden notify'))) return;
      this.flash('Webhook saved hidden in config.');
    },
    async saveWebhookLocal() {
      const url = (this.discordWebhook || '').trim();
      try {
        if (url) localStorage.setItem(WEBHOOK_KEY, url);
        else localStorage.removeItem(WEBHOOK_KEY);
      } catch (e) {}
      this.flash('Saved on this browser only (not GitHub).');
    },
  }),
  async mounted() {
    if (typeof Outer.mounted === 'function') await Outer.mounted.call(this);
    try {
      const res = await fetch('./data/_config.json?t=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const cfg = await res.json();
        if (cfg) {
          const w = revealSecret(cfg.sw || cfg.aw || '');
          if (w) {
            this.acceptWebhook = w;
            if (!this.discordWebhook) this.discordWebhook = w;
          }
        }
      }
    } catch (e) {}
  },
};
