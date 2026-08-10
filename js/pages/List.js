import { store } from "../main.js";
import { embed, getThumbnailFromId, getYoutubeIdFromUrl } from "../util.js";
import { score } from "../score.js";
import { fetchEditors, fetchList, fetchConfig } from "../content.js";

import Spinner from "../components/Spinner.js";
import LevelAuthors from "../components/List/LevelAuthors.js";

const roleIconMap = {
    owner: "crown",
    admin: "user-gear",
    helper: "user-shield",
    dev: "code",
    trial: "user-lock",
};

const rules = [
    "No hacks. Only exactly 240 TPS is allowed (under or over is invalid).",
    "Record the listed level ID. Wrong copy does not count.",
    "Video needs click/tap sounds (or clear input audio).",
    "Show a previous attempt and full death before the clear (first attempts exempt).",
    "Show attempt count, CPS, and cheat indicator when your menu supports them.",
    "Run must reach the Level Complete screen.",
    "No bug routes, secret routes, or easy modes.",
    "CBF and Click on Steps are allowed. Ask staff if you are unsure about a mod.",
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
                                        <span class="type-label-lg">{{ level?.name || ('Error (' + err + ')') }}</span>
                                    </button>
                                </td>
                            </tr>
                        </transition-group>
                        <p v-else class="type-label-md list-empty">
                            <template v-if="query">No level matches "{{ query }}".</template>
                            <template v-else>No levels in this tier yet.</template>
                        </p>
                    </div>

                    <div class="level-container">
                        <div class="level" v-if="level" :key="selected">
                            <p class="level-tag">{{ rankLabel }}</p>
                            <h1>{{ level.name }}</h1>
                            <LevelAuthors :author="level.author" :creators="level.creators || []" :verifier="level.verifier"></LevelAuthors>
                            <iframe class="video" :src="video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>
                            <ul class="stats">
                                <li>
                                    <div class="type-title-sm">Points</div>
                                    <p>{{ score(selected + 1, 100, level.percentToQualify) }}</p>
                                </li>
                                <li>
                                    <div class="type-title-sm">Length</div>
                                    <p>{{ level.length || '—' }}</p>
                                </li>
                                <li>
                                    <div class="type-title-sm">Created</div>
                                    <p>{{ level.creationDate || '—' }}</p>
                                </li>
                            </ul>
                            <div class="id-row">
                                <span class="type-title-sm">Level ID</span>
                                <button type="button" class="id-copy" @click="copyId(level.id)" :title="copiedId === String(level.id) ? 'Copied' : 'Copy ID'">
                                    <span>{{ level.id }}</span>
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <rect x="9" y="9" width="13" height="13" rx="2"></rect>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                    </svg>
                                </button>
                                <span class="id-pass">{{ level.password || 'Free to Copy' }}</span>
                            </div>
                            <h2>Records ({{ level.records.length }})</h2>
                            <p v-if="selected + 1 <= MAIN_CUTOFF">Progress records from <strong>{{ level.percentToQualify }}%</strong> may count on Main.</p>
                            <p v-else-if="selected + 1 <= EXTENDED_CUTOFF">Extended wants <strong>100%</strong>.</p>
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

                    <div class="meta-container">
                        <div class="meta">
                            <div class="errors" v-show="errors.length > 0">
                                <p class="error" v-for="error of errors">{{ error }}</p>
                            </div>
                            <template v-if="editors && editors.length">
                                <h3>List Editors</h3>
                                <ol class="editors">
                                    <li v-for="editor in editors">
                                        <img :src="'./assets/' + roleIconMap[editor.role] + (store.dark ? '-dark' : '') + '.svg'" :alt="editor.role">
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
                </div>

                <div v-else key="cards" class="cards-view">
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
                                                <iframe class="card-expand__video" :src="embed(level.verification)" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>
                                            </div>
                                            <div class="card-expand__info">
                                                <h3 class="card-expand__title">Level Information</h3>
                                                <dl class="info-list">
                                                    <div class="info-row">
                                                        <dt>Level ID</dt>
                                                        <dd>
                                                            <button type="button" class="id-copy id-copy--inline" @click.stop="copyId(level.id)">
                                                                <span>{{ level.id }}</span>
                                                                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                                    <rect x="9" y="9" width="13" height="13" rx="2"></rect>
                                                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                                                </svg>
                                                            </button>
                                                        </dd>
                                                    </div>
                                                    <div class="info-row"><dt>Creators</dt><dd>{{ (level.creators && level.creators.length) ? level.creators.join(', ') : level.author }}</dd></div>
                                                    <div class="info-row"><dt>Verifier</dt><dd>{{ level.verifier }}</dd></div>
                                                    <div class="info-row"><dt>Uploader</dt><dd>{{ level.author }}</dd></div>
                                                    <div class="info-row"><dt>Length</dt><dd>{{ level.length || '—' }}</dd></div>
                                                    <div class="info-row"><dt>Creation Date</dt><dd>{{ level.creationDate || '—' }}</dd></div>
                                                    <div class="info-row"><dt>Password</dt><dd>{{ level.password || 'Free to Copy' }}</dd></div>
                                                    <div class="info-row"><dt>Points</dt><dd class="info-pts">{{ score(index + 1, 100, level.percentToQualify) }}</dd></div>
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
            </transition>
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
        copiedId: null,
        roleIconMap,
        rules,
        store,
        MAIN_CUTOFF: 75,
        EXTENDED_CUTOFF: 150,
    }),
    computed: {
        filtered() {
            const query = this.query.trim().toLowerCase();
            const MAIN = this.MAIN_CUTOFF;
            const EXT = this.EXTENDED_CUTOFF;
            return this.list
                .map(([level, err], index) => ({ level, err, index }))
                .filter(({ level, err, index }) => {
                    const rank = index + 1;
                    let inTier = true;
                    if (this.tier === "main") inTier = rank <= MAIN;
                    else if (this.tier === "extended") inTier = rank > MAIN && rank <= EXT;
                    else if (this.tier === "legacy") inTier = rank > EXT;
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
            if (r <= this.MAIN_CUTOFF) return "Main · Rank #" + r;
            if (r <= this.EXTENDED_CUTOFF) return "Extended · Rank #" + r;
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
            if (this.viewMode === mode) return;
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
            if (r <= this.MAIN_CUTOFF) return "Main";
            if (r <= this.EXTENDED_CUTOFF) return "Extended";
            return "Legacy";
        },
        onThumbError(e) { e.target.style.opacity = "0.25"; },
        async copyId(id) {
            const text = String(id);
            try {
                await navigator.clipboard.writeText(text);
            } catch (e) {
                const ta = document.createElement("textarea");
                ta.value = text;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand("copy");
                ta.remove();
            }
            this.copiedId = text;
            clearTimeout(this._copyTimer);
            this._copyTimer = setTimeout(() => { this.copiedId = null; }, 1400);
        },
    },
    async mounted() {
        const cfg = await fetchConfig();
        this.MAIN_CUTOFF = cfg.mainCutoff;
        this.EXTENDED_CUTOFF = cfg.extendedCutoff;

        this.list = (await fetchList()) ?? [];
        this.editors = await fetchEditors();

        if (this.list.length === 0) {
            this.errors = ["Failed to load list. Retry in a few minutes or notify list staff."];
        } else {
            this.errors.push(
                ...this.list
                    .filter(([_, err]) => err)
                    .map(([_, err]) => "Failed to load level. (" + err + ")")
            );
            if (!this.editors) this.errors.push("Failed to load list editors.");
            const firstValid = this.list.findIndex(([level]) => level);
            this.selected = firstValid === -1 ? 0 : firstValid;
            const r = this.selected + 1;
            if (r > this.EXTENDED_CUTOFF) this.tier = "legacy";
            else if (r > this.MAIN_CUTOFF) this.tier = "extended";
            else this.tier = "main";
        }
        this.loading = false;
    },
};
