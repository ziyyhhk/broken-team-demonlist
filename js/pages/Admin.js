/**
 * Bootstrap: loads full Admin panel (with Activity Log) from base64 parts.
 * Written so large source can be pushed in chunks.
 */
const PARTS = [
  './data/_admin_b64_0.txt',
  './data/_admin_b64_1.txt',
  './data/_admin_b64_2.txt',
];

async function loadAdmin() {
  const chunks = [];
  for (const path of PARTS) {
    const res = await fetch(path + '?t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to load ' + path);
    chunks.push(await res.text());
  }
  const b64 = chunks.join('').replace(/\s+/g, '');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const code = new TextDecoder().decode(bytes);
  const blob = new Blob([code], { type: 'text/javascript' });
  const url = URL.createObjectURL(blob);
  return import(url);
}

const mod = await loadAdmin();
export default mod.default;
