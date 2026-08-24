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

  // Custom thumbnail URL, else YouTube (no regex literals — keeps the blob module valid)
  var oldThumb =
    'thumb(level) {\n' +
    '            const id = getYoutubeIdFromUrl(level.verification || "");\n' +
    '            return id ? getThumbnailFromId(id) : "";\n' +
    '        },';
  var newThumb =
    'thumb(level) {\n' +
    '            if (!level) return "";\n' +
    '            var t = String(level.thumbnail || "").trim();\n' +
    '            if (t) return t;\n' +
    '            var id = getYoutubeIdFromUrl(level.verification || "");\n' +
    '            return id ? getThumbnailFromId(id) : "";\n' +
    '        },';
  code = code.split(oldThumb).join(newThumb);

  // Classic records → same layout as cards: name | Watch | %
  var oldRec =
    '<table class="records" v-if="level.records.length > 0">\n' +
    '                                <tr v-for="record in level.records" class="record">\n' +
    '                                    <td class="percent"><p>{{ record.percent }}%</p></td>\n' +
    '                                    <td class="user">\n' +
    '                                        <a :href="record.link" target="_blank" rel="noopener" class="type-label-lg">{{ record.user }}</a>\n' +
    '                                    </td>\n' +
    '                                    <td class="hz"><p>{{ record.hz }}Hz</p></td>\n' +
    '                                </tr>\n' +
    '                            </table>';
  var newRec =
    '<ul class="records records-list" v-if="level.records.length > 0">\n' +
    '                                <li v-for="(record, ri) in level.records" :key="ri" class="record">\n' +
    '                                    <a :href="record.link" target="_blank" rel="noopener" class="rec-user">{{ record.user }}</a>\n' +
    '                                    <a :href="record.link" target="_blank" rel="noopener" class="rec-watch">Watch</a>\n' +
    '                                    <span class="rec-pct">{{ record.percent }}%</span>\n' +
    '                                </li>\n' +
    '                            </ul>';
  code = code.split(oldRec).join(newRec);

  const mod = await import(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })));
  return mod.default;
});
