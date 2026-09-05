/**
 * Admin — SH victor accept + previous patches (rich embeds, no auto victor on verify).
 */
import Spinner from '../components/Spinner.js';
import {
  WEBHOOK_KEY,
  sendDiscordEmbed,
  buildSubmissionStatusEmbed,
  buildCongratsEmbed,
} from '../discordAnnounce.js';

const CDN =
  'https://cdn.jsdelivr.net/gh/ziyyhhk/broken-team-demonlist@0df74826a327e91f6a9d0dddcd869b93207a069a/js/pages/Admin.js';
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
          if (
            String(e.name || '').toLowerCase() === String(s.levelName || '').toLowerCase()
          )
            return true;
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
    }),
    async mounted() {
      if (typeof Comp.mounted === 'function') await Comp.mounted.call(this);
    },
  };
}

export default patchComp(Base);
