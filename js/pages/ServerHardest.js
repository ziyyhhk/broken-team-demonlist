const SRC = 'https://cdn.jsdelivr.net/gh/ziyyhhk/broken-team-demonlist@d5aae64f1a1ba5a514e5644392b89a7bfdc6fbb8/js/pages/ServerHardest.js';
const jsBase = new URL('../', import.meta.url).href;

export default Vue.defineAsyncComponent(async () => {
  let code = await (await fetch(SRC)).text();

  code = code.replace(/(from\s+['"])\.\.\/([^'"]+)(['"])/g, function (_, a, p, c) {
    return a + jsBase + p + c;
  });

  // Classic meta: Creator / Victor / Verifier (only show Verifier if set and different)
  code = code.replace(
    '<template v-if="level.author">by {{ level.author }}</template>\n                                <template v-if="level.verifier"> · verified {{ level.verifier }}</template>',
    '<template v-if="level.author">Creator {{ level.author }}</template>\n                                <template v-if="level.victor"> · Victor {{ level.victor }}</template>\n                                <template v-if="level.verifier"> · Verifier {{ level.verifier }}</template>'
  );

  // Cards meta — full replace of author + verified line
  code = code.replace(
    '<template v-if="row.author">by {{ row.author }}</template>\n                                            <template v-if="row.verifier"> · verified {{ row.verifier }}</template>',
    '<template v-if="row.author">Creator {{ row.author }}</template>\n                                            <template v-if="row.victor"> · Victor {{ row.victor }}</template>\n                                            <template v-if="row.verifier"> · Verifier {{ row.verifier }}</template>'
  );
  // fallback shorter author-only replace
  code = code.replace(
    '<template v-if="row.author">by {{ row.author }}</template>',
    '<template v-if="row.author">Creator {{ row.author }}</template><template v-if="row.victor"> · Victor {{ row.victor }}</template><template v-if="row.verifier"> · Verifier {{ row.verifier }}</template>'
  );
  code = code.replace(
    /<template v-if="row\.verifier"> · verified \{\{ row\.verifier \}\}<\/template>/g,
    ''
  );

  // Info panel
  code = code.replace('<dt>Author</dt>', '<dt>Creator</dt>');
  code = code.replace(
    '<div class="info-row" v-if="row.verifier"><dt>Verifier</dt><dd>{{ row.verifier }}</dd></div>',
    '<div class="info-row" v-if="row.victor"><dt>Victor</dt><dd>{{ row.victor }}</dd></div>\n                                                    <div class="info-row" v-if="row.verifier"><dt>Verifier</dt><dd>{{ row.verifier }}</dd></div>'
  );
  // classic detail panel victor if present in level view stats area — ensure classic info has victor
  code = code.replace(
    '<template v-if="level.verifier"> · verified {{ level.verifier }}</template>',
    '<template v-if="level.victor"> · Victor {{ level.victor }}</template><template v-if="level.verifier"> · Verifier {{ level.verifier }}</template>'
  );

  // Remove Main / Extended / Legacy tabs (both classic + cards toolbars)
  code = code.replace(
    /<div class="list-tiers">[\s\S]*?<\/div>\s*\$\{viewToggleHtml\}/g,
    '${viewToggleHtml}'
  );
  // if viewToggle not adjacent
  code = code.replace(
    /<button type="button" class="list-tier"[^>]*>Main<\/button>\s*<button type="button" class="list-tier"[^>]*>Extended<\/button>\s*<button type="button" class="list-tier"[^>]*>Legacy<\/button>/g,
    ''
  );

  // Show ALL levels (no tier cutoffs)
  code = code.replace(
    /filtered\(\) \{[\s\S]*?return this\.levels\.map\(\(level, idx\) => \(\{ \.\.\.level, _idx: idx, _rank: idx \+ 1, _key: \(level\.name \|\| ''\) \+ '-' \+ idx \}\)\)\s*\.filter\(\(row\) => \{[\s\S]*?\}\);/,
    `filtered() {
            const q = this.query.trim().toLowerCase();
            return this.levels.map((level, idx) => ({ ...level, _idx: idx, _rank: idx + 1, _key: (level.name || '') + '-' + idx }))
                .filter((row) => {
                    if (!q) return true;
                    return (row.name || '').toLowerCase().includes(q)
                        || (row.author || '').toLowerCase().includes(q)
                        || (row.victor || '').toLowerCase().includes(q)
                        || (row.verifier || '').toLowerCase().includes(q);
                });`
  );

  // Remove pts / clears counter on cards (keep expand button)
  code = code.replace(
    '<div class="level-card__pts">{{ (row.records || []).length }}</div>\n                                        <div class="level-card__pts-label">clears</div>',
    ''
  );

  // Thumbnail helper
  code = code.replace(
    "thumb(level) {\n            const id = getYoutubeIdFromUrl(level.verification || '');\n            return id ? getThumbnailFromId(id) : '';\n        },",
    "thumb(level) {\n            if (!level) return '';\n            var t = level.thumbnail || '';\n            if (t) {\n              if (!/imgur\\.com\\/a\\//i.test(t) && !/imgur\\.com\\/gallery\\//i.test(t)) {\n                var im = t.match(/imgur\\.com\\/(?:gallery\\/)?([a-zA-Z0-9]{5,})/i);\n                if (im && t.indexOf('i.imgur.com') === -1) return 'https://i.imgur.com/' + im[1] + '.jpg';\n                return t;\n              }\n            }\n            var id = getYoutubeIdFromUrl(level.verification || '');\n            return id ? getThumbnailFromId(id) : '';\n        },"
  );

  if (code.indexOf('sh-preview-thumb') === -1) {
    code = code.replace(
      '<iframe v-if="video" class="video" :src="video" frameborder="0"',
      '<div class="sh-preview-thumb" v-if="level && (level.thumbnail || level.verification)">' +
        '<img :src="thumb(level)" alt="" loading="lazy" @error="onThumbError" />' +
        '</div>\n                            <iframe v-if="video" class="video" :src="video" frameborder="0"'
    );
  }

  const mod = await import(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })));
  return mod.default;
});
