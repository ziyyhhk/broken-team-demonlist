export default {
    data: () => ({
        sections: [
            { id: 'placement', label: 'I. Level placement' },
            { id: 'records', label: 'II. Record videos' },
            { id: 'allowed', label: 'III. Allowed tools' },
            { id: 'quality', label: 'IV. Quality bar' },
            { id: 'legacy', label: 'V. Legacy' },
            { id: 'roulette', label: 'VI. Roulette' },
            { id: 'conduct', label: 'VII. Conduct' },
        ],
        active: 'placement',
    }),
    template: `
        <main class="page-doc page-shell">
            <div class="doc-wrap doc-wrap--rules">
                <header class="doc-hero">
                    <p class="doc-kicker">RULES</p>
                    <h1>The Broken List</h1>
                    <p class="doc-subtitle">Read this before you submit a level or a record</p>
                </header>

                <div class="rules-cta">
                    <h2>Submitting a record?</h2>
                    <p>Skim section II, then use the form in the header. Staff still have final say.</p>
                    <a class="rules-cta__btn" href="https://forms.gle/2j7Xy5QLZqG3sijj9" target="_blank" rel="noopener">Open submission form</a>
                </div>

                <div class="rules-layout">
                    <aside class="rules-toc">
                        <p class="rules-toc__title">Chapters</p>
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
                        <section id="placement" class="rules-section">
                            <h2><span class="rules-num">I</span> Level placement</h2>
                            <ol class="rules-numbered">
                                <li>Difficulty floor is <strong>Hard</strong>. Easy / Normal / Harder-only spam is out. Anything Hard and above can be considered if it’s real.</li>
                                <li>Length must be at least <strong>30 seconds</strong>. No maximum — long levels are fine.</li>
                                <li>Someone has to have beaten it. No “theoretically possible” placements without a clear.</li>
                                <li>Staff place levels by how hard they are to finish, not by name recognition.</li>
                                <li>Two-player levels are judged on solo difficulty unless staff say otherwise.</li>
                                <li>Secret routes or major physics bugs as the intended path can get a level rejected or removed.</li>
                                <li>Staff can move or drop a level later if new info shows up (wrong difficulty, broken path, etc.).</li>
                            </ol>
                        </section>

                        <section id="records" class="rules-section">
                            <h2><span class="rules-num">II</span> Record videos</h2>
                            <p class="rules-intro">If the video is missing any of this, expect a deny.</p>
                            <ol class="rules-numbered">
                                <li><strong>No hacks.</strong> That includes noclip, speed hacks, illegal mods, and anything that changes physics beyond what’s listed as allowed.</li>
                                <li><strong>TPS / FPS:</strong> no TPS bypass. Cap is <strong>240 TPS</strong>. Don’t submit 288+ “physics” runs.</li>
                                <li>Play the <strong>listed level</strong> (correct ID). Wrong copy = invalid.</li>
                                <li>Audio must include <strong>click / tap sounds</strong> (or clear source audio of inputs). Silent or fully replaced audio alone doesn’t count.</li>
                                <li>Show a <strong>previous attempt and full death animation</strong> before the completion, unless it’s a literal first attempt.</li>
                                <li>Show <strong>total attempt count</strong> on screen (e.g. attempts in the 20–100+ range is normal — just make it readable).</li>
                                <li>Show <strong>CPS</strong> (clicks per second) and a <strong>cheat indicator</strong> if you use a mod menu that provides one. If your setup can display them, turn them on.</li>
                                <li>The run must go all the way to the <strong>Level Complete</strong> screen. Cutting before endwall / complete is invalid.</li>
                                <li><strong>No bug routes</strong> and no secret routes unless the list entry explicitly allows that path.</li>
                                <li>No easy modes, start pos abuse for the “completion,” or editor playtest passes submitted as real records.</li>
                            </ol>
                        </section>

                        <section id="allowed" class="rules-section">
                            <h2><span class="rules-num">III</span> Allowed tools</h2>
                            <ol class="rules-numbered">
                                <li><strong>CBF</strong> (Click Between Frames) is allowed.</li>
                                <li><strong>Click on Steps</strong> is allowed.</li>
                                <li>FPS bypass is fine as long as you stay within the <strong>240 TPS</strong> limit above.</li>
                                <li>Mod menus used only for CPS, attempt counter, indicators, or recording helpers are fine. Anything that alters gameplay physics beyond CBF / Click on Steps is not.</li>
                                <li>If you’re unsure whether a mod is legal, ask staff before you grind a submission.</li>
                            </ol>
                        </section>

                        <section id="quality" class="rules-section">
                            <h2><span class="rules-num">IV</span> Quality bar</h2>
                            <ol class="rules-numbered">
                                <li>Levels should be playable and not pure deco spam with no gameplay identity.</li>
                                <li>Staff can reject levels that only exist to inflate difficulty with impossible input garbage.</li>
                                <li>Staff may ask for a second video, raw footage, or a different recording setup.</li>
                                <li>Final call on placement and records is always staff’s.</li>
                            </ol>
                        </section>

                        <section id="legacy" class="rules-section">
                            <h2><span class="rules-num">V</span> Legacy</h2>
                            <ol class="rules-numbered">
                                <li>When something falls off Extended, it moves to Legacy.</li>
                                <li>After a level hits Legacy, new records are only accepted for about <strong>24 hours</strong>, then the level is closed.</li>
                                <li>Legacy stays on the site so old completions don’t disappear from history.</li>
                            </ol>
                        </section>

                        <section id="roulette" class="rules-section">
                            <h2><span class="rules-num">VI</span> Roulette</h2>
                            <ol class="rules-numbered">
                                <li>Roulette is a local challenge. It does <strong>not</strong> submit list records for you.</li>
                                <li>Progress is saved in your browser. Export if you switch devices.</li>
                                <li>You can give up whenever. Results stay on your machine unless you share them.</li>
                            </ol>
                        </section>

                        <section id="conduct" class="rules-section">
                            <h2><span class="rules-num">VII</span> Conduct</h2>
                            <ol class="rules-numbered">
                                <li>Don’t harass staff, verifiers, creators, or other players.</li>
                                <li>Faked records, stolen footage, or edited “completions” can get you banned from submitting.</li>
                                <li>Argue rulings on Discord like an adult. Spam and threats just get ignored or muted.</li>
                                <li>Staff can update these rules when the list needs it. Check back if you submit rarely.</li>
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
                if (el.getBoundingClientRect().top <= 120) current = el.id;
            }
            this.active = current;
        },
    },
    mounted() {
        this._onScroll = () => this.onScroll();
        this.$el.addEventListener('scroll', this._onScroll, { passive: true });
        this.onScroll();
    },
    beforeUnmount() {
        if (this._onScroll && this.$el) this.$el.removeEventListener('scroll', this._onScroll);
    },
};
