import { store } from '../main.js';
import { embed, getThumbnailFromId, getYoutubeIdFromUrl } from '../util.js';
import { fetchServerHardest } from '../content.js';

const viewToggleHtml = `
    <div class="view-toggle" title="Switch layout">
        <button type="button" class="view-btn" :class="{ active: viewMode === 'classic' }" @click="setView('classic')" aria-label="Classic" title="Classic">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/></svg>
        </button>
        <button type="button" class="view-btn" :class="{ active: viewMode === 'cards' }" @click="setView('cards')" aria-label="Cards" title="Cards">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z"/></svg>
        </button>
    </div>
`;

export default {
    template: `
        <main class="page-list page-shell page-server-hardest" :class="'view-' + viewMode">
            <div v-if="loading" class="page-loading" style="padding:2rem;text-align:center;opacity:0.7">Loading…</div>

            <template v-else>
                <!-- CLASSIC: left list + right detail -->
                <div v-if="viewMode === 'classic'" key="classic" class="classic-grid">
                    <div class="list-container">
                        <div class="list-toolbar">
                            ${viewToggleHtml}
                        </div>
                        <div class="list-search">
                            <input type="text" v-model="query" placeholder="Search level" aria-label="Search" />
                            <span class="count">{{ filtered.length }}</span>
                        </div>
                        <table class="list" v-if="filtered.length">
                            <tr v-for="row in filtered" :key="row._key">
                                <td class="rank">
                                    <p class="type-label-lg">#{{ row._rank }}</p>
                                </td>
                                <td class="level" :class="{ active: selected === row._idx }">
                                    <button type="button" @click="selected = row._idx">
                                        <span class="type-label-lg">{{ row.name }}</span>
                                    </button>
                                </td>
                            </tr>
                        </table>
                        <p v-else class="type-label-md list-empty">No levels found.</p>
                    </div>

                    <div class="level-container">
                        <div class="level" v-if="level" :key="selected">
                            <p class="level-tag">Server Hardest · #{{ selected + 1 }}</p>
                            <h1>{{ level.name }}</h1>
                            <p class="sh-meta">
                                <template v-if="level.author">Creator {{ level.author }}</template>
                                <template v-if="level.victor"> · Victor {{ level.victor }}
                                    <a v-if="level.verification" class="yt-link" :href="level.verification" target="_blank" rel="noopener">▶</a>
                                </template>
                                <template v-if="level.verifier"> · Verifier {{ level.verifier }}
                                    <a v-if="level.verifierVideo" class="yt-link" :href="level.verifierVideo" target="_blank" rel="noopener">▶</a>
                                </template>
                            </p>
                            <iframe v-if="video" class="video" :src="video" frameborder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowfullscreen loading="lazy"></iframe>
                            <ul class="stats">
                                <li v-if="level.length"><div class="type-title-sm">Length</div><p>{{ level.length }}</p></li>
                                <li v-if="level.id"><div class="type-title-sm">Level ID</div><p>{{ level.id }}</p></li>
                            </ul>
                            <div class="records-wrap">
                                <h2>Records ({{ beatList(level).length }})</h2>
                                <table class="records" v-if="beatList(level).length">
                                    <tr class="record" v-for="(r, ri) in beatList(level)" :key="ri">
                                        <td class="user">
                                            <span class="type-label-lg">{{ r.user }}</span>
                                            <a v-if="r.link" class="yt-link" :href="r.link" target="_blank" rel="noopener">▶</a>
                                        </td>
                                    </tr>
                                </table>
                                <p v-else class="rec-hint">No records yet.</p>
                            </div>
                        </div>
                        <div class="level level--empty" v-else>
                            <p>Select a level.</p>
                        </div>
                    </div>
                </div>

                <!-- CARDS: centered stack max 920px -->
                <div v-else key="cards" class="cards-view">
                    <div class="cards-toolbar">
                        <div class="list-search cards-search">
                            <input type="text" v-model="query" placeholder="Search level" aria-label="Search" />
                        </div>
                        ${viewToggleHtml}
                    </div>
                    <div class="card-stack" v-if="filtered.length">
                        <div class="card-stack-inner">
                            <div class="level-card-wrap" v-for="row in filtered" :key="row._key">
                                <article
                                    class="level-card"
                                    :class="{ selected: expanded === row._idx }"
                                    @click="toggleExpand(row._idx)"
                                >
                                    <div class="level-card__thumb">
                                        <img v-if="thumb(row)" :src="thumb(row)" alt="" loading="lazy" />
                                        <div v-else class="level-card__thumb-fallback">?</div>
                                        <span class="level-card__rank">#{{ row._rank }}</span>
                                    </div>
                                    <div class="level-card__body">
                                        <h2 class="level-card__name">{{ row.name }}</h2>
                                        <p class="level-card__by">
                                            <template v-if="row.author">Creator {{ row.author }}</template>
                                            <template v-if="row.victor"> · Victor {{ row.victor }}</template>
                                            <template v-if="row.verifier"> · Verifier {{ row.verifier }}</template>
                                        </p>
                                        <button type="button" class="level-card__expand-hint" @click.stop="toggleExpand(row._idx)">
                                            {{ expanded === row._idx ? 'Show less ▲' : 'Show details ▼' }}
                                        </button>
                                    </div>
                                </article>
                                <div class="card-expand" v-if="expanded === row._idx" @click.stop>
                                    <div class="card-expand__grid">
                                        <div class="card-expand__media" v-if="row.verification">
                                            <iframe class="card-expand__video" :src="embed(row.verification)" frameborder="0"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                                allowfullscreen></iframe>
                                        </div>
                                        <div class="card-expand__info">
                                            <dl class="info-list">
                                                <div class="info-row" v-if="row.id"><dt>Level ID</dt><dd>{{ row.id }}</dd></div>
                                                <div class="info-row" v-if="row.author"><dt>Creator</dt><dd>{{ row.author }}</dd></div>
                                                <div class="info-row" v-if="row.victor"><dt>Victor</dt><dd>{{ row.victor }}
                                                    <a v-if="row.verification" class="yt-link" :href="row.verification" target="_blank" rel="noopener">▶</a>
                                                </dd></div>
                                                <div class="info-row" v-if="row.verifier"><dt>Verifier</dt><dd>{{ row.verifier }}
                                                    <a v-if="row.verifierVideo" class="yt-link" :href="row.verifierVideo" target="_blank" rel="noopener">▶</a>
                                                </dd></div>
                                                <div class="info-row" v-if="row.length"><dt>Length</dt><dd>{{ row.length }}</dd></div>
                                            </dl>
                                            <div class="card-expand__records-head">
                                                <span>Records</span>
                                                <span class="records-count">{{ beatList(row).length }}</span>
                                            </div>
                                            <ul class="card-expand__records" v-if="beatList(row).length">
                                                <li v-for="(r, ri) in beatList(row)" :key="ri">
                                                    <span class="rec-user">{{ r.user }}</span>
                                                    <a v-if="r.link" class="yt-link" :href="r.link" target="_blank" rel="noopener" @click.stop>▶</a>
                                                </li>
                                            </ul>
                                            <p v-else class="rec-hint">No records yet.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <p v-else class="list-empty" style="text-align:center;padding:2rem">No levels found.</p>
                </div>
            </template>
        </main>
    `,
    data: () => ({
        loading: true,
        levels: [],
        selected: 0,
        query: '',
        expanded: null,
        viewMode: localStorage.getItem('shView') || 'classic',
    }),
    computed: {
        filtered() {
            const q = this.query.trim().toLowerCase();
            return this.levels
                .map((level, idx) => ({ ...level, _idx: idx, _rank: idx + 1, _key: (level.name || '') + '-' + idx }))
                .filter((row) => {
                    if (!q) return true;
                    return (row.name || '').toLowerCase().includes(q)
                        || (row.author || '').toLowerCase().includes(q)
                        || (row.victor || '').toLowerCase().includes(q)
                        || (row.verifier || '').toLowerCase().includes(q);
                });
        },
        level() {
            return this.levels[this.selected] || null;
        },
        video() {
            if (!this.level || !this.level.verification) return '';
            return embed(this.level.verification);
        },
    },
    methods: {
        embed,
        thumb(level) {
            if (!level) return '';
            const t = level.thumbnail || '';
            if (t && !/imgur\.com\/a\//i.test(t) && !/imgur\.com\/gallery\//i.test(t)) {
                const im = t.match(/imgur\.com\/(?:gallery\/)?([a-zA-Z0-9]{5,})/i);
                if (im && t.indexOf('i.imgur.com') === -1) return 'https://i.imgur.com/' + im[1] + '.jpg';
                return t;
            }
            const id = getYoutubeIdFromUrl(level.verification || '');
            return id ? getThumbnailFromId(id) : '';
        },
        beatList(level) {
            if (!level) return [];
            const list = [];
            const seen = {};
            const add = (user, link) => {
                if (!user || !String(user).trim()) return;
                const key = String(user).trim().toLowerCase();
                if (seen[key]) {
                    const ex = list.find((x) => x.user.toLowerCase() === key);
                    if (ex && !ex.link && link) ex.link = link;
                    return;
                }
                seen[key] = true;
                list.push({ user: String(user).trim(), link: link || '' });
            };
            (level.records || []).forEach((r) => { if (r) add(r.user, r.link); });
            if (level.victor) add(level.victor, level.verification);
            return list;
        },
        setView(mode) {
            if (this.viewMode === mode) return;
            this.viewMode = mode;
            localStorage.setItem('shView', mode);
            this.expanded = null;
        },
        toggleExpand(idx) {
            this.expanded = this.expanded === idx ? null : idx;
        },
    },
    async mounted() {
        try {
            this.levels = (await fetchServerHardest()) || [];
        } catch (e) {
            console.error(e);
            this.levels = [];
        }
        this.loading = false;
    },
};
