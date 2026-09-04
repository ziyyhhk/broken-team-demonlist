/**
 * Admin — pin previous working Admin, then patch Discord ID UI + no auto-victor on verify.
 */
import Spinner from '../components/Spinner.js';

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
      return Object.assign({}, d, { discordIdDraft: {} });
    },
    computed: Comp.computed,
    methods: Object.assign({}, baseMethods, {
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
      async placeOnMain(sub, f, name, rank) {
        await baseMethods.placeOnMain.call(this, sub, f, name, rank);
        const path = String((f && f.path) || '').replace(/[^a-zA-Z0-9_-]/g, '');
        if (!path) return;
        try {
          const res = await fetch('./data/' + path + '.json?t=' + Date.now(), { cache: 'no-store' });
          if (!res.ok) return;
          const data = await res.json();
          data.verifier = String((f && f.verifier) || sub.verifier || sub.player || '').trim() || 'Unknown';
          data.records = [];
          await this.pushFile(
            'data/' + path + '.json',
            JSON.stringify(data, null, 4),
            'Admin: verify without auto first victor ' + path,
          );
          if (Array.isArray(this.list)) {
            this.list = this.list.map((pair) =>
              pair && pair[0] && pair[0].path === path
                ? [Object.assign({}, data, { path }), pair[1]]
                : pair,
            );
          }
        } catch (e) {}
      },
      async placeOnServerHardest(sub, f, name, rank) {
        await baseMethods.placeOnServerHardest.call(this, sub, f, name, rank);
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
        await baseMethods.acceptRecordOnLevel.call(this, s, path);
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
    },
  };
}

export default patchComp(Base);
