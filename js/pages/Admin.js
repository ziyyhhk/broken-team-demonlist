/**
 * Admin — rich accept embeds (list, top, verify/victor congrats) + SH victors.
 */
import Spinner from '../components/Spinner.js';
import {
  WEBHOOK_KEY,
  sendDiscordEmbed,
  buildSubmissionStatusEmbed,
  buildCongratsEmbed,
} from '../discordAnnounce.js';

const CDN =
  'https://cdn.jsdelivr.net/gh/ziyyhhk/broken-team-demonlist@112577ff84d9f657d4839b86d77f27c0c4cc363b/js/pages/Admin.js';
const jsBase = new URL('../', import.meta.url).href;

const src = await (await fetch(CDN + '?t=' + Date.now())).text();
let code = src.replace(/(from\s+['"])\.\.\/([^'"]+)(['"])/g, (_, a, p, c) => a + jsBase + p + c);

const blobUrl = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
const mod = await import(blobUrl);
const Base = mod.default;

function patchComp(Comp) {
  const baseData = Comp.data;
  const baseMethods = Comp.methods || {};
  let template = Comp.template || '';

  const subHead =
    '<div class="admin-sub-card__head">' +
    '<strong>{{ s.player }}</strong>' +
    '<span class="admin-role-tag">{{ statusLabel(s.status) }}</span>' +
    '<span class="admin-role-tag">{{ listLabel(s.listTarget) }}</span>' +
    '<span class="admin-muted" v-if="s.discordUser">@{{ s.discordUser }}</span>' +
    '<span class="admin-muted">{{ s.createdAt ? new Date(s.createdAt).toLocaleString() : \'\' }}</span>' +
    '</div>';
  const subHeadNew =
    '<div class="admin-sub-card__head">' +
    '<strong>{{ s.player }}</strong>' +
    '<span class="admin-role-tag">{{ statusLabel(s.status) }}</span>' +
    '<span class="admin-role-tag">{{ listLabel(s.listTarget) }}</span>' +
    '<span class="admin-muted" v-if="s.discordUser || s.displayName">Discord: {{ s.displayName ? s.displayName + (s.discordUser ? \' (@\' + s.discordUser + \')\' : \'\') : \'@\' + s.discordUser }}</span>' +
    '<span class="admin-muted">{{ s.createdAt ? new Date(s.createdAt).toLocaleString() : \'\' }}</span>' +
    '</div>';
  if (template.includes(subHead)) template = template.replace(subHead, subHeadNew);

  const subActions =
    '<div class="admin-sub-actions" v-if="statusLabel(s.status)===\'pending\'">' +
    '<button type="button" class="auth-btn" :disabled="saving" @click="approveSub(s)">{{ acceptButtonLabel(s) }}</button>' +
    '<button type="button" class="auth-btn auth-btn--ghost" :disabled="saving" @click="rejectSub(s)">Reject</button>' +
    '</div>';
  const subActionsNew =
    '<div style="margin:0.5rem 0;display:flex;flex-wrap:wrap;gap:0.5rem;align-items:center" v-if="statusLabel(s.status)===\'pending\'">' +
    '<label style="font-size:0.8rem;display:flex;align-items:center;gap:0.35rem;flex:1;min-width:12rem">Discord ID (for @mention) ' +
    '<input class="admin-input" style="flex:1;min-width:8rem" :value="discordIdDraft[s.id] || linkedDiscordId(s.player)" @input="setDiscordIdDraft(s.id, $event.target.value)" placeholder="numeric user ID" /></label>' +
    '</div>' +
    subActions;
  if (template.includes(subActions) && !template.includes('discordIdDraft[s.id]')) {
    template = template.replace(subActions, subActionsNew);
  }

  return {
    name: 'Admin',
    components: Comp.components,
    template,
    data() {
      const d = typeof baseData === 'function' ? baseData.call(this) : Object.assign({}, baseData || {});
      return Object.assign({}, d, { discordIdDraft: {}, acceptWebhook: '' });
    },
    computed: Comp.computed,
    methods: Object.assign({}, baseMethods, {
      async approveSub(s) {
        if (!s || !s.id) return;
        const t = s.listTarget || 'main';
        if (t === 'impossible') {
          this.openPlaceForm(s);
          return;
        }
        if (t === 'server_hardest') {
          if (String(s.levelPath || '').indexOf('sh:') === 0) {
            await this.acceptRecordOnServerHardest(s);
            return;
          }
          this.openPlaceForm(s);
          return;
        }
        if (typeof this.isVerifying === 'function' && this.isVerifying(s)) {
          this.openPlaceForm(s);
          return;
        }
        await this.acceptRecordOnLevel(s, s.levelPath);
      },
      async acceptRecordOnServerHardest(s) {
        let list = [];
        try {
          const res = await fetch('./data/_server_hardest.json?t=' + Date.now(), { cache: 'no-store' });
          if (res.ok) {
            const data = await res.json();
            list = Array.isArray(data) ? data : [];
          }
        } catch (e) {}
        const key = String(s.levelPath || '').replace(/^sh:/, '');
        const idx = list.findIndex((e) => {
          if (!e) return false;
          if (String(e.id) === key) return true;
          if (String(e.name) === key) return true;
          if (String(e.name || '').toLowerCase() === String(s.levelName || '').toLowerCase()) return true;
          return false;
        });
        if (idx < 0) {
          this.flash('Could not find that Server Hardest level. Place as new instead.', true);
          this.openPlaceForm(s);
          return;
        }
        const entry = Object.assign({}, list[idx]);
        const records = Array.isArray(entry.records) ? entry.records.slice() : [];
        const name = String(s.player || '').trim();
        const link = s.link || '';
        const existing = records.findIndex(
          (r) => r && String(r.user || '').toLowerCase() === name.toLowerCase(),
        );
        if (existing >= 0) {
          records[existing].link = link || records[existing].link;
          if (s.attempts) records[existing].attempts = s.attempts;
        } else {
          records.push({
            user: name,
            link: link,
            attempts: s.attempts || null,
            date: new Date().toISOString().slice(0, 10),
          });
        }
        entry.records = records;
        if (!entry.victor && name) entry.victor = name;
        list[idx] = entry;
        if (
          !(await this.pushFile(
            'data/_server_hardest.json',
            JSON.stringify(list, null, 4),
            'Admin: SH victor ' + name + ' on ' + (entry.name || key),
          ))
        )
          return;
        this.submissions = (this.submissions || []).map((x) =>
          x.id === s.id
            ? Object.assign({}, x, {
                status: 'accepted',
                levelName: entry.name || s.levelName,
                resolvedAt: new Date().toISOString(),
              })
            : x,
        );
        await this.saveSubmissionsQueue('Admin: accept SH victor ' + name);
        await this.notifyDiscordStatus(
          Object.assign({}, s, {
            levelName: entry.name || s.levelName,
            listTarget: 'server_hardest',
            _kind: 'victor',
            _rank: records.length,
            link: link,
          }),
          'accepted',
        );
        this.flash('Accepted SH victor: ' + name + ' on ' + (entry.name || key));
      },
      linkedDiscordId(player) {
        const map = this.playerDiscord || {};
        if (map[player]) return String(map[player]).replace(/\D/g, '');
        const key = Object.keys(map).find(
          (k) => k.toLowerCase() === String(player || '').toLowerCase(),
        );
        return key ? String(map[key]).replace(/\D/g, '') : '';
      },
      setDiscordIdDraft(subId, value) {
        const next = Object.assign({}, this.discordIdDraft || {});
        next[subId] = String(value || '').replace(/\D/g, '');
        this.discordIdDraft = next;
      },
      discordIdForSub(s) {
        if (!s) return '';
        const draft = (this.discordIdDraft || {})[s.id];
        if (draft) return draft;
        return this.linkedDiscordId(s.player);
      },
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
            if (cfg && cfg.submissionsWebhook) w = String(cfg.submissionsWebhook).trim();
          }
        } catch (e) {}
        return (w || '').trim();
      },
      async getAcceptWebhook() {
        let w = (this.acceptWebhook || '').trim();
        try {
          const res = await fetch('./data/_config.json?t=' + Date.now(), { cache: 'no-store' });
          if (res.ok) {
            const cfg = await res.json();
            if (cfg && cfg.acceptWebhook) w = String(cfg.acceptWebhook).trim();
            else if (cfg && cfg.submissionsWebhook) w = String(cfg.submissionsWebhook).trim();
          }
        } catch (e) {}
        if (!w) w = await this.getSubmissionsWebhook();
        return (w || '').trim();
      },
      async getWebhookUrl() {
        return this.getSubmissionsWebhook();
      },
      async sendListAnnounce() {
        return;
      },
      async notifyDiscordStatus(entry, status) {
        if (!entry) return;
        const accepted = status === 'accepted' || status === 'approved';
        const msgs = this.discordMessages || {};
        if (accepted && msgs.enabledAccept === false) return;
        if (!accepted && msgs.enabledReject === false) return;

        const webhook = accepted
          ? await this.getAcceptWebhook()
          : await this.getSubmissionsWebhook();
        if (!webhook) {
          this.flash('No Discord webhook configured for ' + (accepted ? 'accept' : 'reject') + '.', true);
          return;
        }
        const enriched = Object.assign({}, entry);
        if (!enriched._discordId) {
          try {
            enriched._discordId = this.discordIdForSub(entry) || this.linkedDiscordId(entry.player) || '';
          } catch (e) {}
        }
        try {
          const result = await sendDiscordEmbed(
            webhook,
            buildSubmissionStatusEmbed(enriched, status, msgs),
          );
          if (result && result.ok === false) {
            this.flash('Discord notify failed: ' + (result.error || 'unknown'), true);
          }
          if (accepted && enriched._kind && (enriched._kind === 'verify' || enriched._kind === 'victor')) {
            const congrats = buildCongratsEmbed(enriched, enriched._kind, msgs);
            await sendDiscordEmbed(webhook, congrats);
          }
        } catch (e) {
          this.flash('Discord notify error: ' + (e && e.message ? e.message : e), true);
        }
      },
      async placeOnMain(sub, f, name, rank) {
        const path = String((f && f.path) || '').replace(/[^a-zA-Z0-9_-]/g, '');
        if (!path) {
          this.flash('File path required.', true);
          return;
        }
        const author = String((f && f.author) || sub.creator || sub.player || '').trim() || 'Unknown';
        const verifier = String((f && f.verifier) || sub.verifier || '').trim() || 'Unknown';
        const levelPayload = {
          id: Number(f && f.id) || 0,
          name,
          author,
          creators: [author],
          verifier,
          verification: String((f && f.verification) || sub.link || '').trim(),
          thumbnail: '',
          percentToQualify: Number(f && f.percentToQualify) || 100,
          password: String((f && f.password) || 'Free to Copy').trim(),
          length: String((f && f.length) || sub.length || '').trim(),
          creationDate: new Date().toLocaleDateString('en-US'),
          tags: [],
          records: [],
        };
        if (
          !(await this.pushFile(
            'data/' + path + '.json',
            JSON.stringify(levelPayload, null, 4),
            'Admin: create level ' + path + ' (no auto victor)',
          ))
        )
          return;

        let order = (this.listOrder || []).slice();
        order = order.filter((p) => p !== path);
        let r = Number(rank) || 1;
        if (r < 1) r = 1;
        if (r > order.length + 1) r = order.length + 1;
        order.splice(r - 1, 0, path);
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
        if (Array.isArray(this.list)) {
          this.list = [[Object.assign({}, levelPayload, { path }), null]].concat(
            (this.list || []).filter((pair) => !(pair && pair[0] && pair[0].path === path)),
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
        await this.saveSubmissionsQueue('Admin: accept verification ' + (sub.player || ''));
        await this.notifyDiscordStatus(
          Object.assign({}, sub, {
            levelName: name,
            levelPath: path,
            listTarget: 'main',
            verifier: verifier,
            creator: author,
            author: author,
            _rank: r,
            _kind: 'verify',
            link: levelPayload.verification || sub.link || '',
          }),
          'accepted',
        );
        if (this.placeForm) this.placeForm.open = false;
        this.flash('Placed on Main List at #' + r + ' (no auto victor).');
      },
      async confirmPlaceAccept() {
        const f = this.placeForm;
        if (!f) return;
        if (f.listTarget === 'platformer') {
          return baseMethods.confirmPlaceAccept.call(this);
        }
        const sub = (this.submissions || []).find((x) => x.id === f.subId);
        if (!sub) {
          this.flash('Submission not found.', true);
          return;
        }
        const name = String(f.name || '').trim();
        if (!name) {
          this.flash('Level name required.', true);
          return;
        }
        if (!(f.verification || '').trim()) {
          this.flash('Video required.', true);
          return;
        }
        let rank = Number(f.rank) || 1;
        if (rank < 1) rank = 1;
        if (f.listTarget === 'server_hardest') {
          await this.placeOnServerHardest(sub, f, name, rank);
          return;
        }
        if (f.listTarget === 'impossible') {
          const origNotify = this.notifyDiscordStatus;
          const self = this;
          this.notifyDiscordStatus = async function (entry, status) {
            return origNotify.call(
              self,
              Object.assign({}, entry, {
                _kind: 'verify',
                _rank: rank,
                listTarget: 'impossible',
                levelName: name,
                link: (f && f.verification) || sub.link || '',
              }),
              status,
            );
          };
          try {
            await baseMethods.placeOnImpossible.call(this, sub, f, name, rank);
          } finally {
            this.notifyDiscordStatus = origNotify;
          }
          return;
        }
        await this.placeOnMain(sub, f, name, rank);
      },
      async placeOnServerHardest(sub, f, name, rank) {
        const origNotify = this.notifyDiscordStatus;
        const self = this;
        this.notifyDiscordStatus = async function (entry, status) {
          return origNotify.call(
            self,
            Object.assign({}, entry, {
              _kind: 'verify',
              _rank: rank,
              listTarget: 'server_hardest',
              levelName: name,
              link: (f && f.verification) || sub.link || '',
            }),
            status,
          );
        };
        try {
          await baseMethods.placeOnServerHardest.call(this, sub, f, name, rank);
        } finally {
          this.notifyDiscordStatus = origNotify;
        }
        try {
          const res = await fetch('./data/_server_hardest.json?t=' + Date.now(), { cache: 'no-store' });
          if (!res.ok) return;
          let list = await res.json();
          if (!Array.isArray(list)) return;
          const verifier = String((f && f.verifier) || sub.verifier || sub.player || '').trim();
          list = list.map((entry) => {
            if (!entry || entry.name !== name) return entry;
            return Object.assign({}, entry, {
              verifier: verifier || entry.verifier,
              victor: verifier || entry.victor,
              records: [],
            });
          });
          await this.pushFile(
            'data/_server_hardest.json',
            JSON.stringify(list, null, 4),
            'Admin: SH verify without auto victor',
          );
        } catch (e) {}
      },
      async acceptRecordOnLevel(s, path) {
        let discordId = this.discordIdForSub(s);
        if (!discordId) {
          const input = window.prompt(
            'Victor will be: ' +
              (s.player || '') +
              '\n\nDiscord user ID for @mention (optional). Leave blank to skip.',
            '',
          );
          if (input) discordId = String(input).replace(/\D/g, '');
        }
        if (discordId && s && s.id) this.setDiscordIdDraft(s.id, discordId);
        const origNotify = this.notifyDiscordStatus;
        const self = this;
        this.notifyDiscordStatus = async function (entry, status) {
          let rank = null;
          try {
            const pair = (self.list || []).find((p) => p && p[0] && p[0].path === path);
            if (pair && pair[0] && Array.isArray(pair[0].records)) {
              rank = pair[0].records.filter((r) => Number(r.percent) >= 100).length;
            }
          } catch (e) {}
          const enriched = Object.assign({}, entry, {
            _kind: 'victor',
            _rank: rank,
            _discordId: discordId || '',
            listTarget: entry.listTarget || s.listTarget || 'main',
            levelName: entry.levelName || s.levelName || path,
          });
          return origNotify.call(self, enriched, status);
        };
        try {
          await baseMethods.acceptRecordOnLevel.call(this, s, path);
        } finally {
          this.notifyDiscordStatus = origNotify;
        }
        if (discordId && typeof this.savePlayerDiscordId === 'function') {
          await this.savePlayerDiscordId(s.player, discordId);
        }
      },
      openPlaceForm(s) {
        baseMethods.openPlaceForm.call(this, s);
        const id = this.discordIdForSub(s);
        if (this.placeForm) this.placeForm.discordId = id;
      },
    }),
    async mounted() {
      if (typeof Comp.mounted === 'function') await Comp.mounted.call(this);
      try {
        const res = await fetch('./data/_config.json?t=' + Date.now(), { cache: 'no-store' });
        if (res.ok) {
          const cfg = await res.json();
          if (cfg && cfg.acceptWebhook) this.acceptWebhook = String(cfg.acceptWebhook).trim();
        }
      } catch (e) {}
    },
  };
}

export default patchComp(Base);
