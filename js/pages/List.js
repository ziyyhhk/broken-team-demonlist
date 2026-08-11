import ListBase from 'https://cdn.jsdelivr.net/gh/ziyyhhk/broken-team-demonlist@00c0b84e795b090160ec033468a460887755e292/js/pages/List.js';
import { filterDataExtras, filterMethods, applyFiltersAndSort, filterToolbarHtml } from '../listFilters.js';

const base = ListBase;

function baseData() {
  return typeof base.data === 'function' ? base.data() : (base.data || {});
}

const injectAfter = '</div>\n                        <transition-group name="tier-list"';
const injected = filterToolbarHtml + '\n                        <transition-group name="tier-list"';
const finalTpl = (base.template || '').includes(injectAfter)
  ? (base.template || '').replace(injectAfter, '</div>\n                        ' + injected)
  : (base.template || '') + filterToolbarHtml;

export default {
  name: 'List',
  components: base.components || {},
  template: finalTpl,
  data() {
    return Object.assign({}, baseData(), filterDataExtras());
  },
  computed: Object.assign({}, base.computed || {}, {
    filtered() {
      const MAIN = this.MAIN_CUTOFF, EXT = this.EXTENDED_CUTOFF;
      const rows = (this.list || []).map((pair, index) => ({ level: pair[0], err: pair[1], index })).filter(({ index }) => {
        const rank = index + 1;
        if (this.tier === 'main') return rank <= MAIN;
        if (this.tier === 'extended') return rank > MAIN && rank <= EXT;
        return rank > EXT;
      });
      return applyFiltersAndSort(rows, this.query, this.filterTags, this.sortKey);
    },
  }),
  watch: base.watch || {},
  methods: Object.assign({}, base.methods || {}, filterMethods),
  async mounted() {
    if (typeof base.mounted === 'function') await base.mounted.call(this);
  },
};
