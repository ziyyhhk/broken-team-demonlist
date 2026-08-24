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

  // Classic records: percent | centered name | YouTube icon (no Hz)
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
    '<table class="records" v-if="level.records.length > 0">\n' +
    '                                <tr v-for="record in level.records" class="record">\n' +
    '                                    <td class="percent"><p>{{ record.percent }}%</p></td>\n' +
    '                                    <td class="user">\n' +
    '                                        <a :href="record.link" target="_blank" rel="noopener" class="type-label-lg">{{ record.user }}</a>\n' +
    '                                    </td>\n' +
    '                                    <td class="rec-yt">\n' +
    '                                        <a v-if="record.link" :href="record.link" target="_blank" rel="noopener" class="yt-link" title="Watch">\n' +
    '                                            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#FF0000" d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8z"/><path fill="#fff" d="M9.75 15.5V8.5L15.5 12l-5.75 3.5z"/></svg>\n' +
    '                                        </a>\n' +
    '                                    </td>\n' +
    '                                </tr>\n' +
    '                            </table>';
  code = code.split(oldRec).join(newRec);

  const mod = await import(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })));
  return mod.default;
});
