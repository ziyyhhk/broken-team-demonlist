const SRC = 'https://cdn.jsdelivr.net/gh/ziyyhhk/broken-team-demonlist@d5aae64f1a1ba5a514e5644392b89a7bfdc6fbb8/js/pages/ServerHardest.js';
const jsBase = new URL('../', import.meta.url).href;

export default Vue.defineAsyncComponent(async () => {
  let code = await (await fetch(SRC)).text();

  code = code.replace(/(from\s+['"])\.\.\/([^'"]+)(['"])/g, function (_, a, p, c) {
    return a + jsBase + p + c;
  });

  code = code.replace(
    '<template v-if="level.author">by {{ level.author }}</template>\n                                <template v-if="level.verifier"> · verified {{ level.verifier }}</template>',
    '<template v-if="level.author">Creator {{ level.author }}</template>\n                                <template v-if="level.victor"> · Victor {{ level.victor }}</template>\n                                <template v-if="level.verifier"> · Verifier {{ level.verifier }} <a v-if="level.verifierVideo" class="yt-link" :href="level.verifierVideo" target="_blank" rel="noopener" title="Verifier video"><svg viewBox="0 0 24 24" width="14" height="14" fill="#f44" style="vertical-align:middle"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8zM9.8 15.5v-7l6.3 3.5-6.3 3.5z"/></svg></a></template>'
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
    '<div class="info-row" v-if="row.victor"><dt>Victor</dt><dd>{{ row.victor }}</dd></div>\n                                                    <div class="info-row" v-if="row.verifier"><dt>Verifier</dt><dd>{{ row.verifier }} <a v-if="row.verifierVideo" class="yt-link" :href="row.verifierVideo" target="_blank" rel="noopener" @click.stop title="Verifier video"><svg viewBox="0 0 24 24" width="14" height="14" fill="#f44"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8zM9.8 15.5v-7l6.3 3.5-6.3 3.5z"/></svg></a></dd></div>'
  );

  code = code.replace(
    /<button type="button" class="list-tier"[^>]*>Main<\/button>\s*<button type="button" class="list-tier"[^>]*>Extended<\/button>\s*<button type="button" class="list-tier"[^>]*>Legacy<\/button>/g,
    ''
  );

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

  // Cards: video embed instead of thumbnail
  code = code.replace(
    '<div class="level-card__thumb">\n                                        <img v-if="row.verification" :src="thumb(row)" alt="" @error="onThumbError" />\n                                        <div v-else class="level-card__thumb-fallback">?</div>\n                                        <span class="level-card__rank">{{ row._rank <= EXTENDED_CUTOFF ? \'#' + row._rank : \'LEGACY\' }}</span>\n                                    </div>',
    '<div class="level-card__thumb level-card__thumb--video">\n                                        <iframe v-if="row.verification" class="level-card__video" :src="embed(row.verification)" title="video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>\n                                        <img v-else-if="row.thumbnail" :src="thumb(row)" alt="" @error="onThumbError" />\n                                        <div v-else class="level-card__thumb-fallback">?</div>\n                                        <span class="level-card__rank">#{{ row._rank }}</span>\n                                    </div>'
  );

  code = code.replace(
    '<div class="level-card__pts">{{ (row.records || []).length }}</div>\n                                        <div class="level-card__pts-label">clears</div>',
    ''
  );

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
            if (level.victor) add(level.victor, level.verification);
            return list;
        },
        embed,`
  );

  code = code.replace(
    'Who beat it ({{ (level.records || []).length }})</h2>\n                            <p class="rec-hint">Player · attempts · date</p>\n                            <table class="records" v-if="level.records && level.records.length">\n                                <tr class="record" v-for="(r, ri) in level.records" :key="ri">\n                                    <td class="user">\n                                        <a v-if="r.link" :href="r.link" target="_blank" rel="noopener" class="type-label-lg">{{ r.user }}</a>\n                                        <span v-else class="type-label-lg">{{ r.user }}</span>\n                                    </td>',
    'Who beat it ({{ beatList(level).length }})</h2>\n                            <p class="rec-hint">Each victor · their video</p>\n                            <table class="records" v-if="beatList(level).length">\n                                <tr class="record" v-for="(r, ri) in beatList(level)" :key="ri">\n                                    <td class="user">\n                                        <span class="type-label-lg">{{ r.user }}</span>\n                                        <a v-if="r.link" class="yt-link" :href="r.link" target="_blank" rel="noopener" title="Watch">\n                                          <svg viewBox="0 0 24 24" width="18" height="18" fill="#f44"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8zM9.8 15.5v-7l6.3 3.5-6.3 3.5z"/></svg>\n                                        </a>\n                                    </td>'
  );
  code = code.replace(
    '<p v-else class="rec-hint">No clears logged yet.</p>',
    '<p v-else class="rec-hint">No victors yet — add them in Admin (name + video each).</p>'
  );

  code = code.replace(
    '<span>Who beat it</span><span class="records-count">{{ (row.records || []).length }}</span></div>\n                                                <ul class="card-expand__records" v-if="row.records && row.records.length">\n                                                    <li v-for="(r, ri) in row.records" :key="ri">\n                                                        <a v-if="r.link" :href="r.link" target="_blank" rel="noopener" class="rec-user">{{ r.user }}</a>',
    '<span>Who beat it</span><span class="records-count">{{ beatList(row).length }}</span></div>\n                                                <ul class="card-expand__records" v-if="beatList(row).length">\n                                                    <li v-for="(r, ri) in beatList(row)" :key="ri">\n                                                        <span class="rec-user">{{ r.user }}</span>\n                                                        <a v-if="r.link" class="yt-link" :href="r.link" target="_blank" rel="noopener" title="Watch" @click.stop>\n                                                          <svg viewBox="0 0 24 24" width="16" height="16" fill="#f44"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8zM9.8 15.5v-7l6.3 3.5-6.3 3.5z"/></svg>\n                                                        </a>'
  );

  const mod = await import(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })));
  return mod.default;
});
