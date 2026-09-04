import { WEBHOOK_KEY, sendDiscordEmbed, buildNewSubmissionEmbed } from '../discordAnnounce.js';

const CDN =
  'https://cdn.jsdelivr.net/gh/ziyyhhk/broken-team-demonlist@a8c2cd8137b9948b239860a5dd46d6bc3f5a79cc/js/pages/Submit.js';
const jsBase = new URL('../', import.meta.url).href;

export default Vue.defineAsyncComponent(async () => {
  let code = await (await fetch(CDN)).text();

  code = code.replace(/(from\s+['"])\.\.\/([^'"]+)(['"])/g, function (_, a, p, c) {
    return a + jsBase + p + c;
  });
  code = code.replace(/(from\s+['"])\.\/([^'"]+)(['"])/g, function (_, a, p, c) {
    return a + new URL('./', import.meta.url).href + p + c;
  });

  code = code.replace(
    "import { WEBHOOK_KEY, sendDiscordWebhook } from",
    "import { WEBHOOK_KEY, sendDiscordEmbed, buildNewSubmissionEmbed } from",
  );

  const start = code.indexOf('if (webhook) {\n          const listLabel =');
  const endMarker = 'discordOk = !!(r && r.ok);\n        }';
  const end = code.indexOf(endMarker, start);
  if (start !== -1 && end !== -1) {
    const replacement =
      'if (webhook) {\n' +
      '          const r = await sendDiscordEmbed(webhook, buildNewSubmissionEmbed(entry));\n' +
      '          discordOk = !!(r && r.ok);\n' +
      '        }';
    code = code.slice(0, start) + replacement + code.slice(end + endMarker.length);
  }

  const mod = await import(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })));
  return mod.default;
});
