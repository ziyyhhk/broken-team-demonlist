/**
 * Load Admin panel source as text, rewrite relative imports, eval as module.
 * Prefers local AdminFull.txt (enhanced), falls back to known-good commit.
 */
const LOCAL = new URL('./AdminFull.txt', import.meta.url).href;
const FALLBACK =
  'https://raw.githubusercontent.com/ziyyhhk/broken-team-demonlist/1ed15d470ab131c2c8c8789fcbd74d023260dde2/js/pages/Admin.js';

const jsBase = new URL('../', import.meta.url).href;
const pagesBase = new URL('.', import.meta.url).href;

async function fetchSource() {
  try {
    const res = await fetch(LOCAL + '?t=' + Date.now(), { cache: 'no-store' });
    if (res.ok) return res.text();
  } catch (e) {}
  const res = await fetch(FALLBACK + '?t=' + Date.now(), { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load Admin: ' + res.status);
  return res.text();
}

async function loadAdmin() {
  let code = await fetchSource();
  code = code.replace(/from\s+['"](\.\.\/[^'"]+)['"]/g, (_, p) => "from '" + new URL(p, jsBase).href + "'");
  code = code.replace(/from\s+['"](\.\/[^'"]+)['"]/g, (_, p) => "from '" + new URL(p, pagesBase).href + "'");
  const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
  return import(url);
}

const mod = await loadAdmin();
export default mod.default;
