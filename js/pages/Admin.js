export default Vue.defineAsyncComponent(async () => {
  const CDN = 'https://cdn.jsdelivr.net/gh/ziyyhhk/broken-team-demonlist@1562ed3c8171bf007a22daa608c535e9eef4f659/js/pages/Admin.js';
  const jsBase = new URL('../', import.meta.url).href;
  const pagesBase = new URL('./', import.meta.url).href;

  let code = await (await fetch(CDN)).text();

  code = code.replace(/(from\s+['"])\.\.\/([^'"]+)(['"])/g, function (_, a, p, c) {
    return a + jsBase + p + c;
  });
  code = code.replace(/(from\s+['"])\.\/([^'"]+)(['"])/g, function (_, a, p, c) {
    return a + pagesBase + p + c;
  });

  // Tiers remove button + method
  code = code.replace(
    '<button type="button" @click="moveDown(i)" :disabled="i===listOrder.length-1">↓</button>\n</span>',
    '<button type="button" @click="moveDown(i)" :disabled="i===listOrder.length-1">↓</button>\n<button type="button" class="rec-del" title="Remove" @click="removeFromList(i)">✕</button>\n</span>'
  );

  if (code.indexOf('async removeFromList(') === -1) {
    code = code.replace(
      'async saveList() {',
      'async removeFromList(i) {\n' +
      '      const name = this.listOrder[i];\n' +
      '      if (!name) return;\n' +
      "      if (!confirm('Remove ' + name + ' from the list? Saves immediately.')) return;\n" +
      '      this.listOrder.splice(i, 1);\n' +
      '      this.list = this.list.filter(function (pair) {\n' +
      '        var p = pair[0] ? pair[0].path : pair[1];\n' +
      '        return p !== name;\n' +
      '      });\n' +
      '      if (this.selectedPath === name) { this.selectedPath = null; this.draft = null; }\n' +
      "      await this.pushFile('data/_list.json', JSON.stringify(this.listOrder, null, 4), 'Admin: remove ' + name);\n" +
      '    },\n' +
      '    async saveList() {'
    );
  }

  // Server Hardest: keep JSON editor but add a note; wire save to still work
  // Also add helper methods that work with JSON text for remove via JSON still

  const mod = await import(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })));
  return mod.default;
});
