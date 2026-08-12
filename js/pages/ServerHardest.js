const SRC = 'https://cdn.jsdelivr.net/gh/ziyyhhk/broken-team-demonlist@d5aae64f1a1ba5a514e5644392b89a7bfdc6fbb8/js/pages/ServerHardest.js';
const jsBase = new URL('../', import.meta.url).href;

export default Vue.defineAsyncComponent(async () => {
  let code = await (await fetch(SRC)).text();

  code = code.replace(/(from\s+['"])\.\.\/([^'"]+)(['"])/g, function (_, a, p, c) {
    return a + jsBase + p + c;
  });

  if (!code.includes('listFilters.js')) {
    code = code.replace(
      /import Spinner from ['"][^'"]+Spinner\.js['"];/,
      "import Spinner from '" + jsBase + "components/Spinner.js';\nimport { filterDataExtras, filterMethods, applyFiltersAndSort, filterToolbarHtml } from '" + jsBase + "listFilters.js';"
    );
  }

  code = code.replace(
    '<span class="count">{{ filtered.length }}</span>\n                        </div>',
    '<span class="count">{{ filtered.length }}</span>\n                        </div>\n                        ${filterToolbarHtml}'
  );

  code = code.replace(
    'list-search cards-search">\n                            <input type="text" v-model="query" placeholder="Search level" aria-label="Search" />\n                        </div>',
    'list-search cards-search">\n                            <input type="text" v-model="query" placeholder="Search…" aria-label="Search" />\n                        </div>\n                        ${filterToolbarHtml}'
  );

  code = code.replace(
    "levels: [], loading: true, selected: 0, expanded: null, query: '', tier: 'main',",
    "levels: [], loading: true, selected: 0, expanded: null, query: '', ...filterDataExtras(), tier: 'main',"
  );

  const oldFiltered = [
    'filtered() {',
    '            const q = this.query.trim().toLowerCase();',
    '            const MAIN = this.MAIN_CUTOFF, EXT = this.EXTENDED_CUTOFF;',
    "            return this.levels.map((level, idx) => ({ ...level, _idx: idx, _rank: idx + 1, _key: (level.name || '') + '-' + idx }))",
    '                .filter((row) => {',
    '                    const rank = row._rank;',
    '                    let inTier = true;',
    "                    if (this.tier === 'main') inTier = rank <= MAIN;",
    "                    else if (this.tier === 'extended') inTier = rank > MAIN && rank <= EXT;",
    "                    else if (this.tier === 'legacy') inTier = rank > EXT;",
    '                    if (!inTier) return false;',
    '                    if (!q) return true;',
    "                    return (row.name || '').toLowerCase().includes(q);",
    '                });',
    '        },',
  ].join('\n');

  const newFiltered = [
    'filtered() {',
    '            const q = this.query.trim().toLowerCase();',
    '            const MAIN = this.MAIN_CUTOFF, EXT = this.EXTENDED_CUTOFF;',
    '            const tags = this.filterTags || [];',
    "            let rows = this.levels.map((level, idx) => ({ ...level, _idx: idx, _rank: idx + 1, _key: (level.name || '') + '-' + idx }))",
    '                .filter((row) => {',
    '                    const rank = row._rank;',
    '                    let inTier = true;',
    "                    if (this.tier === 'main') inTier = rank <= MAIN;",
    "                    else if (this.tier === 'extended') inTier = rank > MAIN && rank <= EXT;",
    "                    else if (this.tier === 'legacy') inTier = rank > EXT;",
    '                    if (!inTier) return false;',
    "                    if (q && !(row.name || '').toLowerCase().includes(q)) return false;",
    '                    if (tags.length) {',
    '                        const lt = (row.tags || []).map((t) => String(t).toLowerCase());',
    '                        if (!tags.every((t) => lt.includes(String(t).toLowerCase()))) return false;',
    '                    }',
    '                    return true;',
    '                });',
    "            const key = this.sortKey || 'rank';",
    "            if (key === 'name') rows = rows.slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));",
    "            else if (key === 'id') rows = rows.slice().sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));",
    "            else if (key === 'length') rows = rows.slice().sort((a, b) => (parseFloat(a.length) || 0) - (parseFloat(b.length) || 0));",
    "            else if (key === 'records') rows = rows.slice().sort((a, b) => ((b.records || []).length) - ((a.records || []).length));",
    '            return rows;',
    '        },',
  ].join('\n');

  code = code.replace(oldFiltered, newFiltered);

  code = code.replace(
    "setTier(t) { if (this.tier === t) return; this.tier = t; this.query = ''; this.expanded = null; },",
    "...filterMethods,\n        setTier(t) { if (this.tier === t) return; this.tier = t; this.query = ''; this.expanded = null; },"
  );

  const mod = await import(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })));
  return mod.default;
});
