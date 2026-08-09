import { store } from "../main.js";
import { embed } from "../util.js";
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

/** Pointercrate-style tiers */
const MAIN_CUTOFF = 75;
const EXTENDED_CUTOFF = 150;

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

export default {
    components: { Spinner, LevelAuthors },
    template: `
        <main v-if="loading">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-list">
            <div class="list-container">
                <div class="list-tiers">
                    <button
                        type="button"
                        class="list-tier"
                        :class="{ active: tier === 'main' }"
                        @click="setTier('main')"
                    >Main</button>
                    <button
                        type="button"
                        class="list-tier"
                        :class="{ active: tier === 'extended' }"
                        @click="setTier('extended')"
                    >Extended</button>
                    <button
                        type="button"
                        class="list-tier"
                        :class="{ active: tier === 'legacy' }"
                        @click="setTier('legacy')"
                    >Legacy</button>
                </div>
                <div class="list-search">
                    <input
                        type="text"
                        v-model="query"
                        placeholder="Search level"
                        aria-label="Search level"
                    />
                    <span class="count">{{ filtered.length }}</span>
                </div>
                <table class="list" v-if="filtered.length > 0">
                    <tr v-for="{ level, err, index } in filtered" :key="index">
                        <td class="rank">
                            <p v-if="index + 1 <= EXTENDED_CUTOFF" class="type-label-lg">#{{ index + 1 }}</p>
                            <p v-else class="type-label-lg legacy-tag">Legacy</p>
                        </td>
                        <td class="level" :class="{ 'active': selected == index, 'error': !level }">
                            <button @click="selected = index">
                                <span class="type-label-lg">{{ level?.name || \`Error (\${err}.json)\` }}</span>
                            </button>
                        </td>
                    </tr>
                </table>
                <p v-else class="type-label-md list-empty">
                    <template v-if="query">No level matches "{{ query }}".</template>
                    <template v-else-if="tier === 'legacy'">No legacy levels yet. Levels past #150 show up here.</template>
                    <template v-else-if="tier === 'extended'">No extended list levels yet (ranks 76–150).</template>
                    <template v-else>No main list levels yet (ranks 1–75).</template>
                </p>
            </div>
            <div class="level-container">
                <div class="level" v-if="level" :key="selected">
                    <p class="level-tag">{{ rankLabel }}</p>
                    <h1>{{ level.name }}</h1>
                    <LevelAuthors :author="level.author" :creators="level.creators || []" :verifier="level.verifier"></LevelAuthors>
                    <iframe class="video" id="videoframe" :src="video" frameborder="0" allowfullscreen></iframe>
                    <button
                        v-if="level.showcase"
                        class="btn btn-ghost showcase-toggle"
                        @click.prevent="toggledShowcase = !toggledShowcase"
                    >
                        {{ toggledShowcase ? 'Show verification' : 'Show showcase' }}
                    </button>
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
                            <td class="percent">
                                <p>{{ record.percent }}%</p>
                            </td>
                            <td class="user">
                                <a :href="record.link" target="_blank" rel="noopener" class="type-label-lg">{{ record.user }}</a>
                            </td>
                            <td class="mobile">
                                <img v-if="record.mobile" :src="\`./assets/phone-landscape\${store.dark ? '-dark' : ''}.svg\`" alt="Mobile">
                            </td>
                            <td class="hz">
                                <p>{{ record.hz }}Hz</p>
                            </td>
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
        query: "",
        tier: "main", // main | extended | legacy
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
            return embed(
                this.toggledShowcase
                    ? this.level.showcase
                    : this.level.verification
            );
        },
    },
    watch: {
        selected() {
            this.toggledShowcase = false;
        },
        tier() {
            // When switching tier, select first visible level
            if (this.filtered.length > 0) {
                this.selected = this.filtered[0].index;
            }
        },
    },
    methods: {
        embed,
        score,
        setTier(t) {
            this.tier = t;
            this.query = "";
        },
    },
    async mounted() {
        this.list = (await fetchList()) ?? [];
        this.editors = await fetchEditors();

        if (this.list.length === 0) {
            this.errors = [
                "Failed to load list. Retry in a few minutes or notify list staff.",
            ];
        } else {
            this.errors.push(
                ...this.list
                    .filter(([_, err]) => err)
                    .map(([_, err]) => `Failed to load level. (${err}.json)`)
            );
            if (!this.editors) {
                this.errors.push("Failed to load list editors.");
            }

            const firstValid = this.list.findIndex(([level]) => level);
            this.selected = firstValid === -1 ? 0 : firstValid;

            // Auto-pick tier based on first valid level
            const r = this.selected + 1;
            if (r > EXTENDED_CUTOFF) this.tier = "legacy";
            else if (r > MAIN_CUTOFF) this.tier = "extended";
            else this.tier = "main";
        }

        this.loading = false;

        console.log(
            "%c broken team was here ",
            "background:#7cff3f;color:#0b0c0e;padding:6px 12px;border-radius:2px;font-weight:bold"
        );
        console.log("%c type 'broken()' in the console for a secret ", "color:#7cff3f");

        window.broken = () => {
            console.log(
                "%c you found the secret ",
                "background:#111;color:#7cff3f;padding:8px 14px;border-radius:2px;font-size:14px"
            );
            console.log("%c the list is broken... but so are the rules ", "color:#888");
            document.body.classList.add("secret-mode");
            setTimeout(() => {
                document.body.classList.remove("secret-mode");
            }, 3000);
        };
    },
};
