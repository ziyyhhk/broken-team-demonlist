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

  // levelOptions + autofill + hide verifier for victors (from earlier patches if present in CDN they may not be - apply if missing)
  if (!code.includes('isVerifying()')) {
    code = code.replace(
      'levelOptions() {\n      return (this.levels || [])\n        .filter((p) => p && p[0] && p[0].path)\n        .map((p, i) => ({\n          path: p[0].path,\n          name: p[0].name || p[0].path,\n          rank: i + 1,\n        }));\n    },',
      "isVerifying() {\n      return this.form.levelPath === '__verifying__';\n    },\n    levelOptions() {\n      return (this.levels || [])\n        .filter((p) => p && p[0] && p[0].path)\n        .map((p, i) => {\n          const lv = p[0];\n          const author = lv.author || (Array.isArray(lv.creators) && lv.creators[0]) || '';\n          return {\n            path: lv.path,\n            name: lv.name || lv.path,\n            rank: i + 1,\n            author: author,\n            length: lv.length != null ? String(lv.length) : '',\n            id: lv.id != null && lv.id !== '' ? String(lv.id) : '',\n            verifier: lv.verifier || '',\n          };\n        });\n    },",
    );
  }

  const mod = await import(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })));
  return mod.default;
});
