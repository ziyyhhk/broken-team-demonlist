export default {
    data: () => ({
        sections: [
            { id: 'placement', label: 'I. Placement Guidelines' },
            { id: 'records', label: 'II. Record Requirements' },
            { id: 'quality', label: 'III. Quality Standards' },
            { id: 'legacy', label: 'IV. Legacy Policy' },
            { id: 'roulette', label: 'V. Roulette Rules' },
            { id: 'conduct', label: 'VI. Conduct' },
        ],
        active: 'placement',
    }),
    template: `
        <main class="page-doc page-shell" ref="page">
            <div class="doc-wrap doc-wrap--rules">
                <header class="doc-hero">
                    <p class="doc-kicker">RULES DOCUMENT</p>
                    <h1>The Broken List</h1>
                    <p class="doc-subtitle">Owned and maintained by Broken Team</p>
                </header>

                <div class="rules-cta">
                    <h2>Looking to submit a record?</h2>
                    <p>Read the chapters below, then use the Submit Record button in the header.</p>
                    <a class="rules-cta__btn" href="https://forms.gle/2j7Xy5QLZqG3sijj9" target="_blank" rel="noopener">Open Submission Form</a>
                </div>

                <div class="rules-layout">
                    <aside class="rules-toc">
                        <p class="rules-toc__title">Table of Contents</p>
                        <button
                            v-for="s in sections"
                            :key="s.id"
                            type="button"
                            class="rules-toc__item"
                            :class="{ active: active === s.id }"
                            @click="scrollTo(s.id)"
                        >{{ s.label }}</button>
                    </aside>

                    <div class="rules-body">
                        <section id="placement" class="rules-section" data-chapter="placement">
                            <h2><span class="rules-num">I</span> Placement Guidelines</h2>
                            <ol class="rules-numbered">
                                <li>Levels are ordered by difficulty. Staff decide final placement.</li>
                                <li>A level must be an extreme demon (or equivalent difficulty for this list).</li>
                                <li>Verification must be public and reviewable.</li>
                                <li>Two-player levels are judged on solo completion difficulty unless noted.</li>
                                <li>Levels that rely on secret routes or major physics bugs as the intended path may be rejected.</li>
                                <li>If a level is found to break list rules after placement, it may be moved or removed.</li>
                            </ol>
                        </section>

                        <section id="records" class="rules-section" data-chapter="records">
                            <h2><span class="rules-num">II</span> Record Requirements</h2>
                            <ol class="rules-numbered">
                                <li>No hacks. FPS bypass is allowed up to 360fps.</li>
                                <li>Record must be on the listed level ID — check before submitting.</li>
                                <li>Video must include source audio or clicks/taps. Edited audio alone does not count.</li>
                                <li>Show a previous attempt and the full death animation before the completion (first attempts exempt).</li>
                                <li>Must show the player hitting the endwall.</li>
                                <li>No secret routes or bug routes.</li>
                                <li>No easy modes — only the unmodified level qualifies.</li>
                            </ol>
                        </section>

                        <section id="quality" class="rules-section" data-chapter="quality">
                            <h2><span class="rules-num">III</span> Quality Standards</h2>
                            <ol class="rules-numbered">
                                <li>Levels should meet a reasonable quality bar for decoration and gameplay.</li>
                                <li>Excessive input spam designed only to inflate difficulty may be rejected.</li>
                                <li>Staff may request a re-verification or additional footage.</li>
                            </ol>
                        </section>

                        <section id="legacy" class="rules-section" data-chapter="legacy">
                            <h2><span class="rules-num">IV</span> Legacy Policy</h2>
                            <ol class="rules-numbered">
                                <li>When a level falls past the Extended cutoff, it moves to the Legacy List.</li>
                                <li>Records are accepted for 24 hours after a level falls to Legacy, then closed.</li>
                                <li>Legacy levels still appear on the site but do not award new leaderboard points after the grace period.</li>
                                <li>To move a level to Legacy: add enough higher placements in <code>_list.json</code> so its rank is past the Extended cutoff (or lower the cutoff in code for demos).</li>
                            </ol>
                        </section>

                        <section id="roulette" class="rules-section" data-chapter="roulette">
                            <h2><span class="rules-num">V</span> Roulette Rules</h2>
                            <ol class="rules-numbered">
                                <li>Roulette is for practice / challenge runs — it does not auto-submit list records.</li>
                                <li>Progress saves in your browser. Export a save if you switch devices.</li>
                                <li>You may give up at any time; results are local only.</li>
                            </ol>
                        </section>

                        <section id="conduct" class="rules-section" data-chapter="conduct">
                            <h2><span class="rules-num">VI</span> Conduct</h2>
                            <ol class="rules-numbered">
                                <li>Be respectful to staff and other players.</li>
                                <li>Do not harass verifiers, creators, or record holders.</li>
                                <li>Falsified records may result in a ban from the list.</li>
                                <li>Questions about rulings can be asked in Discord.</li>
                            </ol>
                        </section>
                    </div>
                </div>
            </div>
        </main>
    `,
    methods: {
        scrollTo(id) {
            this.active = id;
            const el = document.getElementById(id);
            if (!el) return;
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        },
        onScroll() {
            const sections = this.sections.map((s) => document.getElementById(s.id)).filter(Boolean);
            let current = this.sections[0]?.id;
            for (const el of sections) {
                const top = el.getBoundingClientRect().top;
                if (top <= 120) current = el.id;
            }
            this.active = current;
        },
    },
    mounted() {
        this._onScroll = () => this.onScroll();
        // page-doc is the scroll container
        this.$el.addEventListener('scroll', this._onScroll, { passive: true });
        this.onScroll();
    },
    beforeUnmount() {
        if (this._onScroll && this.$el) {
            this.$el.removeEventListener('scroll', this._onScroll);
        }
    },
};
