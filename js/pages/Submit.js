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

  // Remove joke devices
  code = code.replace(/\{ value: 'Fridge'[^}]+\},?\s*/g, '');
  code = code.replace(/\{ value: 'Microwave'[^}]+\},?\s*/g, '');
  code = code.replace(
    "this.form.device === 'Fridge' || this.form.device === 'Microwave'",
    'false',
  );

  // isVerifying + showCreator / showVerifier
  if (!code.includes('isVerifying()')) {
    code = code.replace(
      'levelOptions() {\n      return (this.levels || [])\n        .filter((p) => p && p[0] && p[0].path)\n        .map((p, i) => ({\n          path: p[0].path,\n          name: p[0].name || p[0].path,\n          rank: i + 1,\n        }));\n    },',
      "isVerifying() {\n      return this.form.levelPath === '__verifying__';\n    },\n    showCreator() {\n      return this.isImpossible || this.isVerifying;\n    },\n    showVerifier() {\n      return this.isVerifying;\n    },\n    levelOptions() {\n      return (this.levels || [])\n        .filter((p) => p && p[0] && p[0].path)\n        .map((p, i) => {\n          const lv = p[0];\n          const author = lv.author || (Array.isArray(lv.creators) && lv.creators[0]) || '';\n          return {\n            path: lv.path,\n            name: lv.name || lv.path,\n            rank: i + 1,\n            author: author,\n            length: lv.length != null ? String(lv.length) : '',\n            id: lv.id != null && lv.id !== '' ? String(lv.id) : '',\n            verifier: lv.verifier || '',\n          };\n        });\n    },",
    );
  } else {
    if (!code.includes('showCreator()')) {
      code = code.replace(
        "isVerifying() {\n      return this.form.levelPath === '__verifying__';\n    },",
        "isVerifying() {\n      return this.form.levelPath === '__verifying__';\n    },\n    showCreator() {\n      return this.isImpossible || this.isVerifying;\n    },\n    showVerifier() {\n      return this.isVerifying;\n    },",
      );
    }
    // upgrade old needCreatorVerifier if present
    code = code.replace(
      "needCreatorVerifier() {\n      return this.isImpossible || this.isVerifying;\n    },",
      "showCreator() {\n      return this.isImpossible || this.isVerifying;\n    },\n    showVerifier() {\n      return this.isVerifying;\n    },",
    );
  }

  // Creator: Impossible or verifying
  code = code.replace(
    `<div class="submit-field">
            <label>Creator <span class="req">*</span></label>
            <input v-model="form.creator" placeholder="Level creator" maxlength="40" autocomplete="off" />
          </div>`,
    `<div class="submit-field" v-if="showCreator">
            <label>Creator <span class="req">*</span></label>
            <input v-model="form.creator" placeholder="Level creator" maxlength="40" autocomplete="off" />
          </div>`,
  );
  code = code.replace(
    'v-if="needCreatorVerifier">\n            <label>Creator',
    'v-if="showCreator">\n            <label>Creator',
  );

  // Verifier: verifying only (not Impossible, not victor)
  code = code.replace(
    `<div class="submit-field">
            <label>Verifier <span class="req">*</span></label>
            <input v-model="form.verifier" placeholder="Level verifier" maxlength="40" autocomplete="off" />
          </div>`,
    `<div class="submit-field" v-if="showVerifier">
            <label>Verifier <span class="req">*</span></label>
            <input v-model="form.verifier" placeholder="Level verifier" maxlength="40" autocomplete="off" />
          </div>`,
  );
  code = code.replace(
    'v-if="needCreatorVerifier">\n            <label>Verifier',
    'v-if="showVerifier">\n            <label>Verifier',
  );
  code = code.replace(
    'v-if="isVerifying">\n            <label>Verifier',
    'v-if="showVerifier">\n            <label>Verifier',
  );

  // Validate
  code = code.replace(
    "if (!(this.form.creator || '').trim()) return 'Creator is required.';\n      if (!(this.form.verifier || '').trim()) return 'Verifier is required.';",
    "if (this.showCreator && !(this.form.creator || '').trim()) return 'Creator is required.';\n      if (this.showVerifier && !(this.form.verifier || '').trim()) return 'Verifier is required.';",
  );
  code = code.replace(
    "if (this.needCreatorVerifier) {\n        if (!(this.form.creator || '').trim()) return 'Creator is required.';\n        if (!(this.form.verifier || '').trim()) return 'Verifier is required.';\n      }",
    "if (this.showCreator && !(this.form.creator || '').trim()) return 'Creator is required.';\n      if (this.showVerifier && !(this.form.verifier || '').trim()) return 'Verifier is required.';",
  );
  code = code.replace(
    "if (!(this.form.creator || '').trim()) return 'Creator is required.';\n      if (this.isVerifying && !(this.form.verifier || '').trim()) return 'Verifier is required.';",
    "if (this.showCreator && !(this.form.creator || '').trim()) return 'Creator is required.';\n      if (this.showVerifier && !(this.form.verifier || '').trim()) return 'Verifier is required.';",
  );

  const mod = await import(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })));
  return mod.default;
});
