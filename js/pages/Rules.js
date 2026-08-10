export default {
    data: () => ({
        sections: [
            { id: 'placement', num: '1', label: 'Level placement' },
            { id: 'records', num: '2', label: 'Record videos' },
            { id: 'allowed', num: '3', label: 'Allowed tools' },
            { id: 'quality', num: '4', label: 'Quality bar' },
            { id: 'legacy', num: '5', label: 'Legacy' },
            { id: 'roulette', num: '6', label: 'Roulette' },
            { id: 'conduct', num: '7', label: 'Conduct' },
            { id: 'faq', num: '8', label: 'Common denies' },
        ],
        active: 'placement',
    }),
    template: `
        <main class="page-doc page-shell">
            <div class="doc-wrap doc-wrap--rules" ref="scroller">
                <header class="doc-hero">
                    <p class="doc-kicker">RULES</p>
                    <h1>The Broken List</h1>
                    <p class="doc-subtitle">Read this before you submit a level or a record</p>
                </header>

                <div class="rules-cta">
                    <h2>Submitting a record?</h2>
                    <p>Chapter 2 is where most people get denied. Read it, then use the form in the header.</p>
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
                            @click.prevent="scrollTo(s.id)"
                        >
                            <span class="rules-toc__num">{{ s.num }}</span>
                            <span>{{ s.label }}</span>
                        </button>
                    </aside>

                    <div class="rules-body">
                        <section id="placement" class="rules-section">
                            <h2><span class="rules-num">1</span> Level placement</h2>
                            <p class="rules-intro">What a level needs before staff will put it on the list.</p>
                            <ol class="rules-numbered">
                                <li>Minimum difficulty is <strong>Hard</strong>. Below that does not get considered.</li>
                                <li>Minimum length is <strong>30 seconds</strong>. There is no max length.</li>
                                <li>Someone must have beaten it on video. No "it is possible in theory" placements.</li>
                                <li>Staff rank by how hard it is to finish, not by fame or deco alone.</li>
                                <li>Two-player levels are judged as solo unless staff say otherwise for that level.</li>
                                <li>If the intended path is a secret route or a major bug, the level can be rejected or removed later.</li>
                                <li>Staff can move or drop a level later if new proof shows up (wrong difficulty, broken path, etc.).</li>
                                <li>Suggesting a level does not mean it gets in. Staff decide when they have time.</li>
                            </ol>
                        </section>

                        <section id="records" class="rules-section">
                            <h2><span class="rules-num">2</span> Record videos</h2>
                            <p class="rules-intro">Your video has to prove the run is real. Missing any of this usually means a deny.</p>
                            <ol class="rules-numbered">
                                <li><strong>No hacks.</strong> Noclip, speedhacks, and illegal physics mods are out.</li>
                                <li><strong>Only 240 TPS is allowed.</strong> Below 240 or above 240 is invalid. TPS bypass must land on exactly 240.</li>
                                <li>Play the <strong>exact listed level</strong> (correct ID / version).</li>
                                <li>Audio needs <strong>click or tap sounds</strong>, or clear input audio. Music with no clicks is not enough by itself.</li>
                                <li>Show a <strong>previous attempt and the full death</strong> before the completion (skip this only on a true first attempt).</li>
                                <li>Show your <strong>total attempt count</strong> on screen so it is readable.</li>
                                <li>Show <strong>CPS</strong> and a <strong>cheat indicator</strong> if your mod menu can display them.</li>
                                <li>The run must reach the <strong>Level Complete</strong> screen. Do not cut before endwall / complete.</li>
                                <li>No bug routes or secret routes unless that path is the listed one.</li>
                                <li>No easy modes, start-pos "completions," or editor playtests as records.</li>
                                <li>One continuous take is better. Heavy cuts around death → clear will get questioned.</li>
                                <li>Mobile is fine if the video still shows the required info. Note that it is mobile when you submit.</li>
                            </ol>
                        </section>

                        <section id="allowed" class="rules-section">
                            <h2><span class="rules-num">3</span> Allowed tools</h2>
                            <p class="rules-intro">These are fine. If something is not listed here, ask before you grind.</p>
                            <ol class="rules-numbered">
                                <li><strong>CBF</strong> (Click Between Frames) — allowed.</li>
                                <li><strong>Click on Steps</strong> — allowed.</li>
                                <li><strong>TPS / FPS bypass</strong> — allowed at <strong>exactly 240 TPS</strong> only. Under or over 240 is not accepted.</li>
                                <li>Mod menus for CPS, attempts, indicators, or recording helpers — allowed.</li>
                                <li>Anything that changes physics beyond CBF / Click on Steps / locked 240 TPS — not allowed.</li>
                            </ol>
                        </section>

                        <section id="quality" class="rules-section">
                            <h2><span class="rules-num">4</span> Quality bar</h2>
                            <ol class="rules-numbered">
                                <li>Levels should actually be playable, not deco with no real gameplay.</li>
                                <li>Staff can reject levels that only exist to inflate difficulty with impossible spam.</li>
                                <li>Staff may ask for another video, raw footage, or a cleaner recording.</li>
                                <li>Staff have final say. Discord fights do not change the video.</li>
                            </ol>
                        </section>

                        <section id="legacy" class="rules-section">
                            <h2><span class="rules-num">5</span> Legacy</h2>
                            <ol class="rules-numbered">
                                <li>When a level falls off Extended, it goes to Legacy.</li>
                                <li>New records are accepted for about <strong>24 hours</strong> after it falls, then the level is closed.</li>
                                <li>Legacy stays on the site so old completions do not disappear.</li>
                            </ol>
                        </section>

                        <section id="roulette" class="rules-section">
                            <h2><span class="rules-num">6</span> Roulette</h2>
                            <ol class="rules-numbered">
                                <li>Roulette is just a local challenge. It does <strong>not</strong> submit list records.</li>
                                <li>Progress saves in your browser. Export if you switch devices.</li>
                                <li>You can give up any time. Results stay on your machine unless you share them.</li>
                            </ol>
                        </section>

                        <section id="conduct" class="rules-section">
                            <h2><span class="rules-num">7</span> Conduct</h2>
                            <ol class="rules-numbered">
                                <li>Do not harass staff, verifiers, creators, or other players.</li>
                                <li>Faked records, stolen footage, or edited "completions" can get you banned from submitting.</li>
                                <li>Talk rulings out on Discord calmly. Spam and threats get ignored or muted.</li>
                                <li>Rules can change when the list needs it. Check back if you submit rarely.</li>
                            </ol>
                        </section>

                        <section id="faq" class="rules-section">
                            <h2><span class="rules-num">8</span> Common denies</h2>
                            <p class="rules-intro">If you got denied, it is usually one of these.</p>
                            <ol class="rules-numbered">
                                <li>No clicks on the audio.</li>
                                <li>No death before the completion (and it was not a first attempt).</li>
                                <li>Attempt count / CPS / cheat indicator missing when the menu clearly supports them.</li>
                                <li>Video ends before the complete screen.</li>
                                <li>Wrong level ID or a different version.</li>
                                <li>TPS is not exactly 240 (under or over both fail).</li>
                                <li>Bug route or secret route that is not the listed path.</li>
                                <li>Private or deleted video link on the form.</li>
                            </ol>
                            <p class="rules-intro" style="margin-top:1rem">
                                Most of these are fixable. Re-record cleanly and send it again. If you think staff missed something, reply with timestamps.
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

            // The real scroller is .doc-wrap (main > div gets overflow-y: auto)
            var scroller = this.$refs.scroller;
            if (!scroller) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                return;
            }

            var start = scroller.scrollTop;
            var elTop = el.getBoundingClientRect().top;
            var scTop = scroller.getBoundingClientRect().top;
            var target = start + (elTop - scTop) - 12;
            if (target < 0) target = 0;

            var dist = target - start;
            if (Math.abs(dist) < 1) return;

            var duration = Math.min(650, Math.max(280, Math.abs(dist) * 0.4));
            var t0 = null;
            function ease(t) {
                return 1 - Math.pow(1 - t, 3);
            }
            function step(now) {
                if (t0 === null) t0 = now;
                var p = Math.min(1, (now - t0) / duration);
                scroller.scrollTop = start + dist * ease(p);
                if (p < 1) requestAnimationFrame(step);
            }
            requestAnimationFrame(step);
        },
        onScroll() {
            var scroller = this.$refs.scroller;
            if (!scroller) return;
            var sections = this.sections
                .map(function (s) {
                    return document.getElementById(s.id);
                })
                .filter(Boolean);
            var current = this.sections[0] && this.sections[0].id;
            var scTop = scroller.getBoundingClientRect().top;
            for (var i = 0; i < sections.length; i++) {
                if (sections[i].getBoundingClientRect().top - scTop <= 80) {
                    current = sections[i].id;
                }
            }
            this.active = current;
        },
    },
    mounted() {
        var self = this;
        this._onScroll = function () {
            self.onScroll();
        };
        this.$nextTick(function () {
            if (self.$refs.scroller) {
                self.$refs.scroller.addEventListener('scroll', self._onScroll, { passive: true });
                self.onScroll();
            }
        });
    },
    beforeUnmount() {
        if (this._onScroll && this.$refs.scroller) {
            this.$refs.scroller.removeEventListener('scroll', this._onScroll);
        }
    },
};
