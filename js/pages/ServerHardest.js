import { store } from '../main.js';
import { embed, getThumbnailFromId, getYoutubeIdFromUrl } from '../util.js';
import { fetchServerHardest, fetchConfig } from '../content.js';
import Spinner from '../components/Spinner.js';

export default {
    components: { Spinner },
    template: `
        <main v-if="loading" class="page-shell"><Spinner /></main>
        <main v-else class="page-list page-shell page-server-hardest">
            <div class="classic-grid">
                <div class="list-container">
                    <div class="list-toolbar">
                        <div class="list-tiers">
                            <button type="button" class="list-tier" :class="{ active: tier === 'main' }" @click="setTier('main')">Main</button>
                            <button type="button" class="list-tier" :class="{ active: tier === 'extended' }" @click="setTier('extended')">Extended</button>
                            <button type="button" class="list-tier" :class="{ active: tier === 'legacy' }" @click="setTier('legacy')">Legacy</button>
                        </div>
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
                            <li v-if="level.length">
                                <div class="type-title-sm">Length</div>
                                <p>{{ level.length }}</p>
                            </li>
                            <li v-if="level.id">
                                <div class="type-title-sm">Level ID</div>
                                <p>
                                    <button type="button" class="id-copy id-copy--inline" @click="copyId(level.id)">
                                        <span>{{ level.id }}</span>
                                    </button>
                                </p>
                            </li>
                            <li>
                                <div class="type-title-sm">Clears</div>
                                <p>{{ (level.records || []).length }}</p>
                            </li>
                        </ul>
                        <p class="sh-note" v-if="level.note">{{ level.note }}</p>

                        <h2>Who beat it ({{ (level.records || []).length }})</h2>
                        <p class="rec-hint">Player · attempts · date · video</p>
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
                    <div v-else class="empty">
                        <span>¯\\_(ツ)_/¯</span>
                        <p>Pick a level on the left.</p>
                    </div>
                </div>

                <div class="meta-container">
                    <div class="meta">
                        <h3>About Server Hardest</h3>
                        <p class="type-label-md">
                            Separate ranking for our GD server. Same tier cutoffs as the main list
                            (Main / Extended / Legacy), but entries and clears are independent.
                        </p>
                        <div class="og">
                            <p class="type-label-md">The Broken List · Server Hardest</p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    `,
    data: () => ({
        levels: [],
        loading: true,
        selected: 0,
        query: '',
        tier: 'main',
        store,
        MAIN_CUTOFF: 75,
        EXTENDED_CUTOFF: 150,
    }),
    computed: {
        filtered() {
            const q = this.query.trim().toLowerCase();
            const MAIN = this.MAIN_CUTOFF;
            const EXT = this.EXTENDED_CUTOFF;
            return this.levels
                .map((level, idx) => ({
                    ...level,
                    _idx: idx,
                    _rank: idx + 1,
                    _key: (level.name || '') + '-' + idx,
                }))
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
        level() {
            return this.levels[this.selected] || null;
        },
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
            if (this.filtered.length > 0) this.selected = this.filtered[0]._idx;
        },
    },
    methods: {
        embed,
        setTier(t) {
            if (this.tier === t) return;
            this.tier = t;
            this.query = '';
        },
        async copyId(id) {
            const text = String(id);
            try {
                await navigator.clipboard.writeText(text);
            } catch (e) {
                const ta = document.createElement('textarea');
                ta.value = text;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                ta.remove();
            }
        },
    },
    async mounted() {
        const cfg = await fetchConfig();
        this.MAIN_CUTOFF = cfg.mainCutoff || 75;
        this.EXTENDED_CUTOFF = cfg.extendedCutoff || 150;
        this.levels = (await fetchServerHardest()) || [];
        if (this.levels.length) {
            this.tier = 'main';
        }
        this.loading = false;
    },
};
