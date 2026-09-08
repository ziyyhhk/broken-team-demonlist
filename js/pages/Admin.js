/**
 * Admin secure webhook layer.
 */
import Spinner from '../components/Spinner.js';
import {
  WEBHOOK_KEY,
  sendDiscordEmbed,
  buildSubmissionStatusEmbed,
  buildCongratsEmbed,
  hideSecret,
  revealSecret,
} from '../discordAnnounce.js';

const CDN =
  'https://cdn.jsdelivr.net/gh/ziyyhhk/broken-team-demonlist@a827949ed1689581d7866923357e6676757365e3/js/pages/Admin.js';
const jsBase = new URL('../', import.meta.url).href;

const src = await (await fetch(CDN + '?t=' + Date.now())).text();
let code = src.replace(/(from\s+['"])\.\.\/([^'"]+)(['"])/g, (_, a, p, c) => a + jsBase + p + c);

const blobUrl = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
const mod = await import(blobUrl);
const Base = mod.default;

function patchComp(Comp) {
  const baseData = Comp.data;
  const baseMethods = Comp.methods || {};
  return {
    name: 'Admin',
    components: Comp.components,
    template: Comp.template,
    data() {
      const d = typeof baseData === 'function' ? baseData.call(this) : Object.assign({}, baseData || {});
      return Object.assign({}, d);
    },
    computed: Comp.computed,
    methods: Object.assign({}, baseMethods, {
      async getSubmissionsWebhook() {
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
              const decoded = revealSecret(cfg.sw || cfg.submissionsWebhook || '');
              if (decoded) w = decoded;
            }
          }
        } catch (e) {}
        return revealSecret(w || '').trim();
      },
      async getAcceptWebhook() {
        let w = (this.acceptWebhook || '').trim();
        try {
          const res = await fetch('./data/_config.json?t=' + Date.now(), { cache: 'no-store' });
          if (res.ok) {
            const cfg = await res.json();
            if (cfg) {
              const decoded = revealSecret(
                cfg.aw || cfg.sw || cfg.acceptWebhook || cfg.submissionsWebhook || '',
              );
              if (decoded) w = decoded;
            }
          }
        } catch (e) {}
        if (!w) w = await this.getSubmissionsWebhook();
        return revealSecret(w || '').trim();
      },
      async getWebhookUrl() {
        return this.getSubmissionsWebhook();
      },
      async publishWebhookToSite() {
        const url = revealSecret((this.discordWebhook || '').trim());
        if (!url || url.indexOf('/api/webhooks/') < 0) {
          this.flash('Enter a valid Discord webhook URL first.', true);
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
        if (
          !(await this.pushFile(
            'data/_config.json',
            JSON.stringify(cfg, null, 4),
            'Admin: update site notify channel (obfuscated)',
          ))
        )
          return;
        this.flash('Published (hidden). Plaintext webhooks removed from config.');
      },
      async saveWebhookLocal() {
        const url = (this.discordWebhook || '').trim();
        try {
          if (url) localStorage.setItem(WEBHOOK_KEY, url);
          else localStorage.removeItem(WEBHOOK_KEY);
        } catch (e) {}
        this.flash('Saved locally only (not in GitHub).');
      },
    }),
    async mounted() {
      if (typeof Comp.mounted === 'function') await Comp.mounted.call(this);
      try {
        const res = await fetch('./data/_config.json?t=' + Date.now(), { cache: 'no-store' });
        if (res.ok) {
          const cfg = await res.json();
          if (cfg) {
            const aw = revealSecret(cfg.aw || cfg.acceptWebhook || cfg.sw || cfg.submissionsWebhook || '');
            if (aw) this.acceptWebhook = aw;
            const sw = revealSecret(cfg.sw || cfg.submissionsWebhook || '');
            if (sw && !this.discordWebhook) this.discordWebhook = sw;
          }
        }
      } catch (e) {}
    },
  };
}

export default patchComp(Base);
