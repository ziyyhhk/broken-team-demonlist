const SRC = 'https://cdn.jsdelivr.net/gh/ziyyhhk/broken-team-demonlist@d5aae64f1a1ba5a514e5644392b89a7bfdc6fbb8/js/pages/ServerHardest.js';
const jsBase = new URL('../', import.meta.url).href;

export default Vue.defineAsyncComponent(async () => {
  let code = await (await fetch(SRC)).text();

  code = code.replace(/(from\s+['"])\.\.\/([^'"]+)(['"])/g, function (_, a, p, c) {
    return a + jsBase + p + c;
  });

  // Meta: Creator + Victor (+ Verifier if different)
  code = code.replace(
    '<template v-if="level.author">by {{ level.author }}</template>\n                                <template v-if="level.verifier"> · verified {{ level.verifier }}</template>',
    '<template v-if="level.author">Creator {{ level.author }}</template>\n                                <template v-if="level.victor || level.verifier"> · Victor {{ level.victor || level.verifier }}</template>\n                                <template v-if="level.verifier && level.victor && level.verifier !== level.victor"> · Verifier {{ level.verifier }}</template>'
  );
  code = code.replace(
    '<template v-if="row.author">by {{ row.author }}</template>',
    '<template v-if="row.author">Creator {{ row.author }}</template><template v-if="row.victor || row.verifier"> · Victor {{ row.victor || row.verifier }}</template>'
  );

  code = code.replace('<dt>Author</dt>', '<dt>Creator</dt>');
  code = code.replace(
    '<div class="info-row" v-if="row.verifier"><dt>Verifier</dt><dd>{{ row.verifier }}</dd></div>',
    '<div class="info-row" v-if="row.victor || row.verifier"><dt>Victor</dt><dd>{{ row.victor || row.verifier }}</dd></div>\n                                                    <div class="info-row" v-if="row.verifier && row.victor && row.verifier !== row.victor"><dt>Verifier</dt><dd>{{ row.verifier }}</dd></div>'
  );

  // Thumbnail: custom URL / imgur single image / YouTube
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
