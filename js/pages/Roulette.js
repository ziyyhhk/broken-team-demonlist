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
                        <h1>{{ hasCompleted ? 'cleared.' : 'Results' }}</h1>
                        <p>Number of levels: {{ progression.length }}</p>
                        <p>Highest percent: {{ currentPercentage }}%</p>
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
                    <div class="empty-icon" :class="{ spinning: eggSpinning }" @click="onEggClick" title="?">◆</div>
                    <h2>No roulette in progress</h2>
                    <p>Pick a list above and hit <strong>Start</strong>.</p>
                </div>
            </section>
            <div class="toasts-container">
                <div class="toasts">
                    <div v-for="(toast, ti) in toasts" class="toast" :key="ti"><p>{{ toast }}</p></div>
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
    }),
    mounted() {
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.multiple = false;
        this.fileInput.accept = '.json';
        this.fileInput.addEventListener('change', this.onImportUpload);

        try {
            const roulette = JSON.parse(localStorage.getItem('roulette'));
            if (roulette && roulette.levels && Array.isArray(roulette.progression)) {
                this.levels = roulette.levels;
                this.progression = roulette.progression;
            }
        } catch (e) {
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
            return 'At least ' + (this.currentPercentage + 1) + '%';
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
            return this.levels.slice(this.progression.length + 1);
        },
    },
    methods: {
        shuffle,
        getThumbnailFromId,
        getYoutubeIdFromUrl,
        async onStart() {
            if (this.isActive) {
                this.showToast('Give up first.');
                return;
            }
            if (!this.useMainList && !this.useExtendedList) {
                this.showToast('Pick at least one list.');
                return;
            }
            this.loading = true;
            const fullList = await fetchList();
            if (!fullList) {
                this.loading = false;
                this.showToast('Could not load the list.');
                return;
            }
            if (fullList.filter(function (pair) { return pair[1]; }).length > 0) {
                this.loading = false;
                this.showToast('List is broken right now. Try later.');
                return;
            }
            const fullListMapped = fullList.map(function (pair, i) {
                var lvl = pair[0];
                return {
                    rank: i + 1,
                    id: lvl.id,
                    name: lvl.name,
                    video: lvl.verification,
                };
            });
            var list = [];
            if (this.useMainList) list = list.concat(fullListMapped.slice(0, 2));
            if (this.useExtendedList) list = list.concat(fullListMapped.slice(2, 4));
            this.levels = shuffle(list).slice(0, 100);
            this.showRemaining = false;
            this.givenUp = false;
            this.progression = [];
            this.percentage = undefined;
            this.loading = false;
            this.save();
            this.showToast('good luck.');
        },
        save() {
            localStorage.setItem(
                'roulette',
                JSON.stringify({ levels: this.levels, progression: this.progression }),
            );
        },
        onDone() {
            var percentage = Number(this.percentage);
            if (!percentage || Number.isNaN(percentage)) return;
            if (percentage <= this.currentPercentage || percentage > 100) {
                this.showToast('Invalid percent.');
                return;
            }
            this.progression.push(percentage);
            this.percentage = undefined;
            this.save();
            if (percentage === 69) this.showToast('nice.');
            if (percentage === 100) this.showToast('done.');
        },
        onGiveUp() {
            var pct = this.currentPercentage;
            this.givenUp = true;
            localStorage.removeItem('roulette');
            if (pct === 69) this.showToast('69% and quit. classic.');
            else if (pct === 0) this.showToast('zero. impressive.');
            else this.showToast('gg.');
        },
        onImport() {
            if (this.isActive && !window.confirm('Overwrite current roulette?')) return;
            if (typeof this.fileInput.showPicker === 'function') this.fileInput.showPicker();
            else this.fileInput.click();
        },
        async onImportUpload() {
            if (this.fileInput.files.length === 0) return;
            var file = this.fileInput.files[0];
            try {
                var roulette = JSON.parse(await file.text());
                if (!roulette.levels || !roulette.progression) {
                    this.showToast('Bad file.');
                    return;
                }
                this.levels = roulette.levels;
                this.progression = roulette.progression;
                this.save();
                this.givenUp = false;
                this.showRemaining = false;
                this.percentage = undefined;
            } catch (e) {
                this.showToast('Bad file.');
            }
        },
        onExport() {
            var file = new Blob(
                [JSON.stringify({ levels: this.levels, progression: this.progression })],
                { type: 'application/json' },
            );
            var a = document.createElement('a');
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
            var self = this;
            setTimeout(function () { self.toasts.shift(); }, 2800);
        },
        onEggClick() {
            this.eggClicks += 1;
            this.eggSpinning = true;
            var self = this;
            setTimeout(function () { self.eggSpinning = false; }, 500);

            if (this.eggClicks === 5) this.showToast('…');
            if (this.eggClicks === 8) this.showToast('ok');
            if (this.eggClicks >= 12) {
                this.eggClicks = 0;
                this.showToast('nothing here');
            }

            clearTimeout(this._eggTimer);
            this._eggTimer = setTimeout(function () { self.eggClicks = 0; }, 2500);
        },
    },
};
