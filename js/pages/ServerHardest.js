import { store } from '../main.js';
import { embed, getThumbnailFromId, getYoutubeIdFromUrl } from '../util.js';
import { fetchServerHardest, fetchConfig } from '../content.js';
import Spinner from '../components/Spinner.js';

const viewToggleHtml = `
    <div class="view-toggle" title="Switch layout">
        <button type="button" class="view-btn" :class="{ active: viewMode === 'classic' }" @click="setView('classic')" aria-label="Classic view">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                <path d="M5 7h14M5 12h14M5 17h10"/>
            </svg>
        </button>
        <button type="button" class="view-btn" :class="{ active: viewMode === 'cards' }" @click="setView('cards')" aria-label="Cards view">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <rect x="4" y="4" width="7" height="7" rx="1.5"/>
                <rect x="13" y="4" width="7" height="7" rx="1.5"/>
                <rect x="4" y="13" width="7" height="7" rx="1.5"/>
                <rect x="13" y="13" width="7" height="7" rx="1.5"/>
            </svg>
        </button>
    </div>
`;

export default {
    components: { Spinner },
    template: `
        <main v-if="loading" class="page-shell"><Spinner /></main>
        <main v-else class="page-list page-shell page-server-hardest" :class="'view-' + viewMode">
            <transition name="view-swap" mode="out-in">
                <div v-if="viewMode === 'classic'" key="classic" class="classic-grid">
                    <div class="list-container">
                        <div class="list-toolbar">
                            <div class="list-tiers">
                                <button type="button" class="list-tier" :class="{ active: tier === 'main' }" @click="setTier('main')">Main</button>
                                <button type="button" class="list-tier" :class="{ active: tier === 'extended' }" @click="setTier('extended')">Extended</button>
                                <button type="button" class="list-tier" :class="{ active: tier === 'legacy' }" @click="setTier('legacy')">Legacy</button>
                            </div>
                            ${viewToggleHtml}
                        </div>
                        <div class="sh-title-block" style="padding:0.35rem 0.6rem 0">
                            <h2 class="sh-heading">Server Hardest</h2>
                            <p class="sh-sub">Main #1–{{ MAIN_CUTOFF }} · Extended #{{ MAIN_CUTOFF + 1 }}–{{ EXTENDED_CUTOFF }} · Legacy #{{ EXTENDED_CUTOFF + 1 }}+</p>
                        </div>
                        <div class="list-search">
                            <input type="text" v-model="query" placeholder="Search level" aria-label="Search" />
                            <span class="count">{{ filtered.length }}</span>
                        </div>
                        <table class="list" v-if="filtered.length">
                            <tr v-for="row in filtered" :key="row._key">
                                <td class="rank">
                                    <p v-if="row._rank <= EXTENDED_CUTOFF" class="type-label-lg">#{{ row._rank }}</p>
                                    <p v-else class="type-label-lg legacy-tag">LEGACY</p>
                                </td>
                                <td class="level" :class="{ active: selected === row._idx }">
                                    <button type="button" @click="selected = row._idx">
                                        <span class="type-label-lg">{{ row.name }}</span>
                                    </button>
                                </td>
                            </tr>
                        </table>
                        <p v-else class="type-label-md list-empty">
                            <template v-if="query">No match for "{{ query }}".</template>
                            <template v-else>No levels in this tier yet.</template>
                        </p>
                    </div>
                    <div class="level-container">
                        <div class="level" v-if="level" :key="selected">
                            <p class="level-tag">{{ rankLabel }}</p>
                            <h1>{{ level.name }}</h1>
                            <p class="sh-meta">
                                <template v-if="level.author">by {{ level.author }}</template>
                                <template v-if="level.verifier"> · verified {{ level.verifier }}</template>
                            </p>
                            <iframe v-if="video" class="video" :src="video" frameborder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>
                            <ul class="stats">
                                <li v-if="level.length"><div class="type-title-sm">Length</div><p>{{ level.length }}</p></li>
                                <li v-if="level.id"><div class="type-title-sm">Level ID</div><p><button type="button" class="id-copy id-copy--inline" @click="copyId(level.id)"><span>{{ level.id }}</span></button></p></li>
                                <li><div class="type-title-sm">Clears</div><p>{{ (level.records || []).length }}</p></li>
                            </ul>
                            <p class="sh-note" v-if="level.note">{{ level.note }}</p>
                            <h2>Who beat it ({{ (level.records || []).length }})</h2>
                            <p class="rec-hint">Player · attempts · date</p>
                            <table class="records" v-if="level.records && level.records.length">
                                <tr class="record" v-for="(r, ri) in level.records" :key="ri">
                                    <td class="user">
                                        <a v-if="r.link" :href="r.link" target="_blank" rel="noopener" class="type-label-lg">{{ r.user }}</a>
                                        <span v-else class="type-label-lg">{{ r.user }}</span>
                                    </td>
                                    <td class="percent"><p>{{ r.attempts != null ? r.attempts + ' att' : '—' }}</p></td>
                                    <td class="hz"><p>{{ r.date || '—' }}</p></td>
                                </tr>
                            </table>
                            <p v-else class="rec-hint">No clears logged yet.</p>
                        </div>
                        <div v-else class="empty"><span>¯\\_(ツ)_/¯</span><p>Pick a level on the left.</p></div>
                    </div>
                    <div class="meta-container"><div class="meta"><h3>About Server Hardest</h3><p class="type-label-md">Separate ranking for our GD server with clears (player, attempts, date).</p></div></div>
                </div>

                <div v-else key="cards" class="cards-view">
                    <div class="cards-toolbar">
                        <div class="list-tiers">
                            <button type="button" class="list-tier" :class="{ active: tier === 'main' }" @click="setTier('main')">Main</button>
                            <button type="button" class="list-tier" :class="{ active: tier === 'extended' }" @click="setTier('extended')">Extended</button>
                            <button type="button" class="list-tier" :class="{ active: tier === 'legacy' }" @click="setTier('legacy')">Legacy</button>
                        </div>
                        <div class="list-search cards-search">
                            <input type="text" v-model="query" placeholder="Search level" aria-label="Search" />
                        </div>
                        ${viewToggleHtml}
                    </div>
                    <div class="card-stack" v-if="filtered.length">
                        <div class="card-stack-inner">
                            <div class="level-card-wrap" v-for="row in filtered" :key="row._key">
                                <article class="level-card" :class="{ selected: expanded === row._idx }" @click="toggleExpand(row._idx)">
                                    <div class="level-card__thumb">
                                        <img v-if="row.verification" :src="thumb(row)" alt="" @error="onThumbError" />
                                        <div v-else class="level-card__thumb-fallback">?</div>
                                        <span class="level-card__rank">{{ row._rank <= EXTENDED_CUTOFF ? '#' + row._rank : 'LEGACY' }}</span>
                                    </div>
                                    <div class="level-card__body">
                                        <h2 class="level-card__name">{{ row.name }}</h2>
                                        <p class="level-card__by">
                                            <template v-if="row.author">by {{ row.author }}</template>
                                            <template v-if="row.verifier"> · verified {{ row.verifier }}</template>
                                        </p>
                                        <div class="level-card__tags"><span class="tag tag-tier">{{ tierName(row._idx) }}</span></div>
                                    </div>
                                    <div class="level-card__side">
                                        <div class="level-card__pts">{{ (row.records || []).length }}</div>
                                        <div class="level-card__pts-label">clears</div>
                                        <button type="button" class="level-card__expand-hint" @click.stop="toggleExpand(row._idx)">
                                            {{ expanded === row._idx ? 'Show less ▲' : 'Show details ▼' }}
                                        </button>
                                    </div>
                                </article>
                                <transition name="expand">
                                    <div class="card-expand" v-if="expanded === row._idx" :key="'exp-' + row._idx">
                                        <div class="card-expand__grid">
                                            <div class="card-expand__media">
                                                <iframe v-if="row.verification" class="card-expand__video" :src="embed(row.verification)" frameborder="0"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                                    allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>
                                            </div>
                                            <div class="card-expand__info">
                                                <h3 class="card-expand__title">Level Information</h3>
                                                <dl class="info-list">
                                                    <div class="info-row" v-if="row.id"><dt>Level ID</dt><dd><button type="button" class="id-copy id-copy--inline" @click.stop="copyId(row.id)"><span>{{ row.id }}</span></button></dd></div>
                                                    <div class="info-row" v-if="row.author"><dt>Author</dt><dd>{{ row.author }}</dd></div>
                                                    <div class="info-row" v-if="row.verifier"><dt>Verifier</dt><dd>{{ row.verifier }}</dd></div>
                                                    <div class="info-row" v-if="row.length"><dt>Length</dt><dd>{{ row.length }}</dd></div>
                                                </dl>
                                                <p class="sh-note" v-if="row.note">{{ row.note }}</p>
                                                <div class="card-expand__records-head"><span>Who beat it</span><span class="records-count">{{ (row.records || []).length }}</span></div>
                                                <ul class="card-expand__records" v-if="row.records && row.records.length">
                                                    <li v-for="(r, ri) in row.records" :key="ri">
                                                        <a v-if="r.link" :href="r.link" target="_blank" rel="noopener" class="rec-user">{{ r.user }}</a>
                                                        <span v-else class="rec-user">{{ r.user }}</span>
                                                        <span class="rec-pct">{{ r.attempts != null ? r.attempts + ' att' : '—' }}</span>
                                                        <span class="rec-pct">{{ r.date || '' }}</span>
                                                    </li>
                                                </ul>
                                                <p v-else class="no-recs">No clears yet.</p>
                                            </div>
                                        </div>
                                    </div>
                                </transition>
                            </div>
                        </div>
                    </div>
                    <p v-else class="type-label-md list-empty">No levels in this tier yet.</p>
                </div>
            </transition>
        </main>
    `,
    data: () => ({
        levels: [], loading: true, selected: 0, expanded: null, query: '', tier: 'main',
        viewMode: localStorage.getItem('shView') || 'classic', store,
        MAIN_CUTOFF: 75, EXTENDED_CUTOFF: 150,
    }),
    computed: {
        filtered() {
            const q = this.query.trim().toLowerCase();
            const MAIN = this.MAIN_CUTOFF, EXT = this.EXTENDED_CUTOFF;
            return this.levels.map((level, idx) => ({ ...level, _idx: idx, _rank: idx + 1, _key: (level.name || '') + '-' + idx }))
                .filter((row) => {
                    const rank = row._rank;
                    let inTier = true;
                    if (this.tier === 'main') inTier = rank <= MAIN;
                    else if (this.tier === 'extended') inTier = rank > MAIN && rank <= EXT;
                    else if (this.tier === 'legacy') inTier = rank > EXT;
                    if (!inTier) return false;
                    if (!q) return true;
                    return (row.name || '').toLowerCase().includes(q);
                });
        },
        level() { return this.levels[this.selected] || null; },
        rankLabel() {
            const r = this.selected + 1;
            if (r <= this.MAIN_CUTOFF) return 'Server Hardest · Main · #' + r;
            if (r <= this.EXTENDED_CUTOFF) return 'Server Hardest · Extended · #' + r;
            return 'Server Hardest · Legacy · #' + r;
        },
        video() {
            if (!this.level || !this.level.verification) return '';
            return embed(this.level.verification);
        },
    },
    watch: {
        tier() {
            this.expanded = null;
            if (this.filtered.length > 0) this.selected = this.filtered[0]._idx;
        },
    },
    methods: {
        embed,
        setTier(t) { if (this.tier === t) return; this.tier = t; this.query = ''; this.expanded = null; },
        setView(mode) {
            if (this.viewMode === mode) return;
            this.viewMode = mode;
            localStorage.setItem('shView', mode);
            this.expanded = null;
        },
        toggleExpand(idx) { this.expanded = this.expanded === idx ? null : idx; this.selected = idx; },
        thumb(level) {
            const id = getYoutubeIdFromUrl(level.verification || '');
            return id ? getThumbnailFromId(id) : '';
        },
        tierName(index) {
            const r = index + 1;
            if (r <= this.MAIN_CUTOFF) return 'Main';
            if (r <= this.EXTENDED_CUTOFF) return 'Extended';
            return 'Legacy';
        },
        onThumbError(e) { e.target.style.opacity = '0.25'; },
        async copyId(id) {
            const text = String(id);
            try { await navigator.clipboard.writeText(text); }
            catch (e) {
                const ta = document.createElement('textarea');
                ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
            }
        },
    },
    async mounted() {
        const cfg = await fetchConfig();
        this.MAIN_CUTOFF = cfg.mainCutoff || 75;
        this.EXTENDED_CUTOFF = cfg.extendedCutoff || 150;
        this.levels = (await fetchServerHardest()) || [];
        this.loading = false;
    },
};
