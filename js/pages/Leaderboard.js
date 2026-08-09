import { fetchLeaderboard } from '../content.js';
import { localize } from '../util.js';

import Spinner from '../components/Spinner.js';

export default {
    components: {
        Spinner,
    },
    data: () => ({
        leaderboard: [],
        loading: true,
        selected: 0,
        query: '',
        err: [],
    }),
    template: `
        <main v-if="loading">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-leaderboard-container">
            <div class="page-leaderboard">
                <div class="error-container">
                    <p class="error" v-if="err.length > 0">
                        Leaderboard may be incorrect, as the following levels could not be loaded: {{ err.join(', ') }}
                    </p>
                </div>
                <div class="board-container">
                    <div class="list-search">
                        <input
                            type="text"
                            v-model="query"
                            placeholder="Search player"
                            aria-label="Search player"
                        />
                        <span class="count">{{ filtered.length }}</span>
                    </div>
                    <table class="board">
                        <tr v-for="{ entry: ientry, index } in filtered" :key="ientry.user">
                            <td class="rank">
                                <p class="type-label-lg">#{{ index + 1 }}</p>
                            </td>
                            <td class="total">
                                <p class="type-label-lg">{{ localize(ientry.total) }}</p>
                            </td>
                            <td class="user" :class="{ 'active': selected == index }">
                                <button @click="selected = index">
                                    <span class="type-label-lg">{{ ientry.user }}</span>
                                </button>
                            </td>
                        </tr>
                    </table>
                </div>
                <div class="player-container">
                    <div class="player" v-if="entry" :key="selected">
                        <h1>#{{ selected + 1 }} {{ entry.user }}</h1>

                        <!-- STATS SECTION -->
                        <div class="player-stats">
                            <div class="stat-box">
                                <div class="stat-label">List rank</div>
                                <div class="stat-value">#{{ selected + 1 }}</div>
                            </div>
                            <div class="stat-box">
                                <div class="stat-label">List score</div>
                                <div class="stat-value">{{ localize(entry.total) }}</div>
                            </div>
                            <div class="stat-box">
                                <div class="stat-label">Hardest level</div>
                                <div class="stat-value">{{ hardestLevel }}</div>
                            </div>
                            <div class="stat-box">
                                <div class="stat-label">Completed</div>
                                <div class="stat-value">{{ entry.completed.length }}</div>
                            </div>
                            <div class="stat-box">
                                <div class="stat-label">Verified</div>
                                <div class="stat-value">{{ entry.verified.length }}</div>
                            </div>
                            <div class="stat-box">
                                <div class="stat-label">Progressed</div>
                                <div class="stat-value">{{ entry.progressed.length }}</div>
                            </div>
                        </div>

                        <h2 v-if="entry.verified.length > 0">Verified ({{ entry.verified.length }})</h2>
                        <table class="table">
                            <tr v-for="score in entry.verified">
                                <td class="rank">
                                    <p>#{{ score.rank }}</p>
                                </td>
                                <td class="level">
                                    <a class="type-label-lg" target="_blank" rel="noopener" :href="score.link">{{ score.level }}</a>
                                </td>
                                <td class="score">
                                    <p>+{{ localize(score.score) }}</p>
                                </td>
                            </tr>
                        </table>
                        <h2 v-if="entry.completed.length > 0">Completed ({{ entry.completed.length }})</h2>
                        <table class="table">
                            <tr v-for="score in entry.completed">
                                <td class="rank">
                                    <p>#{{ score.rank }}</p>
                                </td>
                                <td class="level">
                                    <a class="type-label-lg" target="_blank" rel="noopener" :href="score.link">{{ score.level }}</a>
                                </td>
                                <td class="score">
                                    <p>+{{ localize(score.score) }}</p>
                                </td>
                            </tr>
                        </table>
                        <h2 v-if="entry.progressed.length > 0">Progressed ({{ entry.progressed.length }})</h2>
                        <table class="table">
                            <tr v-for="score in entry.progressed">
                                <td class="rank">
                                    <p>#{{ score.rank }}</p>
                                </td>
                                <td class="level">
                                    <a class="type-label-lg" target="_blank" rel="noopener" :href="score.link">{{ score.percent }}% {{ score.level }}</a>
                                </td>
                                <td class="score">
                                    <p>+{{ localize(score.score) }}</p>
                                </td>
                            </tr>
                        </table>
                    </div>
                    <div class="player" v-else>
                        <h1>No players yet</h1>
                        <p class="empty">Once records are added to the list, players will show up here.</p>
                    </div>
                </div>
            </div>
        </main>
    `,
    computed: {
        entry() {
            return this.leaderboard[this.selected] ?? null;
        },
        filtered() {
            const query = this.query.trim().toLowerCase();
            return this.leaderboard
                .map((entry, index) => ({ entry, index }))
                .filter(({ entry }) =>
                    query === '' ? true : entry.user.toLowerCase().includes(query),
                );
        },
        hardestLevel() {
            if (!this.entry) return 'None';
            // Highest ranked (lowest number) level this player beat or verified
            const all = [...this.entry.verified, ...this.entry.completed];
            if (all.length === 0) return 'None';
            return [...all].sort((a, b) => a.rank - b.rank)[0].level;
        },
    },
    async mounted() {
        const [leaderboard, err] = await fetchLeaderboard();
        this.leaderboard = leaderboard ?? [];
        this.err = err ?? [];
        this.loading = false;
    },
    methods: {
        localize,
    },
};
