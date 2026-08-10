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
            { id: 'faq', label: 'VIII. Common denies' },
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
                    <p>Section II is the one that gets people denied. Read it, then use the form in the header.</p>
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
                                <li>Difficulty floor is <strong>Hard</strong>. Easy / Normal only levels are out. Hard and above can be considered if the clear is real.</li>
                                <li>Length must be at least <strong>30 seconds</strong>. No maximum — long levels are fine.</li>
                                <li>Someone has to have beaten it. No theoretical placements without a clear on video.</li>
                                <li>Staff place levels by how hard they are to finish, not by name recognition or deco alone.</li>
                                <li>Two-player levels are judged on solo difficulty unless staff say otherwise for that entry.</li>
                                <li>Secret routes or major physics bugs as the intended path can get a level rejected or removed later.</li>
                                <li>Staff can move or drop a level if new info shows up (wrong difficulty, broken path, stolen clear, etc.).</li>
                                <li>Suggesting a level does not guarantee placement. Queue time depends on how busy staff are.</li>
                            </ol>
                        </section>

                        <section id="records" class="rules-section">
                            <h2><span class="rules-num">II</span> Record videos</h2>
                            <p class="rules-intro">If the video is missing any of this, expect a deny. Fix it and resubmit.</p>
                            <ol class="rules-numbered">
                                <li><strong>No hacks.</strong> Noclip, speedhacks, illegal physics mods, and anything that changes the level beyond allowed tools = invalid.</li>
                                <li><strong>TPS / FPS:</strong> no TPS bypass. Cap is <strong>240 TPS</strong>. Do not submit 288+ physics runs.</li>
                                <li>Play the <strong>listed level</strong> (correct ID). Wrong copy or a different version = invalid.</li>
                                <li>Audio must include <strong>click / tap sounds</strong>, or clear source audio of inputs. Fully replaced music with no clicks does not count by itself.</li>
                                <li>Show a <strong>previous attempt and full death animation</strong> before the completion, unless it is a literal first attempt.</li>
                                <li>Show <strong>total attempt count</strong> on screen so staff can read it (20–100+ is normal; just make it visible).</li>
                                <li>Show <strong>CPS</strong> (clicks per second) and a <strong>cheat indicator</strong> if your mod menu can display them. Turn them on.</li>
                                <li>The run must reach the <strong>Level Complete</strong> screen. Cutting before endwall / complete is invalid.</li>
                                <li><strong>No bug routes</strong> and no secret routes unless the list entry explicitly allows that path.</li>
                                <li>No easy modes, start-pos abuse for the "completion," or editor playtest passes submitted as real records.</li>
                                <li>One continuous take is preferred. Heavy cuts around the death → clear section will get questioned.</li>
                                <li>Mobile records are allowed if the video still shows the required info. Say it is mobile in the submission notes.</li>
                            </ol>
                        </section>

                        <section id="allowed" class="rules-section">
                            <h2><span class="rules-num">III</span> Allowed tools</h2>
                            <ol class="rules-numbered">
                                <li><strong>CBF</strong> (Click Between Frames) is allowed.</li>
                                <li><strong>Click on Steps</strong> is allowed.</li>
                                <li>FPS bypass is fine as long as you stay within the <strong>240 TPS</strong> limit.</li>
                                <li>Mod menus used for CPS, attempt counter, indicators, or recording helpers are fine.</li>
                                <li>Anything that changes gameplay physics beyond CBF / Click on Steps is not fine.</li>
                                <li>If you are unsure about a mod, ask staff before you grind a long session for a submission.</li>
                            </ol>
                        </section>

                        <section id="quality" class="rules-section">
                            <h2><span class="rules-num">IV</span> Quality bar</h2>
                            <ol class="rules-numbered">
                                <li>Levels should be playable and not pure deco with no real gameplay identity.</li>
                                <li>Staff can reject levels that only exist to inflate difficulty with impossible input spam.</li>
                                <li>Staff may ask for a second video, raw footage, or a different recording setup.</li>
                                <li>Final call on placement and records is always staff's. Discord arguments do not override the video.</li>
                            </ol>
                        </section>

                        <section id="legacy" class="rules-section">
                            <h2><span class="rules-num">V</span> Legacy</h2>
                            <ol class="rules-numbered">
                                <li>When something falls off Extended, it moves to Legacy.</li>
                                <li>After a level hits Legacy, new records are only accepted for about <strong>24 hours</strong>, then the level is closed.</li>
                                <li>Legacy stays on the site so old completions do not disappear from history.</li>
                                <li>Points behavior for Legacy follows whatever the current list scoring does after the grace window — treat it as closed unless staff say otherwise.</li>
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
                                <li>Do not harass staff, verifiers, creators, or other players.</li>
                                <li>Faked records, stolen footage, or edited "completions" can get you banned from submitting.</li>
                                <li>Argue rulings on Discord like an adult. Spam and threats just get ignored or muted.</li>
                                <li>Staff can update these rules when the list needs it. Check back if you submit rarely.</li>
                            </ol>
                        </section>

                        <section id="faq" class="rules-section">
                            <h2><span class="rules-num">VIII</span> Common denies</h2>
                            <ol class="rules-numbered">
                                <li>No clicks on the audio track.</li>
                                <li>No death before the completion (and it was not a first attempt).</li>
                                <li>Attempt counter / CPS / cheat indicator missing when the player clearly uses a menu that can show them.</li>
                                <li>Video ends before the complete screen.</li>
                                <li>Wrong level ID or a different version of the level.</li>
                                <li>Obvious physics / TPS abuse above the allowed cap.</li>
                                <li>Bug route or secret route that is not the listed path.</li>
                                <li>Submission form filled with a private or deleted video link.</li>
                            </ol>
                            <p class="rules-intro" style="margin-top:1rem">
                                Most denies are fixable. Re-record cleanly and send it again. If you think staff missed something, reply with timestamps — not essays.
                            </p>
                        </section>
                    </div>
                </div>
            </div>
        </main>
    `,
    methods: {
        scrollTo(id) {
            this.active = id;
            var el = document.getElementById(id);
            if (!el) return;
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        },
        onScroll() {
            var sections = this.sections.map(function (s) {
                return document.getElementById(s.id);
            }).filter(Boolean);
            var current = this.sections[0] && this.sections[0].id;
            for (var i = 0; i < sections.length; i++) {
                if (sections[i].getBoundingClientRect().top <= 120) current = sections[i].id;
            }
            this.active = current;
        },
    },
    mounted() {
        var self = this;
        this._onScroll = function () { self.onScroll(); };
        this.$el.addEventListener('scroll', this._onScroll, { passive: true });
        this.onScroll();
    },
    beforeUnmount() {
        if (this._onScroll && this.$el) this.$el.removeEventListener('scroll', this._onScroll);
    },
};
