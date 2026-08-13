export default Vue.defineAsyncComponent(async () => {
  const CDN = 'https://cdn.jsdelivr.net/gh/ziyyhhk/broken-team-demonlist@1562ed3c8171bf007a22daa608c535e9eef4f659/js/pages/Admin.js';
  const jsBase = new URL('../', import.meta.url).href;
  const pagesBase = new URL('./', import.meta.url).href;

  let code = await (await fetch(CDN)).text();

  code = code.replace(/(from\s+['"])\.\.\/([^'"]+)(['"])/g, (_, a, p, c) => a + jsBase + p + c);
  code = code.replace(/(from\s+['"])\.\/([^'"]+)(['"])/g, (_, a, p, c) => a + pagesBase + p + c);

  code = code.replace(
    "activityLogs: [], serverHardestText: '[]',",
    "activityLogs: [], serverHardestText: '[]', serverLevels: [],"
  );

  code = code.replace(
    '<button type="button" @click="moveDown(i)" :disabled="i===listOrder.length-1">↓</button>\n</span>',
    '<button type="button" @click="moveDown(i)" :disabled="i===listOrder.length-1">↓</button>\n<button type="button" class="rec-del" title="Remove" @click="removeFromList(i)">✕</button>\n</span>'
  );

  code = code.replace(
    /async openServerHardest\(\) \{[\s\S]*?\n    \},\n    async saveServerHardest\(\) \{[\s\S]*?\n    \},/,
    [
      "async openServerHardest() { this.tab = 'server'; try { const res = await fetch('./data/_server_hardest.json?t=' + Date.now(), { cache: 'no-store' }); if (res.ok) { const data = await res.json(); this.serverLevels = Array.isArray(data) ? data.map((l) => ({ ...l, records: l.records || [] })) : []; } else this.serverLevels = []; } catch (e) { this.serverLevels = []; } },",
      "shAddRow() { this.serverLevels.push({ id: '', name: '', author: '', verifier: '', verification: '', length: '', note: '', tags: [], records: [] }); },",
      "shMove(i, dir) { const j = i + dir; if (j < 0 || j >= this.serverLevels.length) return; const a = this.serverLevels.slice(); const t = a[i]; a[i] = a[j]; a[j] = t; this.serverLevels = a; },",
      "async shRemove(i) { const name = (this.serverLevels[i] && this.serverLevels[i].name) || ('#' + (i + 1)); if (!confirm('Remove \"' + name + '\"? Saves immediately.')) return; this.serverLevels.splice(i, 1); await this.pushFile('data/_server_hardest.json', JSON.stringify(this.serverLevels, null, 4), 'Admin: remove SH ' + name); },",
      "async saveServerHardest() { await this.pushFile('data/_server_hardest.json', JSON.stringify(this.serverLevels, null, 4), 'Admin: Server Hardest (' + this.serverLevels.length + ' levels)'); },",
    ].join('\n    ')
  );

  if (!code.includes('async removeFromList(')) {
    code = code.replace(
      'async saveList() {',
      [
        "async removeFromList(i) {",
        "      const name = this.listOrder[i];",
        "      if (!name) return;",
        "      if (!confirm('Remove \"' + name + '\" from the list? This saves immediately.')) return;",
        "      this.listOrder.splice(i, 1);",
        "      this.list = this.list.filter((pair) => { const p = pair[0] ? pair[0].path : pair[1]; return p !== name; });",
        "      if (this.selectedPath === name) { this.selectedPath = null; this.draft = null; }",
        "      await this.pushFile('data/_list.json', JSON.stringify(this.listOrder, null, 4), 'Admin: remove ' + name);",
        "    },",
        "    async saveList() {",
      ].join('\n')
    );
  }

  const oldPanel = [
    "tab==='server' && canLevels\" class=\"admin-panel\">",
    "<h2>Server Hardest</h2>",
    '<p class="admin-hint">JSON array. Rank = order in the list. Each item: name, id, author, verifier, verification (video), length, note, records: [{ user, attempts, date, link }]</p>',
    '<textarea class="admin-ta" v-model="serverHardestText" rows="18"></textarea>',
    '<div class="admin-actions"><button type="button" class="auth-btn" :disabled="saving" @click="saveServerHardest">Save Server Hardest</button></div>',
    '</div>',
  ].join('\n');

  const newPanel = [
    "tab==='server' && canLevels\" class=\"admin-panel admin-panel--wide\">",
    "<h2>Server Hardest</h2>",
    '<p class="admin-hint">X removes and saves immediately. Edit fields then Save all.</p>',
    '<div class="admin-actions" style="margin-bottom:0.75rem">',
    '<button type="button" class="auth-btn" @click="shAddRow">+ Add level</button>',
    '<button type="button" class="auth-btn" :disabled="saving" @click="saveServerHardest">Save all</button>',
    '<button type="button" class="auth-btn auth-btn--ghost" @click="openServerHardest">Reload</button>',
    '</div>',
    '<ul class="sh-list">',
    '<li class="sh-item" v-for="(lv, i) in serverLevels" :key="i">',
    '<span class="sh-item__rank">#{{ i + 1 }}</span>',
    '<input class="admin-input" v-model="lv.name" placeholder="Name" style="flex:1;min-width:8rem" />',
    '<input class="admin-input" v-model="lv.id" placeholder="ID" style="width:6rem" />',
    '<input class="admin-input" v-model="lv.author" placeholder="Author" style="width:7rem" />',
    '<input class="admin-input" v-model="lv.verifier" placeholder="Verifier" style="width:7rem" />',
    '<input class="admin-input" v-model="lv.length" placeholder="Len" style="width:4rem" />',
    '<button type="button" class="auth-btn auth-btn--ghost" style="padding:0.25rem 0.4rem" @click="shMove(i,-1)" :disabled="i===0">↑</button>',
    '<button type="button" class="auth-btn auth-btn--ghost" style="padding:0.25rem 0.4rem" @click="shMove(i,1)" :disabled="i===serverLevels.length-1">↓</button>',
    '<button type="button" class="rec-del" @click="shRemove(i)">✕</button>',
    '</li></ul>',
    '<p v-if="!serverLevels.length" class="admin-hint">No levels. Click + Add level.</p>',
    '</div>',
  ].join('\n');

  if (code.includes(oldPanel)) code = code.replace(oldPanel, newPanel);
  else console.warn('[Admin] SH panel not found');

  const mod = await import(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })));
  return mod.default;
});
