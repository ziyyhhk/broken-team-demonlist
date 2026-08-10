import { store } from "../main.js";
import { embed, getThumbnailFromId, getYoutubeIdFromUrl } from "../util.js";
import { score } from "../score.js";
import { fetchEditors, fetchList } from "../content.js";

import Spinner from "../components/Spinner.js";
import LevelAuthors from "../components/List/LevelAuthors.js";

const roleIconMap = {
    owner: "crown",
    admin: "user-gear",
    helper: "user-shield",
    dev: "code",
    trial: "user-lock",
};

/** Demo cutoffs — production: 75 / 150 */
const MAIN_CUTOFF = 2;
const EXTENDED_CUTOFF = 4;

const rules = [
    "Achieved the record without using hacks (FPS bypass is allowed, up to 360fps).",
    "Achieved the record on the level listed on the site — check the level ID before submitting.",
    "Have either source audio or clicks/taps in the video. Edited audio alone does not count.",
    "The recording must show a previous attempt and the full death animation before the completion, unless it was a first attempt. Everyplay records are exempt.",
    "The recording must show the player hitting the endwall, or the completion is invalidated.",
    "Do not use secret routes or bug routes.",
    "Do not use easy modes — only a record of the unmodified level qualifies.",
    "Once a level falls onto the Legacy List we accept records for 24 hours after it falls off, and never after that.",
];

const viewToggleHtml = `
    <div class="view-toggle" title="Switch list layout">
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
    components: { Spinner, LevelAuthors },
    template: `
        <main v-if="loading" class="page-shell">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-list page-shell" :class="'view-' + viewMode">
            <div class="list-container" v-if="viewMode === 'classic'">
                <div class="list-toolbar">
                    <div class="list-tiers">
                        <button type="button" class="list-tier" :class="{ active: tier === 'main' }" @click="setTier('main')">Main</button>
                        <button type="button" class="list-tier" :class="{ active: tier === 'extended' }" @click="setTier('extended')">Extended</button>
                        <button type="button" class="list-tier" :class="{ active: tier === 'legacy' }" @click="setTier('legacy')">Legacy</button>
                    </div>
                    ${viewToggleHtml}
                </div>
                <div class="list-search">
                    <input type="text" v-model="query" placeholder="Search level" aria-label="Search level" />
                    <span class="count">{{ filtered.length }}</span>
                </div>
                <transition-group name="tier-list" tag="table" class="list" v-if="filtered.length > 0">
                    <tr v-for="{ level, err, index } in filtered" :key="index">
                        <td class="rank">
                            <p v-if="index + 1 <= EXTENDED_CUTOFF" class="type-label-lg">#{{ index + 1 }}</p>
                            <p v-else class="type-label-lg legacy-tag">LEGACY</p>
                        </td>
                        <td class="level" :class="{ 'active': selected == index, 'error': !level }">
                            <button @click="selected = index">
                                <span class="type-label-lg">{{ level?.name || \`Error (\${err}.json)\` }}</span>
                            </button>
                        </td>
                    </tr>
                </transition-group>
                <p v-else class="type-label-md list-empty">
                    <template v-if="query">No level matches "{{ query }}".</template>
                    <template v-else>No levels in this tier yet.</template>
                </p>
            </div>

            <div class="level-container" v-if="viewMode === 'classic'">
                <div class="level" v-if="level" :key="selected">
                    <p class="level-tag">{{ rankLabel }}</p>
                    <h1>{{ level.name }}</h1>
                    <LevelAuthors :author="level.author" :creators="level.creators || []" :verifier="level.verifier"></LevelAuthors>
                    <iframe class="video" :src="video" frameborder="0" allowfullscreen></iframe>
                    <ul class="stats">
                        <li>
                            <div class="type-title-sm">Points when completed</div>
                            <p>{{ score(selected + 1, 100, level.percentToQualify) }}</p>
                        </li>
                        <li>
                            <div class="type-title-sm">ID</div>
                            <p>{{ level.id }}</p>
                        </li>
                        <li>
                            <div class="type-title-sm">Password</div>
                            <p>{{ level.password || 'Free to Copy' }}</p>
                        </li>
                    </ul>
                    <h2>Records ({{ level.records.length }})</h2>
                    <p v-if="selected + 1 <= MAIN_CUTOFF"><strong>{{ level.percentToQualify }}%</strong> or better to qualify</p>
                    <p v-else-if="selected + 1 <= EXTENDED_CUTOFF"><strong>100%</strong> or better to qualify</p>
                    <p v-else>This level does not accept new records.</p>
                    <table class="records" v-if="level.records.length > 0">
                        <tr v-for="record in level.records" class="record">
                            <td class="percent"><p>{{ record.percent }}%</p></td>
                            <td class="user">
                                <a :href="record.link" target="_blank" rel="noopener" class="type-label-lg">{{ record.user }}</a>
                            </td>
                            <td class="hz"><p>{{ record.hz }}Hz</p></td>
                        </tr>
                    </table>
                </div>
                <div v-else class="empty">
                    <span>(ノಠ益ಠ)ノ彡┻━┻</span>
                    <p>This level could not be loaded.</p>
                </div>
            </div>

            <div class="cards-view" v-if="viewMode === 'cards'">
                <div class="cards-toolbar">
                    <div class="list-tiers">
                        <button type="button" class="list-tier" :class="{ active: tier === 'main' }" @click="setTier('main')">Main</button>
                        <button type="button" class="list-tier" :class="{ active: tier === 'extended' }" @click="setTier('extended')">Extended</button>
                        <button type="button" class="list-tier" :class="{ active: tier === 'legacy' }" @click="setTier('legacy')">Legacy</button>
                    </div>
                    <div class="list-search cards-search">
                        <input type="text" v-model="query" placeholder="Search level" aria-label="Search level" />
                    </div>
                    ${viewToggleHtml}
                </div>

                <div class="card-stack" v-if="filtered.length > 0">
                    <transition-group name="tier-cards" tag="div" class="card-stack-inner">
                        <div class="level-card-wrap" v-for="{ level, err, index } in filtered" :key="index">
                            <article class="level-card" :class="{ selected: expanded === index }" @click="toggleExpand(index)">
                                <div class="level-card__thumb">
                                    <img v-if="level" :src="thumb(level)" alt="" @error="onThumbError" />
                                    <div v-else class="level-card__thumb-fallback">?</div>
                                    <span class="level-card__rank">{{ index + 1 <= EXTENDED_CUTOFF ? '#' + (index + 1) : 'LEGACY' }}</span>
                                </div>
                                <div class="level-card__body">
                                    <h2 class="level-card__name">{{ level?.name || ('Error (' + err + ')') }}</h2>
                                    <p class="level-card__by" v-if="level">
                                        by {{ (level.creators && level.creators.length) ? level.creators.join(', ') : level.author }}
                                    </p>
                                    <div class="level-card__tags" v-if="level">
                                        <span class="tag tag-tier">{{ tierName(index) }}</span>
                                        <span class="tag" v-for="(t, ti) in (level.tags || [])" :key="ti">{{ t }}</span>
                                    </div>
                                </div>
                                <div class="level-card__side" v-if="level">
                                    <div class="level-card__pts">{{ score(index + 1, 100, level.percentToQualify) }}</div>
                                    <div class="level-card__pts-label">pts</div>
                                    <div class="level-card__recs">{{ level.records.length }} record{{ level.records.length === 1 ? '' : 's' }}</div>
                                    <button type="button" class="level-card__expand-hint" @click.stop="toggleExpand(index)">
                                        {{ expanded === index ? 'Show less ▲' : 'Show details ▼' }}
                                    </button>
                                </div>
                            </article>

                            <transition name="expand">
                                <div class="card-expand" v-if="expanded === index && level" :key="'exp-' + index">
                                    <div class="card-expand__grid">
                                        <div class="card-expand__media">
                                            <iframe class="card-expand__video" :src="embed(level.verification)" frameborder="0" allowfullscreen></iframe>
                                        </div>
                                        <div class="card-expand__info">
                                            <h3 class="card-expand__title">Level Information</h3>
                                            <dl class="info-list">
                                                <div class="info-row"><dt>Level ID</dt><dd>{{ level.id }}</dd></div>
                                                <div class="info-row"><dt>Creators</dt><dd>{{ (level.creators && level.creators.length) ? level.creators.join(', ') : level.author }}</dd></div>
                                                <div class="info-row"><dt>Verifier</dt><dd>{{ level.verifier }}</dd></div>
                                                <div class="info-row"><dt>Uploader</dt><dd>{{ level.author }}</dd></div>
                                                <div class="info-row"><dt>Password</dt><dd>{{ level.password || 'Free to Copy' }}</dd></div>
                                                <div class="info-row"><dt>Points</dt><dd class="info-pts">{{ score(index + 1, 100, level.percentToQualify) }}</dd></div>
                                                <div class="info-row">
                                                    <dt>Qualify</dt>
                                                    <dd v-if="index + 1 <= MAIN_CUTOFF">{{ level.percentToQualify }}%+</dd>
                                                    <dd v-else-if="index + 1 <= EXTENDED_CUTOFF">100%</dd>
                                                    <dd v-else>Closed</dd>
                                                </div>
                                            </dl>
                                            <div class="card-expand__records-head">
                                                <span>Records</span>
                                                <span class="records-count">{{ level.records.length }}</span>
                                            </div>
                                            <ul class="card-expand__records" v-if="level.records.length > 0">
                                                <li v-for="(record, ri) in level.records" :key="ri">
                                                    <a :href="record.link" target="_blank" rel="noopener" class="rec-user">{{ record.user }}</a>
                                                    <a :href="record.link" target="_blank" rel="noopener" class="rec-watch">Watch run</a>
                                                    <span class="rec-pct">{{ record.percent }}%</span>
                                                </li>
                                            </ul>
                                            <p v-else class="no-recs">No records yet.</p>
                                        </div>
                                    </div>
                                </div>
                            </transition>
                        </div>
                    </transition-group>
                </div>
                <p v-else class="type-label-md list-empty">No levels in this tier yet.</p>
            </div>

            <div class="meta-container" v-if="viewMode === 'classic'">
                <div class="meta">
                    <div class="errors" v-show="errors.length > 0">
                        <p class="error" v-for="error of errors">{{ error }}</p>
                    </div>
                    <template v-if="editors && editors.length">
                        <h3>List Editors</h3>
                        <ol class="editors">
                            <li v-for="editor in editors">
                                <img :src="\`./assets/\${roleIconMap[editor.role]}\${store.dark ? '-dark' : ''}.svg\`" :alt="editor.role">
                                <a v-if="editor.link" class="type-label-lg link" target="_blank" rel="noopener" :href="editor.link">{{ editor.name }}</a>
                                <p v-else class="type-label-lg">{{ editor.name }}</p>
                            </li>
                        </ol>
                    </template>
                    <h3>Submission Requirements</h3>
                    <ol class="rules">
                        <li v-for="rule in rules">{{ rule }}</li>
                    </ol>
                    <div class="og">
                        <p class="type-label-md">Website layout based on <a href="https://tsl.pages.dev/" target="_blank" rel="noopener">TheShittyList</a></p>
                    </div>
                </div>
            </div>
        </main>
    `,
    data: () => ({
        list: [],
        editors: [],
        loading: true,
        selected: 0,
        expanded: null,
        query: "",
        tier: "main",
        viewMode: localStorage.getItem("listView") || "classic",
        errors: [],
        toggledShowcase: false,
        roleIconMap,
        rules,
        store,
        MAIN_CUTOFF,
        EXTENDED_CUTOFF,
    }),
    computed: {
        filtered() {
            const query = this.query.trim().toLowerCase();
            return this.list
                .map(([level, err], index) => ({ level, err, index }))
                .filter(({ level, err, index }) => {
                    const rank = index + 1;
                    let inTier = true;
                    if (this.tier === "main") inTier = rank <= MAIN_CUTOFF;
                    else if (this.tier === "extended") inTier = rank > MAIN_CUTOFF && rank <= EXTENDED_CUTOFF;
                    else if (this.tier === "legacy") inTier = rank > EXTENDED_CUTOFF;
                    if (!inTier) return false;
                    if (query === "") return true;
                    return (level?.name ?? err ?? "").toLowerCase().includes(query);
                });
        },
        level() {
            return this.list[this.selected]?.[0] ?? null;
        },
        rankLabel() {
            const r = this.selected + 1;
            if (r <= MAIN_CUTOFF) return "Main · Rank #" + r;
            if (r <= EXTENDED_CUTOFF) return "Extended · Rank #" + r;
            return "Legacy";
        },
        video() {
            if (!this.level) return "";
            if (!this.level.showcase) return embed(this.level.verification);
            return embed(this.toggledShowcase ? this.level.showcase : this.level.verification);
        },
    },
    watch: {
        selected() { this.toggledShowcase = false; },
        tier() {
            this.expanded = null;
            if (this.filtered.length > 0) this.selected = this.filtered[0].index;
        },
    },
    methods: {
        embed,
        score,
        getThumbnailFromId,
        getYoutubeIdFromUrl,
        setTier(t) {
            if (this.tier === t) return;
            this.tier = t;
            this.query = "";
            this.expanded = null;
        },
        setView(mode) {
            this.viewMode = mode;
            localStorage.setItem("listView", mode);
            this.expanded = null;
        },
        toggleExpand(index) {
            this.expanded = this.expanded === index ? null : index;
            this.selected = index;
        },
        thumb(level) {
            const id = getYoutubeIdFromUrl(level.verification || "");
            return id ? getThumbnailFromId(id) : "";
        },
        tierName(index) {
            const r = index + 1;
            if (r <= MAIN_CUTOFF) return "Main";
            if (r <= EXTENDED_CUTOFF) return "Extended";
            return "Legacy";
        },
        onThumbError(e) { e.target.style.opacity = "0.25"; },
    },
    async mounted() {
        this.list = (await fetchList()) ?? [];
        this.editors = await fetchEditors();

        if (this.list.length === 0) {
            this.errors = ["Failed to load list. Retry in a few minutes or notify list staff."];
        } else {
            this.errors.push(
                ...this.list
                    .filter(([_, err]) => err)
                    .map(([_, err]) => `Failed to load level. (${err}.json)`)
            );
            if (!this.editors) this.errors.push("Failed to load list editors.");
            const firstValid = this.list.findIndex(([level]) => level);
            this.selected = firstValid === -1 ? 0 : firstValid;
            const r = this.selected + 1;
            if (r > EXTENDED_CUTOFF) this.tier = "legacy";
            else if (r > MAIN_CUTOFF) this.tier = "extended";
            else this.tier = "main";
        }
        this.loading = false;
    },
};
