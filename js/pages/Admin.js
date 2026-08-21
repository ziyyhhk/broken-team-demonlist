export default Vue.defineAsyncComponent(async () => {
  const CDN = 'https://cdn.jsdelivr.net/gh/ziyyhhk/broken-team-demonlist@1562ed3c8171bf007a22daa608c535e9eef4f659/js/pages/Admin.js';
  const WRAP = 'https://cdn.jsdelivr.net/gh/ziyyhhk/broken-team-demonlist@710db5ba848233ac6580fa4f02494ff3847170b4/js/pages/Admin.js';
  try {
    const code = await (await fetch(WRAP + '?t=' + Date.now())).text();
    if (code && code.indexOf('defineAsyncComponent') !== -1 && code.indexOf('PLACEHOLDER') === -1) {
      const mod = await import(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })));
      return mod.default;
    }
  } catch (e) {}
  const jsBase = new URL('../', import.meta.url).href;
  const pagesBase = new URL('./', import.meta.url).href;
  let code = await (await fetch(CDN)).text();
  code = code.replace(/(from\s+['"])\.\.\/([^'"]+)(['"])/g, function (_, a, p, c) {
    return a + jsBase + p + c;
  });
  code = code.replace(/(from\s+['"])\.\/([^'"]+)(['"])/g, function (_, a, p, c) {
    return a + pagesBase + p + c;
  });
  const mod = await import(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })));
  return mod.default;
});
