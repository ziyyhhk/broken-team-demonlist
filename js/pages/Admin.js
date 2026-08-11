const base = new URL('.', import.meta.url).href;
const jsBase = new URL('../', import.meta.url).href;

async function load() {
  const [a, b] = await Promise.all([
    fetch(base + 'Admin_p0.txt?t=' + Date.now(), { cache: 'no-store' }).then(r => r.text()),
    fetch(base + 'Admin_p1.txt?t=' + Date.now(), { cache: 'no-store' }).then(r => r.text()),
  ]);
  let code = a + b;
  code = code.replace(/from\s+['"](\.\.\/[^'"]+)['"]/g, (_, p) => "from '" + new URL(p, jsBase).href + "'");
  code = code.replace(/from\s+['"](\.\/[^'"]+)['"]/g, (_, p) => "from '" + new URL(p, base).href + "'");
  const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
  return import(url);
}
const mod = await load();
export default mod.default;
