import { TAG_GROUPS } from './tags.js';
export { TAG_GROUPS };

export function filterDataExtras() {
  return { sortKey: 'rank', showFilters: false, filterTags: [], TAG_GROUPS };
}

export const filterMethods = {
  setSort(key) { this.sortKey = key; },
  toggleFilterTag(tag) {
    const i = this.filterTags.indexOf(tag);
    if (i === -1) this.filterTags.push(tag);
    else this.filterTags.splice(i, 1);
  },
  clearFilters() { this.filterTags = []; this.sortKey = 'rank'; this.showFilters = false; },
};

export function applyFiltersAndSort(rows, query, filterTags, sortKey) {
  const q = (query || '').trim().toLowerCase();
  const tags = filterTags || [];
  let out = rows.filter(({ level, err }) => {
    if (q) {
      const hay = ((level && level.name) || err || '').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (tags.length) {
      const lt = ((level && level.tags) || []).map((t) => String(t).toLowerCase());
      if (!tags.every((t) => lt.includes(String(t).toLowerCase()))) return false;
    }
    return true;
  });
  const key = sortKey || 'rank';
  if (key === 'name') out = out.slice().sort((a, b) => String((a.level && a.level.name) || '').localeCompare(String((b.level && b.level.name) || '')));
  else if (key === 'length') out = out.slice().sort((a, b) => (parseFloat(String((a.level && a.level.length) || '0')) || 0) - (parseFloat(String((b.level && b.level.length) || '0')) || 0));
  else if (key === 'id') out = out.slice().sort((a, b) => (Number(a.level && a.level.id) || 0) - (Number(b.level && b.level.id) || 0));
  else if (key === 'records') out = out.slice().sort((a, b) => (((b.level && b.level.records) || []).length) - (((a.level && a.level.records) || []).length));
  return out;
}

export const filterToolbarHtml = `
<div class="list-sort-chips">
<button type="button" class="chip" :class="{ active: sortKey==='rank' }" @click="setSort('rank')">Rank</button>
<button type="button" class="chip" :class="{ active: sortKey==='id' }" @click="setSort('id')">Level ID</button>
<button type="button" class="chip" :class="{ active: sortKey==='length' }" @click="setSort('length')">Length</button>
<button type="button" class="chip" :class="{ active: sortKey==='records' }" @click="setSort('records')">Records</button>
<button type="button" class="chip" :class="{ active: sortKey==='name' }" @click="setSort('name')">Name</button>
<button type="button" class="chip chip-filter" :class="{ active: showFilters || filterTags.length }" @click="showFilters = !showFilters">Filters{{ filterTags.length ? ' · ' + filterTags.length : '' }}</button>
<button type="button" class="chip chip-ghost" v-if="filterTags.length || sortKey!=='rank'" @click="clearFilters">Clear</button>
</div>
<transition name="filter-drop">
<div class="filter-panel" v-if="showFilters">
<div class="filter-group" v-for="g in TAG_GROUPS" :key="g.name">
<div class="filter-group__title">{{ g.name }}</div>
<div class="filter-group__tags">
<button type="button" class="tag-chip" v-for="t in g.tags" :key="t" :class="{ on: filterTags.includes(t) }" @click="toggleFilterTag(t)">{{ t }}</button>
</div>
</div>
</div>
</transition>
`;
