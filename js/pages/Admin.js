/**
 * Load known-good Admin source, rewrite relative imports against this file's folder.
 * Resolving from js/pages/ means ../auth.js -> js/auth.js (correct).
 */
const SRC =
  'https://raw.githubusercontent.com/ziyyhhk/broken-team-demonlist/1ed15d470ab131c2c8c8789fcbd74d023260dde2/js/pages/Admin.js';

const pagesBase = new URL('.', import.meta.url).href;

async function loadAdmin() {
  const res = await fetch(SRC + '?t=' + Date.now(), { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load Admin: ' + res.status);
  let code = await res.text();
  code = code.replace(/from\s+['"](\.\.?\/[^'"]+)['"]/g, function (_, p) {
    return "from '" + new URL(p, pagesBase).href + "'";
  });
  const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
  return import(url);
}

const mod = await loadAdmin();
export default mod.default;
