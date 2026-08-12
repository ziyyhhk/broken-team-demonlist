const CDN = 'https://cdn.jsdelivr.net/gh/ziyyhhk/broken-team-demonlist@00c0b84e795b090160ec033468a460887755e292/js/pages/List.js';
const jsBase = new URL('../', import.meta.url).href;

export default Vue.defineAsyncComponent(async () => {
  let code = await (await fetch(CDN)).text();

  code = code.replace(/(from\s+['"])\.\.\/([^'"]+)(['"])/g, function (_, a, p, c) {
    return a + jsBase + p + c;
  });
  code = code.replace(/(from\s+['"])\.\/([^'"]+)(['"])/g, function (_, a, p, c) {
    return a + new URL('./', import.meta.url).href + p + c;
  });

  code = code.replace(
    'import LevelAuthors from',
    "import { filterDataExtras, filterMethods, applyFiltersAndSort, filterToolbarHtml } from '" + jsBase + "listFilters.js';\nimport LevelAuthors from"
  );

  code = code.replace(
    '</div>\n                        <transition-group name="tier-list"',
    '</div>\n                        ${filterToolbarHtml}\n                        <transition-group name="tier-list"'
  );

  code = code.replace(
    'list-search cards-search">\n                            <input type="text" v-model="query" placeholder="Search level" aria-label="Search level" />\n                        </div>',
    'list-search cards-search">\n                            <input type="text" v-model="query" placeholder="Search…" aria-label="Search level" />\n                        </div>\n                        ${filterToolbarHtml}'
  );

  code = code.replace(
    'query: "",\n        tier: "main",',
    'query: "",\n        ...filterDataExtras(),\n        tier: "main",'
  );

  code = code.replace(
    "filtered() {\n            const query = this.query.trim().toLowerCase();\n            const MAIN = this.MAIN_CUTOFF;\n            const EXT = this.EXTENDED_CUTOFF;\n            return this.list\n                .map(([level, err], index) => ({ level, err, index }))\n                .filter(({ level, err, index }) => {\n                    const rank = index + 1;\n                    let inTier = true;\n                    if (this.tier === \"main\") inTier = rank <= MAIN;\n                    else if (this.tier === \"extended\") inTier = rank > MAIN && rank <= EXT;\n                    else if (this.tier === \"legacy\") inTier = rank > EXT;\n                    if (!inTier) return false;\n                    if (query === \"\") return true;\n                    return (level?.name ?? err ?? \"\").toLowerCase().includes(query);\n                });\n        },",
    "filtered() {\n            const MAIN = this.MAIN_CUTOFF, EXT = this.EXTENDED_CUTOFF;\n            const rows = this.list.map(([level, err], index) => ({ level, err, index })).filter(({ index }) => {\n                const rank = index + 1;\n                if (this.tier === \"main\") return rank <= MAIN;\n                if (this.tier === \"extended\") return rank > MAIN && rank <= EXT;\n                return rank > EXT;\n            });\n            return applyFiltersAndSort(rows, this.query, this.filterTags, this.sortKey);\n        },"
  );

  code = code.replace(
    'setTier(t) {',
    '...filterMethods,\n        setTier(t) {'
  );

  const mod = await import(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })));
  return mod.default;
});
