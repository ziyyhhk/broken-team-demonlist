const base = new URL('.', import.meta.url).href;

async function load() {
  const parts = await Promise.all(
    [0, 1, 2].map((i) =>
      fetch(base + 'Admin_ab' + i + '.txt?t=' + Date.now(), { cache: 'no-store' }).then((r) => {
        if (!r.ok) throw new Error('Admin_ab' + i + ' ' + r.status);
        return r.text();
      }),
    ),
  );
  const bin = atob(parts.join(''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  let code = new TextDecoder().decode(bytes);
  const pagesBase = base;
  code = code.replace(/from\s+['"](\.\.?\/[^'"]+)['"]/g, (_, p) => {
    return "from '" + new URL(p, pagesBase).href + "'";
  });
  const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
  return import(url);
}

const mod = await load();
export default mod.default;
