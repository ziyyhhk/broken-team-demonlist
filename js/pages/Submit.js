import { WEBHOOK_KEY, sendDiscordEmbed, buildNewSubmissionEmbed } from '../discordAnnounce.js';

const CDN =
  'https://cdn.jsdelivr.net/gh/ziyyhhk/broken-team-demonlist@2feb53d823af6a743a925dc39a4d15a7455216bd/js/pages/Submit.js';
const jsBase = new URL('../', import.meta.url).href;

export default Vue.defineAsyncComponent(async () => {
  let code = await (await fetch(CDN + '?t=' + Date.now())).text();

  code = code.replace(/(from\s+['"])\.\.\/([^'"]+)(['"])/g, function (_, a, p, c) {
    return a + jsBase + p + c;
  });
  code = code.replace(/(from\s+['"])\.\/([^'"]+)(['"])/g, function (_, a, p, c) {
    return a + new URL('./', import.meta.url).href + p + c;
  });

  code = code.replace(
    'levelOptions() {\n      return (this.levels || [])\n        .filter((p) => p && p[0] && p[0].path)\n        .map((p, i) => ({\n          path: p[0].path,\n          name: p[0].name || p[0].path,\n          rank: i + 1,\n        }));\n    },',
    "isVerifying() {\n      return this.form.levelPath === '__verifying__';\n    },\n    levelOptions() {\n      return (this.levels || [])\n        .filter((p) => p && p[0] && p[0].path)\n        .map((p, i) => {\n          const lv = p[0];\n          const author = lv.author || (Array.isArray(lv.creators) && lv.creators[0]) || '';\n          return {\n            path: lv.path,\n            name: lv.name || lv.path,\n            rank: i + 1,\n            author: author,\n            length: lv.length != null ? String(lv.length) : '',\n            id: lv.id != null && lv.id !== '' ? String(lv.id) : '',\n            verifier: lv.verifier || '',\n          };\n        });\n    },",
  );

  code = code.replace(
    "filterStatus() {\n      this.page = 0;\n    },\n  },",
    "filterStatus() {\n      this.page = 0;\n    },\n    'form.levelPath'(path) {\n      this.onLevelPathChange(path);\n    },\n  },",
  );

  code = code.replace(
    '<div class="submit-field">\n            <label>Verifier <span class="req">*</span></label>\n            <input v-model="form.verifier" placeholder="Level verifier" maxlength="40" autocomplete="off" />\n          </div>',
    '<div class="submit-field" v-if="isVerifying">\n            <label>Verifier <span class="req">*</span></label>\n            <input v-model="form.verifier" placeholder="Level verifier" maxlength="40" autocomplete="off" />\n          </div>',
  );

  code = code.replace(
    '<input v-model="form.creator" placeholder="Level creator" maxlength="40" autocomplete="off" />',
    '<input v-model="form.creator" placeholder="Level creator" maxlength="40" autocomplete="off" :readonly="!isVerifying && !!form.levelPath" />',
  );

  code = code.replace(
    '<input v-model="form.length" placeholder="e.g. 1:12 or 72s" />',
    '<input v-model="form.length" placeholder="e.g. 1:12 or 72s" :readonly="!isVerifying && !!form.levelPath" />',
  );

  code = code.replace(
    '<label>Custom ID</label>\n            <input v-model="form.customId" placeholder="ID of the level copy used" />',
    '<label>Level ID</label>\n            <input v-model="form.customId" placeholder="ID of the level" :readonly="!isVerifying && !!form.levelPath" />',
  );

  code = code.replace(
    "if (!(this.form.creator || '').trim()) return 'Creator is required.';\n      if (!(this.form.verifier || '').trim()) return 'Verifier is required.';",
    "if (!(this.form.creator || '').trim()) return 'Creator is required.';\n      if (this.isVerifying && !(this.form.verifier || '').trim()) return 'Verifier is required.';",
  );

  code = code.replace(
    'methods: {\n    statusLabel,\n    linkHref: safeHref,',
    "methods: {\n    statusLabel,\n    linkHref: safeHref,\n    onLevelPathChange(path) {\n      if (!path || path === '__verifying__') {\n        if (path === '__verifying__') return;\n        this.form.creator = '';\n        this.form.verifier = '';\n        this.form.length = '';\n        this.form.customId = '';\n        return;\n      }\n      const lv = (this.levelOptions || []).find((l) => l.path === path);\n      if (!lv) return;\n      this.form.creator = lv.author || '';\n      this.form.length = lv.length || '';\n      this.form.customId = lv.id || '';\n      this.form.verifier = '';\n    },",
  );

  const mod = await import(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })));
  return mod.default;
});
