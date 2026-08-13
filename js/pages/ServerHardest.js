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

  // Victor instead of verifier
  code = code.replace(
    '<template v-if="level.verifier"> · verified {{ level.verifier }}</template>',
    '<template v-if="level.victor || level.verifier"> · victor {{ level.victor || level.verifier }}</template>'
  );
  code = code.replace(/>Verifier</g, '>Victor<');
  code = code.replace(/verified by \{\{ ?row\.verifier ?\}\}/gi, 'victor {{ row.victor || row.verifier }}');

  // YouTube / custom thumbnail above video embed
  if (code.indexOf('sh-preview-thumb') === -1) {
    code = code.replace(
      '<iframe v-if="video" class="video" :src="video" frameborder="0"',
      '<div class="sh-preview-thumb" v-if="level && (level.thumbnail || level.verification)">' +
        '<img :src="level.thumbnail || thumb(level)" alt="" loading="lazy" @error="onThumbError" />' +
        '</div>\n                            <iframe v-if="video" class="video" :src="video" frameborder="0"'
    );
  }

  // Prefer custom thumbnail image URL over YouTube poster
  code = code.replace(
    /thumb\s*\(\s*row\s*\)\s*\{[\s\S]*?\n\s*\},/,
    'thumb(row) {\n            if (!row) return \'\';\n            if (row.thumbnail) return row.thumbnail;\n            var id = getYoutubeIdFromUrl(row.verification || row.video || \'\');\n            return id ? getThumbnailFromId(id) : \'\';\n        },'
  );
  code = code.replace(
    ':src="thumb(level)"',
    ':src="(level && level.thumbnail) || thumb(level)"'
  );
  code = code.replace(
    ':src="thumb(row)"',
    ':src="row.thumbnail || thumb(row)"'
  );

  const mod = await import(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })));
  return mod.default;
});
