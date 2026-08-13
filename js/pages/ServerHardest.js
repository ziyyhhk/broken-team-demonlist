import { store } from '../main.js';
import { embed } from '../util.js';
import { fetchServerHardest } from '../content.js';

export default {
    template: `
        <main class="page-list page-server-hardest">
            <div v-if="loading" class="page-loading" style="padding:2rem;text-align:center;opacity:0.7">Loading…</div>
            <div class="list-container" v-else>
                <div class="list">
                    <div class="list-toolbar">
                        <input class="search" type="search" v-model="query" placeholder="Search levels…" />
                        <div class="view-toggle" title="Switch layout">
                            <button type="button" class="view-btn" :class="{ active: viewMode === 'classic' }" @click="setView('classic')" aria-label="Classic" title="Classic">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/></svg>
                            </button>
                            <button type="button" class="view-btn" :class="{ active: viewMode === 'cards' }" @click="setView('cards')" aria-label="Cards" title="Cards">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z"/></svg>
                            </button>
                        </div>
                    </div>

                    <template v-if="viewMode === 'classic'">
                        <div class="tier-list">
                            <button
                                type="button"
                                class="list-item"
                                v-for="row in filtered"
                                :key="row._key"
                                :class="{ selected: selected === row._idx }"
                                @click="selected = row._idx"
                            >
                                <span class="list-item__rank">#{{ row._rank }}</span>
                                <span class="list-item__name">{{ row.name }}</span>
                            </button>
                        </div>
                        <p v-if="!filtered.length" class="list-empty">No levels found.</p>
                    </template>

                    <template v-else>
                        <div class="level-card-wrap" v-for="row in filtered" :key="row._key">
                            <article
                                class="level-card"
                                :class="{ selected: expanded === row._idx }"
                                @click="toggleExpand(row._idx)"
                            >
                                <div class="level-card__thumb level-card__thumb--video">
                                    <iframe
                                        v-if="row.verification"
                                        class="level-card__embed"
                                        :src="embed(row.verification)"
                                        title="video"
                                        frameborder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowfullscreen
                                        loading="lazy"
                                        @click.stop
                                    ></iframe>
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
                                        {{ expanded === row._idx ? 'Show less' : 'Show details' }}
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
                                        <div class="card-expand__records-head"><span>Who beat it</span><span class="records-count">{{ beatList(row).length }}</span></div>
                                        <ul class="card-expand__records" v-if="beatList(row).length">
                                            <li v-for="(r, ri) in beatList(row)" :key="ri">
                                                <span class="rec-user">{{ r.user }}</span>
                                                <a v-if="r.link" class="yt-link" :href="r.link" target="_blank" rel="noopener" title="Watch" @click.stop>▶</a>
                                            </li>
                                        </ul>
                                        <p v-else class="rec-hint">No victors yet.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <p v-if="!filtered.length" class="list-empty">No levels found.</p>
                    </template>
                </div>

                <div class="level" v-if="viewMode === 'classic' && level">
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
                        allowfullscreen></iframe>
                    <ul class="stats">
                        <li v-if="level.length"><div class="type-title-sm">Length</div><p>{{ level.length }}</p></li>
                        <li v-if="level.id"><div class="type-title-sm">Level ID</div><p>{{ level.id }}</p></li>
                    </ul>
                    <div class="records-wrap">
                        <h2>Who beat it ({{ beatList(level).length }})</h2>
                        <table class="records" v-if="beatList(level).length">
                            <tr class="record" v-for="(r, ri) in beatList(level)" :key="ri">
                                <td class="user">
                                    <span class="type-label-lg">{{ r.user }}</span>
                                    <a v-if="r.link" class="yt-link" :href="r.link" target="_blank" rel="noopener">▶</a>
                                </td>
                            </tr>
                        </table>
                        <p v-else class="rec-hint">No victors yet.</p>
                    </div>
                </div>
                <div class="level level--empty" v-else-if="viewMode === 'classic'">
                    <p>Select a level.</p>
                </div>
            </div>
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
