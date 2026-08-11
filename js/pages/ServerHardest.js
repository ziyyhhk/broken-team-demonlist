import { store } from '../main.js';
import { embed, getThumbnailFromId, getYoutubeIdFromUrl } from '../util.js';
import { fetchServerHardest } from '../content.js';
import Spinner from '../components/Spinner.js';

export default {
    components: { Spinner },
    template: `
        <main v-if="loading" class="page-shell"><Spinner /></main>
        <main v-else class="page-list page-shell page-server-hardest">
            <div class="classic-grid">
                <div class="list-container">
                    <div class="list-toolbar">
                        <div class="sh-title-block">
                            <h2 class="sh-heading">Server Hardest</h2>
                            <p class="sh-sub">Custom rankings from our GD server</p>
                        </div>
                    </div>
                    <div class="list-search">
                        <input type="text" v-model="query" placeholder="Search level" aria-label="Search" />
                        <span class="count">{{ filtered.length }}</span>
                    </div>
                    <table class="list" v-if="filtered.length">
                        <tr v-for="(level, i) in filtered" :key="level._key || i">
                            <td class="rank"><p class="type-label-lg">#{{ level._rank }}</p></td>
                            <td class="level" :class="{ active: selected === level._idx }">
                                <button type="button" @click="selected = level._idx">
                                    <span class="type-label-lg">{{ level.name }}</span>
                                </button>
                            </td>
                        </tr>
                    </table>
                    <p v-else class="type-label-md list-empty">
                        <template v-if="query">No match for "{{ query }}".</template>
                        <template v-else>No server hardest levels yet. Add them in Admin.</template>
                    </p>
                </div>

                <div class="level-container">
                    <div class="level" v-if="level" :key="selected">
                        <p class="level-tag">Server Hardest · #{{ selected + 1 }}</p>
                        <h1>{{ level.name }}</h1>
                        <p class="sh-meta" v-if="level.author || level.verifier">
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
                        </ul>
                        <p class="sh-note" v-if="level.note">{{ level.note }}</p>
                        <p class="rec-hint" v-if="level.verification">
                            <a :href="level.verification" target="_blank" rel="noopener">Open verification video</a>
                        </p>
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
                            This is a separate ranking for levels cleared on the Broken Team server —
                            not the main demonlist. Staff can edit it anytime in Admin.
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
        store,
    }),
    computed: {
        filtered() {
            const q = this.query.trim().toLowerCase();
            return this.levels
                .map((level, idx) => ({
                    ...level,
                    _idx: idx,
                    _rank: idx + 1,
                    _key: (level.name || '') + '-' + idx,
                }))
                .filter((l) => !q || (l.name || '').toLowerCase().includes(q));
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
        this.levels = (await fetchServerHardest()) || [];
        this.loading = false;
    },
};
