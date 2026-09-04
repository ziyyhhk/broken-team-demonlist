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

  // Import filters + fetchImpossible + fetchPlatformer
  code = code.replace(
    "import { fetchEditors, fetchList, fetchConfig } from",
    "import { fetchEditors, fetchList, fetchConfig, fetchImpossible, fetchPlatformer } from"
  );
  code = code.replace(
    'import LevelAuthors from',
    "import { filterDataExtras, filterMethods, applyFiltersAndSort, filterToolbarHtml } from '" + jsBase + "listFilters.js';\nimport LevelAuthors from"
  );

  // Impossible + Platformer tier buttons
  code = code.split(
    "@click=\"setTier('legacy')\">Legacy</button>"
  ).join(
    "@click=\"setTier('legacy')\">Legacy</button>\n                                <button type=\"button\" class=\"list-tier\" :class=\"{ active: tier === 'impossible' }\" @click=\"setTier('impossible')\">Impossible</button>\n                                <button type=\"button\" class=\"list-tier\" :class=\"{ active: tier === 'platformer' }\" @click=\"setTier('platformer')\">Platformer</button>"
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
    'query: "",\n        ...filterDataExtras(),\n        impossibleList: [],\n        platformerList: [],\n        tier: "main",'
  );

  // Filtered: Impossible + Platformer + main/extended/legacy
  code = code.replace(
    "filtered() {\n            const query = this.query.trim().toLowerCase();\n            const MAIN = this.MAIN_CUTOFF;\n            const EXT = this.EXTENDED_CUTOFF;\n            return this.list\n                .map(([level, err], index) => ({ level, err, index }))\n                .filter(({ level, err, index }) => {\n                    const rank = index + 1;\n                    let inTier = true;\n                    if (this.tier === \"main\") inTier = rank <= MAIN;\n                    else if (this.tier === \"extended\") inTier = rank > MAIN && rank <= EXT;\n                    else if (this.tier === \"legacy\") inTier = rank > EXT;\n                    if (!inTier) return false;\n                    if (query === \"\") return true;\n                    return (level?.name ?? err ?? \"\").toLowerCase().includes(query);\n                });\n        },",
    "filtered() {\n            if (this.tier === 'impossible') {\n                const rows = (this.impossibleList || []).map(([level, err], index) => ({ level, err, index, impossible: true }));\n                return applyFiltersAndSort(rows, this.query, this.filterTags, this.sortKey);\n            }\n            if (this.tier === 'platformer') {\n                const rows = (this.platformerList || []).map(([level, err], index) => ({ level, err, index, platformer: true }));\n                return applyFiltersAndSort(rows, this.query, this.filterTags, this.sortKey);\n            }\n            const MAIN = this.MAIN_CUTOFF, EXT = this.EXTENDED_CUTOFF;\n            const rows = this.list.map(([level, err], index) => ({ level, err, index, impossible: false })).filter(({ index }) => {\n                const rank = index + 1;\n                if (this.tier === 'main') return rank <= MAIN;\n                if (this.tier === 'extended') return rank > MAIN && rank <= EXT;\n                return rank > EXT;\n            });\n            return applyFiltersAndSort(rows, this.query, this.filterTags, this.sortKey);\n        },"
  );

  code = code.replace(
    "level() {\n            return this.list[this.selected]?.[0] ?? null;\n        },",
    "level() {\n            if (this.tier === 'impossible') return this.impossibleList[this.selected]?.[0] ?? null;\n            if (this.tier === 'platformer') return this.platformerList[this.selected]?.[0] ?? null;\n            return this.list[this.selected]?.[0] ?? null;\n        },"
  );
  code = code.replace(
    "rankLabel() {\n            const r = this.selected + 1;\n            if (r <= this.MAIN_CUTOFF) return \"Main · Rank #\" + r;\n            if (r <= this.EXTENDED_CUTOFF) return \"Extended · Rank #\" + r;\n            return \"Legacy\";\n        },",
    "rankLabel() {\n            if (this.tier === 'impossible') return 'Impossible · #' + (this.selected + 1);\n            if (this.tier === 'platformer') return 'Platformer · #' + (this.selected + 1);\n            const r = this.selected + 1;\n            if (r <= this.MAIN_CUTOFF) return 'Main · Rank #' + r;\n            if (r <= this.EXTENDED_CUTOFF) return 'Extended · Rank #' + r;\n            return 'Legacy';\n        },"
  );

  code = code.replace(
    'setTier(t) {',
    '...filterMethods,\n        setTier(t) {'
  );

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

  code = code.replace(
    "tierName(index) {\n            const r = index + 1;\n            if (r <= this.MAIN_CUTOFF) return \"Main\";\n            if (r <= this.EXTENDED_CUTOFF) return \"Extended\";\n            return \"Legacy\";\n        },",
    "tierName(index) {\n            if (this.tier === 'impossible') return 'Impossible';\n            if (this.tier === 'platformer') return 'Platformer';\n            const r = index + 1;\n            if (r <= this.MAIN_CUTOFF) return 'Main';\n            if (r <= this.EXTENDED_CUTOFF) return 'Extended';\n            return 'Legacy';\n        },"
  );

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
    '<ul class="records records-list" v-if="level.records.length > 0" style="list-style:none;margin:0.5rem 0 0;padding:0;display:flex;flex-direction:column;gap:0.4rem;max-height:16rem;overflow-y:auto;width:100%">\n' +
    '                                <li v-for="(record, ri) in level.records" :key="ri" class="record" style="display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:0.45rem 0.6rem;border-radius:0.4rem;background:var(--color-background);width:100%;box-sizing:border-box">\n' +
    '                                    <a :href="record.link" target="_blank" rel="noopener" class="rec-user" style="font-weight:700;text-decoration:none;color:inherit;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1 1 auto;min-width:0;margin-right:1rem">{{ record.user }}</a>\n' +
    '                                    <span style="display:inline-flex;align-items:center;gap:0.75rem;flex:0 0 auto;white-space:nowrap">\n' +
    '                                        <a :href="record.link" target="_blank" rel="noopener" class="rec-watch" style="font-size:0.75rem;font-weight:700;color:var(--color-primary);text-decoration:none">Watch</a>\n' +
    '                                        <span class="rec-pct" style="font-weight:800;color:var(--color-primary);min-width:2.75rem;text-align:right">{{ record.percent }}%</span>\n' +
    '                                    </span>\n' +
    '                                </li>\n' +
    '                            </ul>';
  code = code.split(oldRec).join(newRec);

  code = code.split(
    '<h2>Victors / records ({{ level.records.length }})</h2>'
  ).join(
    '<h2>{{ (tier === \'impossible\' || tier === \'platformer\') ? \'Records / WR\' : \'Victors / records\' }} ({{ level.records.length }})</h2>'
  );
  code = code.split(
    'These are people who <strong>beat</strong> the level after verification (victors).'
  ).join(
    '<template v-if="tier === \'impossible\'">Progress and world records only — no victors on Impossible. A <strong>100%</strong> clear moves the level to the Main list.</template><template v-else-if="tier === \'platformer\'">Platformer list records.</template><template v-else>These are people who <strong>beat</strong> the level after verification (victors).</template>'
  );

  code = code.split(
    '{{ score(selected + 1, 100, level.percentToQualify) }}'
  ).join(
    '{{ (tier === \'impossible\' || tier === \'platformer\') ? 0 : score(selected + 1, 100, level.percentToQualify) }}'
  );
  code = code.split(
    '{{ score(index + 1, 100, level.percentToQualify) }}'
  ).join(
    '{{ (tier === \'impossible\' || tier === \'platformer\') ? 0 : score(index + 1, 100, level.percentToQualify) }}'
  );

  code = code.split(
    '<span>Victors</span>'
  ).join(
    '<span>{{ (tier === \'impossible\' || tier === \'platformer\') ? \'Records / WR\' : \'Victors\' }}</span>'
  );

  code = code.replace(
    'this.list = (await fetchList()) ?? [];\n        this.editors = await fetchEditors();',
    'this.list = (await fetchList()) ?? [];\n        this.impossibleList = (await fetchImpossible()) ?? [];\n        this.platformerList = (await fetchPlatformer()) ?? [];\n        this.editors = await fetchEditors();'
  );

  code = code.split(
    '<p v-if="index + 1 <= EXTENDED_CUTOFF" class="type-label-lg">#{{ index + 1 }}</p>\n                                    <p v-else class="type-label-lg legacy-tag">LEGACY</p>'
  ).join(
    '<p v-if="tier === \'impossible\' || tier === \'platformer\'" class="type-label-lg">#{{ index + 1 }}</p>\n                                    <p v-else-if="index + 1 <= EXTENDED_CUTOFF" class="type-label-lg">#{{ index + 1 }}</p>\n                                    <p v-else class="type-label-lg legacy-tag">LEGACY</p>'
  );

  const mod = await import(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })));
  return mod.default;
});
