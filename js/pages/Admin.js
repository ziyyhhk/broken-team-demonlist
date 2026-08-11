/**
 * TEMP: load working Admin from historical commit so panel is usable.
 * Log page will be added in a follow-up once source is restored cleanly.
 */
const SRC = 'https://raw.githubusercontent.com/ziyyhhk/broken-team-demonlist/c8877705bbca81cd8867195ca21bfd985d896c9c/js/pages/Admin.js';

async function loadAdmin() {
  const res = await fetch(SRC + '?t=' + Date.now(), { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load Admin source: ' + res.status);
  const code = await res.text();
  const blob = new Blob([code], { type: 'text/javascript' });
  const url = URL.createObjectURL(blob);
  return import(url);
}

const mod = await loadAdmin();
export default mod.default;
