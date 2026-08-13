const SRC = 'https://cdn.jsdelivr.net/gh/ziyyhhk/broken-team-demonlist@d5aae64f1a1ba5a514e5644392b89a7bfdc6fbb8/js/pages/ServerHardest.js';
const jsBase = new URL('../', import.meta.url).href;

export default Vue.defineAsyncComponent(async () => {
  let code = await (await fetch(SRC)).text();

  code = code.replace(/(from\s+['"])\.\.\/([^'"]+)(['"])/g, function (_, a, p, c) {
    return a + jsBase + p + c;
  });

  // Labels: Creator / Victor / Verifier
  code = code.replace(
    '<template v-if="level.author">by {{ level.author }}</template>\n                                <template v-if="level.verifier"> · verified {{ level.verifier }}</template>',
    '<template v-if="level.author">Creator {{ level.author }}</template>\n                                <template v-if="level.victor"> · Victor {{ level.victor }}</template>\n                                <template v-if="level.verifier"> · Verifier {{ level.verifier }}</template>'
  );
  code = code.replace(
    '<template v-if="row.author">by {{ row.author }}</template>\n                                            <template v-if="row.verifier"> · verified {{ row.verifier }}</template>',
    '<template v-if="row.author">Creator {{ row.author }}</template>\n                                            <template v-if="row.victor"> · Victor {{ row.victor }}</template>\n                                            <template v-if="row.verifier"> · Verifier {{ row.verifier }}</template>'
  );
  code = code.replace(
    '<template v-if="row.author">by {{ row.author }}</template>',
    '<template v-if="row.author">Creator {{ row.author }}</template><template v-if="row.victor"> · Victor {{ row.victor }}</template><template v-if="row.verifier"> · Verifier {{ row.verifier }}</template>'
  );
  code = code.replace(/<template v-if="row\.verifier"> · verified \{\{ row\.verifier \}\}<\/template>/g, '');
  code = code.replace('<dt>Author</dt>', '<dt>Creator</dt>');
  code = code.replace(
    '<div class="info-row" v-if="row.verifier"><dt>Verifier</dt><dd>{{ row.verifier }}</dd></div>',
    '<div class="info-row" v-if="row.victor"><dt>Victor</dt><dd>{{ row.victor }}</dd></div>\n                                                    <div class="info-row" v-if="row.verifier"><dt>Verifier</dt><dd>{{ row.verifier }}</dd></div>'
  );

  // Remove tier tabs
  code = code.replace(
    /<button type="button" class="list-tier"[^>]*>Main<\/button>\s*<button type="button" class="list-tier"[^>]*>Extended<\/button>\s*<button type="button" class="list-tier"[^>]*>Legacy<\/button>/g,
    ''
  );

  // All levels, no tier filter
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

  // Remove clears/pts counter on cards
  code = code.replace(
    '<div class="level-card__pts">{{ (row.records || []).length }}</div>\n                                        <div class="level-card__pts-label">clears</div>',
    ''
  );

  // beatList method — merges records + victors[] + victor field
  code = code.replace(
    'methods: {\n        embed,',
    `methods: {
        beatList(level) {
            if (!level) return [];
            var list = [];
            var seen = {};
            function add(user, link, attempts, date) {
                if (!user || !String(user).trim()) return;
                var key = String(user).trim().toLowerCase();
                if (seen[key]) {
                    var ex = list.find(function (x) { return x.user.toLowerCase() === key; });
                    if (ex && !ex.link && link) ex.link = link;
                    return;
                }
                seen[key] = true;
                list.push({ user: String(user).trim(), link: link || '', attempts: attempts, date: date || '' });
            }
            (level.records || []).forEach(function (r) { if (r) add(r.user, r.link, r.attempts, r.date); });
            (level.victors || []).forEach(function (v) {
                if (typeof v === 'string') add(v, level.verification);
                else if (v) add(v.name || v.user, v.video || v.link || level.verification, v.attempts, v.date);
            });
            if (level.victor) add(level.victor, level.verification);
            return list;
        },
        embed,`
  );

  // Classic "Who beat it" uses beatList + YT icon
  code = code.replace(
    'Who beat it ({{ (level.records || []).length }})</h2>\n                            <p class="rec-hint">Player · attempts · date</p>\n                            <table class="records" v-if="level.records && level.records.length">\n                                <tr class="record" v-for="(r, ri) in level.records" :key="ri">\n                                    <td class="user">\n                                        <a v-if="r.link" :href="r.link" target="_blank" rel="noopener" class="type-label-lg">{{ r.user }}</a>\n                                        <span v-else class="type-label-lg">{{ r.user }}</span>\n                                    </td>',
    'Who beat it ({{ beatList(level).length }})</h2>\n                            <p class="rec-hint">Player · attempts · date · video</p>\n                            <table class="records" v-if="beatList(level).length">\n                                <tr class="record" v-for="(r, ri) in beatList(level)" :key="ri">\n                                    <td class="user">\n                                        <span class="type-label-lg">{{ r.user }}</span>\n                                        <a v-if="r.link" class="yt-link" :href="r.link" target="_blank" rel="noopener" title="Watch completion" aria-label="YouTube">\n                                          <svg viewBox="0 0 24 24" width="18" height="18" fill="#f44"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8zM9.8 15.5v-7l6.3 3.5-6.3 3.5z"/></svg>\n                                        </a>\n                                    </td>'
  );
  code = code.replace(
    '<p v-else class="rec-hint">No clears logged yet.</p>',
    '<p v-else class="rec-hint">No clears yet — set Victor or add records in Admin.</p>'
  );

  // Cards expand "Who beat it"
  code = code.replace(
    '<span>Who beat it</span><span class="records-count">{{ (row.records || []).length }}</span></div>\n                                                <ul class="card-expand__records" v-if="row.records && row.records.length">\n                                                    <li v-for="(r, ri) in row.records" :key="ri">\n                                                        <a v-if="r.link" :href="r.link" target="_blank" rel="noopener" class="rec-user">{{ r.user }}</a>',
    '<span>Who beat it</span><span class="records-count">{{ beatList(row).length }}</span></div>\n                                                <ul class="card-expand__records" v-if="beatList(row).length">\n                                                    <li v-for="(r, ri) in beatList(row)" :key="ri">\n                                                        <span class="rec-user">{{ r.user }}</span>\n                                                        <a v-if="r.link" class="yt-link" :href="r.link" target="_blank" rel="noopener" title="Watch">\n                                                          <svg viewBox="0 0 24 24" width="16" height="16" fill="#f44"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8zM9.8 15.5v-7l6.3 3.5-6.3 3.5z"/></svg>\n                                                        </a>'
  );

  // Meta line: victor name + YT if verification set
  code = code.replace(
    '<template v-if="level.victor"> · Victor {{ level.victor }}</template>',
    '<template v-if="level.victor"> · Victor {{ level.victor }} <a v-if="level.verification" class="yt-link" :href="level.verification" target="_blank" rel="noopener" title="Victor video"><svg viewBox="0 0 24 24" width="14" height="14" fill="#f44" style="vertical-align:middle"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8zM9.8 15.5v-7l6.3 3.5-6.3 3.5z"/></svg></a></template>'
  );
  code = code.replace(
    '<template v-if="row.victor"> · Victor {{ row.victor }}</template>',
    '<template v-if="row.victor"> · Victor {{ row.victor }} <a v-if="row.verification" class="yt-link" :href="row.verification" target="_blank" rel="noopener" title="Victor video" @click.stop><svg viewBox="0 0 24 24" width="14" height="14" fill="#f44" style="vertical-align:middle"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8zM9.8 15.5v-7l6.3 3.5-6.3 3.5z"/></svg></a></template>'
  );

  // Thumb helper
  code = code.replace(
    "thumb(level) {\n            const id = getYoutubeIdFromUrl(level.verification || '');\n            return id ? getThumbnailFromId(id) : '';\n        },",
    "thumb(level) {\n            if (!level) return '';\n            var t = level.thumbnail || '';\n            if (t && !/imgur\\.com\\/a\\//i.test(t) && !/imgur\\.com\\/gallery\\//i.test(t)) {\n              var im = t.match(/imgur\\.com\\/(?:gallery\\/)?([a-zA-Z0-9]{5,})/i);\n              if (im && t.indexOf('i.imgur.com') === -1) return 'https://i.imgur.com/' + im[1] + '.jpg';\n              return t;\n            }\n            var id = getYoutubeIdFromUrl(level.verification || '');\n            return id ? getThumbnailFromId(id) : '';\n        },"
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
