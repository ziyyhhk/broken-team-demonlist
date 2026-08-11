const parts = await Promise.all([0,1,2,3,4].map(i => fetch(new URL("./Admin_chunk_"+i+".txt", import.meta.url)).then(r => { if (!r.ok) throw new Error("Admin_chunk_"+i); return r.text(); })));
let code = atob(parts.join(""));
const jsBase = new URL("../", import.meta.url).href;
const pagesBase = new URL("./", import.meta.url).href;
code = code.replace(/(from\s+['"])\.\.\/([^'"]+)(['"])/g, function (_, a, p, c) { return a + jsBase + p + c; });
code = code.replace(/(from\s+['"])\.\/([^'"]+)(['"])/g, function (_, a, p, c) { return a + pagesBase + p + c; });
export default (await import(URL.createObjectURL(new Blob([code], { type: "text/javascript" })))).default;
