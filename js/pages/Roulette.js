import { fetchList } from '../content.js';
import { getThumbnailFromId, getYoutubeIdFromUrl, shuffle } from '../util.js';

import Spinner from '../components/Spinner.js';
import Btn from '../components/Btn.js';

export default {
    components: { Spinner, Btn },
    template: `
        <main v-if="loading" class="page-shell">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-roulette page-shell">
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
                <div class="levels" v-if="levels.length > 0">
                    <div
                        class="level"
                        v-for="(level, i) in levels.slice(0, progression.length)"
                        :key="'done-' + i + '-' + level.id"
                    >
                        <a :href="level.video" class="video" target="_blank" rel="noopener">
                            <img :src="getThumbnailFromId(getYoutubeIdFromUrl(level.video))" alt="" @error="onImgError">
                        </a>
                        <div class="meta">
                            <p class="level-rank">#{{ level.rank }}</p>
                            <h2>{{ level.name }}</h2>
                            <p class="level-pct done">{{ progression[i] }}%</p>
                        </div>
                    </div>

                    <div
                        class="level current"
                        v-if="currentLevel && !hasCompleted && !givenUp"
                        :key="'cur-' + currentLevel.id"
                    >
                        <a :href="currentLevel.video" class="video" target="_blank" rel="noopener">
                            <img :src="getThumbnailFromId(getYoutubeIdFromUrl(currentLevel.video))" alt="" @error="onImgError">
                        </a>
                        <div class="meta">
                            <p class="level-rank">#{{ currentLevel.rank }}</p>
                            <h2>{{ currentLevel.name }}</h2>
                            <p class="level-pct current-pct">ID {{ currentLevel.id }}</p>
                        </div>
                        <form class="actions" @submit.prevent="onDone">
                            <input
                                type="number"
                                v-model.number="percentage"
                                :placeholder="placeholder"
                                :min="currentPercentage + 1"
                                max="100"
                            >
                            <Btn @click.prevent="onDone">Done</Btn>
                            <Btn @click.prevent="onGiveUp" class="btn-giveup">Give Up</Btn>
                        </form>
                    </div>

                    <div v-if="givenUp || hasCompleted" class="results">
                        <h1>{{ hasCompleted ? 'You cleared it' : 'Results' }}</h1>
                        <p>Number of levels: {{ progression.length }}</p>
                        <p>Highest percent: {{ currentPercentage }}%</p>
                        <p v-if="hasCompleted" class="results-note">the list is still broken. you are not.</p>
                        <Btn v-if="currentPercentage < 99 && !hasCompleted" @click.prevent="showRemaining = true">Show remaining levels</Btn>
                    </div>

                    <template v-if="givenUp && showRemaining">
                        <div
                            class="level missed"
                            v-for="(level, i) in remainingLevels"
                            :key="'miss-' + i + '-' + level.id"
                        >
                            <a :href="level.video" class="video" target="_blank" rel="noopener">
                                <img :src="getThumbnailFromId(getYoutubeIdFromUrl(level.video))" alt="" @error="onImgError">
                            </a>
                            <div class="meta">
                                <p class="level-rank">#{{ level.rank }}</p>
                                <h2>{{ level.name }}</h2>
                                <p class="level-pct missed">skipped</p>
                            </div>
                        </div>
                    </template>
                </div>
                <div v-else class="empty-state">
                    <div class="empty-icon" :class="{ spinning: eggSpinning }" @click="onEggClick" title="...">◆</div>
                    <h2>No roulette in progress</h2>
                    <p>Pick a list above and hit <strong>Start</strong> to begin a run.</p>
                </div>
            </section>
            <div class="toasts-container">
                <div class="toasts">
                    <div v-for="(toast, ti) in toasts" class="toast" :key="ti"><p>{{ toast }}</p></div>
                </div>
            </div>
            <div v-if="eggBurst" class="egg-burst"><span>{{ eggBurstText }}</span></div>
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
        eggBurst: false,
        eggBurstText: '',
    }),
    mounted() {
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.multiple = false;
        this.fileInput.accept = '.json';
        this.fileInput.addEventListener('change', this.onImportUpload);

        try {
            const roulette = JSON.parse(localStorage.getItem('roulette'));
            if (roulette?.levels && Array.isArray(roulette.progression)) {
                this.levels = roulette.levels;
                this.progression = roulette.progression;
            }
        } catch {
            localStorage.removeItem('roulette');
        }
    },
    computed: {
        currentLevel() {
            return this.levels[this.progression.length] || null;
        },
        currentPercentage() {
            return this.progression[this.progression.length - 1] || 0;
        },
        placeholder() {
            return `At least ${this.currentPercentage + 1}%`;
        },
        hasCompleted() {
            if (this.levels.length === 0) return false;
            if (this.progression.length === 0) return false;
            if (this.progression[this.progression.length - 1] >= 100) return true;
            return this.progression.length >= this.levels.length;
        },
        isActive() {
            return this.progression.length > 0 && !this.givenUp && !this.hasCompleted;
        },
        remainingLevels() {
            // levels after the one you gave up on
            return this.levels.slice(this.progression.length + 1);
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
                this.showToast("List is currently broken. Wait until it's fixed.");
                return;
            }
            const fullListMapped = fullList.map(([lvl, _], i) => ({
                rank: i + 1,
                id: lvl.id,
                name: lvl.name,
                video: lvl.verification,
            }));
            const list = [];
            // Demo cutoffs: main 1-2, extended 3-4
            if (this.useMainList) list.push(...fullListMapped.slice(0, 2));
            if (this.useExtendedList) list.push(...fullListMapped.slice(2, 4));
            this.levels = shuffle(list).slice(0, 100);
            this.showRemaining = false;
            this.givenUp = false;
            this.progression = [];
            this.percentage = undefined;
            this.loading = false;
            this.save();
            this.showToast('roulette started. good luck.');
        },
        save() {
            localStorage.setItem(
                'roulette',
                JSON.stringify({ levels: this.levels, progression: this.progression }),
            );
        },
        onDone() {
            const percentage = Number(this.percentage);
            if (!percentage || Number.isNaN(percentage)) return;
            if (percentage <= this.currentPercentage || percentage > 100) {
                this.showToast('Invalid percentage.');
                return;
            }
            this.progression.push(percentage);
            this.percentage = undefined;
            this.save();
            if (percentage === 69) this.showToast('nice.');
            if (percentage === 100) {
                this.triggerBurst('CLEARED');
                this.showToast('cleared. the list is still broken though.');
            }
        },
        onGiveUp() {
            const pct = this.currentPercentage;
            this.givenUp = true;
            localStorage.removeItem('roulette');
            if (pct === 69) this.showToast('gave up at 69%. historically accurate.');
            else if (pct === 0) this.showToast('zero percent and already broken. iconic.');
        },
        onImport() {
            if (this.isActive && !window.confirm('This will overwrite the currently running roulette. Continue?')) return;
            if (typeof this.fileInput.showPicker === 'function') this.fileInput.showPicker();
            else this.fileInput.click();
        },
        async onImportUpload() {
            if (this.fileInput.files.length === 0) return;
            const file = this.fileInput.files[0];
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
            }
        },
        onExport() {
            const file = new Blob(
                [JSON.stringify({ levels: this.levels, progression: this.progression })],
                { type: 'application/json' },
            );
            const a = document.createElement('a');
            a.href = URL.createObjectURL(file);
            a.download = 'broken_roulette';
            a.click();
            URL.revokeObjectURL(a.href);
        },
        onImgError(e) {
            e.target.style.opacity = '0.3';
        },
        showToast(msg) {
            this.toasts.push(msg);
            setTimeout(() => this.toasts.shift(), 3200);
        },
        triggerBurst(text) {
            this.eggBurstText = text;
            this.eggBurst = true;
            setTimeout(() => { this.eggBurst = false; }, 2200);
        },
        onEggClick() {
            this.eggClicks += 1;
            this.eggSpinning = true;
            setTimeout(() => { this.eggSpinning = false; }, 950);
            if (this.eggClicks >= 7 && !this.eggArmed) {
                this.eggArmed = true;
                this.eggClicks = 0;
                document.body.classList.add('roulette-chaos');
                this.triggerBurst('YOU BROKE IT');
                this.showToast('you broke the roulette. respect.');
                setTimeout(() => {
                    document.body.classList.remove('roulette-chaos');
                    this.eggArmed = false;
                }, 1700);
            } else if (this.eggClicks === 3) this.showToast('keep going...');
            else if (this.eggClicks === 5) this.showToast('almost.');
            clearTimeout(this._eggTimer);
            this._eggTimer = setTimeout(() => { this.eggClicks = 0; }, 2500);
        },
    },
};
