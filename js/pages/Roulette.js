import { fetchList } from '../content.js';
import { getThumbnailFromId, getYoutubeIdFromUrl, shuffle } from '../util.js';

import Spinner from '../components/Spinner.js';
import Btn from '../components/Btn.js';

export default {
    components: { Spinner, Btn },
    template: `
        <main v-if="loading">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-roulette">
            <div class="sidebar">
                <p class="type-label-md sidebar-credit">
                    Shameless copy of the Extreme Demon Roulette by <a href="https://matcool.github.io/extreme-demon-roulette/" target="_blank">matcool</a>.
                </p>
                <form class="options">
                    <div class="check">
                        <input type="checkbox" id="main" value="Main List" v-model="useMainList">
                        <label for="main">Main List</label>
                    </div>
                    <div class="check">
                        <input type="checkbox" id="extended" value="Extended List" v-model="useExtendedList">
                        <label for="extended">Extended List</label>
                    </div>
                    <Btn @click.prevent="onStart">{{ levels.length === 0 ? 'Start' : 'Restart'}}</Btn>
                </form>
                <p class="type-label-md sidebar-credit">The roulette saves automatically.</p>
                <form class="save">
                    <p>Manual Load/Save</p>
                    <div class="btns">
                        <Btn @click.prevent="onImport">Import</Btn>
                        <Btn :disabled="!isActive" @click.prevent="onExport">Export</Btn>
                    </div>
                </form>
            </div>
            <section class="levels-container">
                <div class="levels">
                    <template v-if="levels.length > 0">
                        <div class="level" v-for="(level, i) in levels.slice(0, progression.length)" :key="'done-' + i">
                            <a :href="level.video" class="video" target="_blank">
                                <img :src="getThumbnailFromId(getYoutubeIdFromUrl(level.video))" alt="" @error="onImgError">
                            </a>
                            <div class="meta">
                                <p class="level-rank">#{{ level.rank }}</p>
                                <h2>{{ level.name }}</h2>
                                <p class="level-pct done">{{ progression[i] }}%</p>
                            </div>
                        </div>
                        <div class="level current" v-if="!hasCompleted && !givenUp" :key="'current-' + progression.length">
                            <a :href="currentLevel.video" target="_blank" class="video">
                                <img :src="getThumbnailFromId(getYoutubeIdFromUrl(currentLevel.video))" alt="" @error="onImgError">
                            </a>
                            <div class="meta">
                                <p class="level-rank">#{{ currentLevel.rank }}</p>
                                <h2>{{ currentLevel.name }}</h2>
                                <p class="level-pct current-pct">{{ currentLevel.id }}</p>
                            </div>
                            <form class="actions" v-if="!givenUp">
                                <input type="number" v-model.number="percentage" :placeholder="placeholder" :min="currentPercentage + 1" max=100>
                                <Btn @click.prevent="onDone">Done</Btn>
                                <Btn @click.prevent="onGiveUp" class="btn-giveup">Give Up</Btn>
                            </form>
                        </div>
                        <div v-if="givenUp || hasCompleted" class="results">
                            <h1>{{ hasCompleted ? 'You cleared it' : 'Results' }}</h1>
                            <p>Number of levels: {{ progression.length }}</p>
                            <p>Highest percent: {{ currentPercentage }}%</p>
                            <p v-if="hasCompleted" style="margin-top:0.5rem;color:var(--color-primary);font-weight:700;">the list is still broken. you are not.</p>
                            <Btn v-if="currentPercentage < 99 && !hasCompleted" @click.prevent="showRemaining = true">Show remaining levels</Btn>
                        </div>
                        <template v-if="givenUp && showRemaining">
                            <div class="level" v-for="(level, i) in levels.slice(progression.length + 1, levels.length - currentPercentage + progression.length)" :key="'miss-' + i">
                                <a :href="level.video" target="_blank" class="video">
                                    <img :src="getThumbnailFromId(getYoutubeIdFromUrl(level.video))" alt="" @error="onImgError">
                                </a>
                                <div class="meta">
                                    <p class="level-rank">#{{ level.rank }}</p>
                                    <h2>{{ level.name }}</h2>
                                    <p class="level-pct missed">{{ currentPercentage + 2 + i }}%</p>
                                </div>
                            </div>
                        </template>
                    </template>
                    <div v-else class="empty-state">
                        <div
                            class="empty-icon"
                            :class="{ spinning: eggSpinning }"
                            @click="onEggClick"
                            title="..."
                        >◆</div>
                        <h2>No roulette in progress</h2>
                        <p>Pick a list above and hit <strong>Start</strong> to begin a run.</p>
                    </div>
                </div>
            </section>
            <div class="toasts-container">
                <div class="toasts">
                    <div v-for="(toast, ti) in toasts" class="toast" :key="ti">
                        <p>{{ toast }}</p>
                    </div>
                </div>
            </div>
        </main>
    `,
    data: () => ({
        loading: false,
        levels: [],
        progression: [],
        percentage: undefined,
        givenUp: false,
        showRemaining: false,
        useMainList: true,
        useExtendedList: true,
        toasts: [],
        fileInput: undefined,
        eggClicks: 0,
        eggSpinning: false,
        eggArmed: false,
    }),
    mounted() {
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.multiple = false;
        this.fileInput.accept = '.json';
        this.fileInput.addEventListener('change', this.onImportUpload);

        const roulette = JSON.parse(localStorage.getItem('roulette'));
        if (!roulette) return;

        this.levels = roulette.levels;
        this.progression = roulette.progression;
    },
    computed: {
        currentLevel() {
            return this.levels[this.progression.length];
        },
        currentPercentage() {
            return this.progression[this.progression.length - 1] || 0;
        },
        placeholder() {
            return `At least ${this.currentPercentage + 1}%`;
        },
        hasCompleted() {
            return (
                (this.progression.length > 0 &&
                    this.progression[this.progression.length - 1] >= 100) ||
                this.progression.length === this.levels.length
            );
        },
        isActive() {
            return (
                this.progression.length > 0 &&
                !this.givenUp &&
                !this.hasCompleted
            );
        },
    },
    methods: {
        shuffle,
        getThumbnailFromId,
        getYoutubeIdFromUrl,
        async onStart() {
            if (this.isActive) {
                this.showToast('Give up before starting a new roulette.');
                return;
            }

            if (!this.useMainList && !this.useExtendedList) {
                this.showToast('Select at least one list.');
                return;
            }

            this.loading = true;

            const fullList = await fetchList();

            if (!fullList) {
                this.loading = false;
                this.showToast('Failed to load list. Try again in a moment.');
                return;
            }

            if (fullList.filter(([_, err]) => err).length > 0) {
                this.loading = false;
                this.showToast(
                    "List is currently broken. Wait until it's fixed to start a roulette.",
                );
                return;
            }

            const fullListMapped = fullList.map(([lvl, _], i) => ({
                rank: i + 1,
                id: lvl.id,
                name: lvl.name,
                video: lvl.verification,
            }));
            const list = [];
            if (this.useMainList) list.push(...fullListMapped.slice(0, 75));
            if (this.useExtendedList) {
                list.push(...fullListMapped.slice(75, 150));
            }

            this.levels = shuffle(list).slice(0, 100);
            this.showRemaining = false;
            this.givenUp = false;
            this.progression = [];
            this.percentage = undefined;

            this.loading = false;
        },
        save() {
            localStorage.setItem(
                'roulette',
                JSON.stringify({
                    levels: this.levels,
                    progression: this.progression,
                }),
            );
        },
        onDone() {
            const percentage = Number(this.percentage);

            if (!percentage || Number.isNaN(percentage)) {
                return;
            }

            if (percentage <= this.currentPercentage || percentage > 100) {
                this.showToast('Invalid percentage.');
                return;
            }

            this.progression.push(percentage);
            this.percentage = undefined;
            this.save();

            if (percentage === 69) {
                this.showToast('nice.');
            }
            if (percentage === 100) {
                this.showToast('cleared. the list is still broken though.');
            }
        },
        onGiveUp() {
            const pct = this.currentPercentage;
            this.givenUp = true;
            localStorage.removeItem('roulette');

            if (pct === 69) {
                this.showToast('gave up at 69%. historically accurate.');
            } else if (pct === 0) {
                this.showToast('zero percent and already broken. iconic.');
            }
        },
        onImport() {
            if (
                this.isActive &&
                !window.confirm('This will overwrite the currently running roulette. Continue?')
            ) {
                return;
            }

            if (typeof this.fileInput.showPicker === 'function') {
                this.fileInput.showPicker();
            } else {
                this.fileInput.click();
            }
        },
        async onImportUpload() {
            if (this.fileInput.files.length === 0) return;

            const file = this.fileInput.files[0];

            if (file.type && file.type !== 'application/json') {
                this.showToast('Invalid file.');
                return;
            }

            try {
                const roulette = JSON.parse(await file.text());

                if (!roulette.levels || !roulette.progression) {
                    this.showToast('Invalid file.');
                    return;
                }

                this.levels = roulette.levels;
                this.progression = roulette.progression;
                this.save();
                this.givenUp = false;
                this.showRemaining = false;
                this.percentage = undefined;
            } catch {
                this.showToast('Invalid file.');
                return;
            }
        },
        onExport() {
            const file = new Blob(
                [JSON.stringify({
                    levels: this.levels,
                    progression: this.progression,
                })],
                { type: 'application/json' },
            );
            const a = document.createElement('a');
            a.href = URL.createObjectURL(file);
            a.download = 'broken_roulette';
            a.click();
            URL.revokeObjectURL(a.href);
        },
        onImgError(e) {
            e.target.style.display = 'none';
        },
        showToast(msg) {
            this.toasts.push(msg);
            setTimeout(() => {
                this.toasts.shift();
            }, 3200);
        },
        /* Easter egg: click the ◆ seven times */
        onEggClick() {
            this.eggClicks += 1;
            this.eggSpinning = true;
            setTimeout(() => {
                this.eggSpinning = false;
            }, 900);

            if (this.eggClicks >= 7 && !this.eggArmed) {
                this.eggArmed = true;
                this.eggClicks = 0;
                document.body.classList.add('roulette-chaos');
                this.showToast('you broke the roulette. respect.');
                console.log(
                    '%c ◆ broken roulette unlocked ',
                    'background:#3dbb45;color:#0b0c0e;padding:6px 12px;border-radius:2px;font-weight:bold',
                );
                setTimeout(() => {
                    document.body.classList.remove('roulette-chaos');
                    this.eggArmed = false;
                }, 1500);
            } else if (this.eggClicks === 3) {
                this.showToast('keep going...');
            } else if (this.eggClicks === 5) {
                this.showToast('almost.');
            }

            // Reset click chain if idle too long
            clearTimeout(this._eggTimer);
            this._eggTimer = setTimeout(() => {
                this.eggClicks = 0;
            }, 2500);
        },
    },
};
