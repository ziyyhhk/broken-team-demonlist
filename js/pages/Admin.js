const parts = await Promise.all([0, 1, 2].map((i) =>
  fetch(new URL('./Admin_src_' + i + '.txt', import.meta.url)).then((r) => {
    if (!r.ok) throw new Error('Failed to load Admin_src_' + i);
    return r.text();
  })
));
let code = parts.join('');
const jsBase = new URL('../', import.meta.url).href;
const pagesBase = new URL('./', import.meta.url).href;
code = code.replace(/(from\s+['"])\.\.\/([^'"]+)(['"])/g, function (_, a, path, c) {
  return a + jsBase + path + c;
});
code = code.replace(/(from\s+['"])\.\/([^'"]+)(['"])/g, function (_, a, path, c) {
  return a + pagesBase + path + c;
});
const blob = new Blob([code], { type: 'text/javascript' });
const url = URL.createObjectURL(blob);
const mod = await import(url);
export default mod.default;
