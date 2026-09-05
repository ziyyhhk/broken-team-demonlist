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

  code = code.replace(/\{ value: 'Fridge'[^}]+\},?\s*/g, '');
  code = code.replace(/\{ value: 'Microwave'[^}]+\},?\s*/g, '');
  code = code.replace(
    "this.form.device === 'Fridge' || this.form.device === 'Microwave'",
    'false',
  );

  code = code.replace('levels: [],', "levels: [],\n    serverHardest: [],");

  const levelBlock =
    "isImpossible() {\n      return this.form.listTarget === 'impossible';\n    },\n    levelOptions() {\n      return (this.levels || [])\n        .filter((p) => p && p[0] && p[0].path)\n        .map((p, i) => ({\n          path: p[0].path,\n          name: p[0].name || p[0].path,\n          rank: i + 1,\n        }));\n    },";

  const levelBlockNew =
    "isImpossible() {\n      return this.form.listTarget === 'impossible';\n    },\n    isVerifying() {\n      return this.form.levelPath === '__verifying__';\n    },\n    showCreator() {\n      return this.isImpossible || this.isVerifying;\n    },\n    showVerifier() {\n      return this.isVerifying;\n    },\n    isServerHardest() {\n      return this.form.listTarget === 'server_hardest';\n    },\n    levelOptions() {\n      if (this.form.listTarget === 'server_hardest') {\n        return (this.serverHardest || []).map((e, i) => ({\n          path: 'sh:' + String(e.id || e.name || i),\n          name: e.name || String(e.id || i),\n          rank: i + 1,\n          author: e.author || '',\n          length: e.length != null ? String(e.length) : '',\n          id: e.id != null && e.id !== '' ? String(e.id) : '',\n          verifier: e.verifier || '',\n        }));\n      }\n      return (this.levels || [])\n        .filter((p) => p && p[0] && p[0].path)\n        .map((p, i) => {\n          const lv = p[0];\n          const author = lv.author || (Array.isArray(lv.creators) && lv.creators[0]) || '';\n          return {\n            path: lv.path,\n            name: lv.name || lv.path,\n            rank: i + 1,\n            author: author,\n            length: lv.length != null ? String(lv.length) : '',\n            id: lv.id != null && lv.id !== '' ? String(lv.id) : '',\n            verifier: lv.verifier || '',\n          };\n        });\n    },";

  if (code.includes(levelBlock)) {
    code = code.replace(levelBlock, levelBlockNew);
  } else if (!code.includes('isServerHardest()')) {
    code = code.replace(
      "isImpossible() {\n      return this.form.listTarget === 'impossible';\n    },",
      "isImpossible() {\n      return this.form.listTarget === 'impossible';\n    },\n    isVerifying() {\n      return this.form.levelPath === '__verifying__';\n    },\n    showCreator() {\n      return this.isImpossible || this.isVerifying;\n    },\n    showVerifier() {\n      return this.isVerifying;\n    },\n    isServerHardest() {\n      return this.form.listTarget === 'server_hardest';\n    },",
    );
  }

  code = code.replace(
    `<div class="submit-field">\n            <label>Creator <span class="req">*</span></label>\n            <input v-model="form.creator" placeholder="Level creator" maxlength="40" autocomplete="off" />\n          </div>`,
    `<div class="submit-field" v-if="showCreator">\n            <label>Creator <span class="req">*</span></label>\n            <input v-model="form.creator" placeholder="Level creator" maxlength="40" autocomplete="off" />\n          </div>`,
  );
  code = code.replace(
    `<div class="submit-field">\n            <label>Verifier <span class="req">*</span></label>\n            <input v-model="form.verifier" placeholder="Level verifier" maxlength="40" autocomplete="off" />\n          </div>`,
    `<div class="submit-field" v-if="showVerifier">\n            <label>Verifier <span class="req">*</span></label>\n            <input v-model="form.verifier" placeholder="Level verifier" maxlength="40" autocomplete="off" />\n          </div>`,
  );

  code = code.replace(
    `<div class="submit-field">\n            <label>Level length</label>\n            <input v-model="form.length" placeholder="e.g. 1:12 or 72s" />\n          </div>`,
    `<div class="submit-field" v-if="isVerifying">\n            <label>Level length</label>\n            <input v-model="form.length" placeholder="e.g. 1:12 or 72s" />\n          </div>`,
  );
  code = code.replace(
    `<div class="submit-field">\n            <label>Custom ID</label>\n            <input v-model="form.customId" placeholder="ID of the level copy used" />\n          </div>`,
    `<div class="submit-field" v-if="isVerifying">\n            <label>Level ID</label>\n            <input v-model="form.customId" placeholder="ID of the level copy used" />\n          </div>`,
  );

  code = code.replace(
    "if (!(this.form.creator || '').trim()) return 'Creator is required.';\n      if (!(this.form.verifier || '').trim()) return 'Verifier is required.';",
    "if (this.showCreator && !(this.form.creator || '').trim()) return 'Creator is required.';\n      if (this.showVerifier && !(this.form.verifier || '').trim()) return 'Verifier is required.';",
  );

  code = code.replace(
    'watch: {\n    filterLevel() {\n      this.page = 0;\n    },',
    "watch: {\n    'form.listTarget'() {\n      this.form.levelPath = '';\n      this.form.levelName = '';\n    },\n    filterLevel() {\n      this.page = 0;\n    },",
  );

  code = code.replace(
    "try {\n      this.levels = (await fetchList()) || [];\n    } catch (e) {\n      this.levels = [];\n    }",
    "try {\n      this.levels = (await fetchList()) || [];\n    } catch (e) {\n      this.levels = [];\n    }\n    try {\n      const shRes = await fetch('./data/_server_hardest.json?t=' + Date.now(), { cache: 'no-store' });\n      if (shRes.ok) {\n        const shData = await shRes.json();\n        this.serverHardest = Array.isArray(shData) ? shData : [];\n      } else {\n        this.serverHardest = [];\n      }\n    } catch (e) {\n      this.serverHardest = [];\n    }",
  );

  const mod = await import(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })));
  return mod.default;
});
