import { fetchRules } from '../content.js';
import Spinner from '../components/Spinner.js';

export default {
    components: { Spinner },
    data: () => ({
        loading: true,
        doc: null,
        active: '',
        sections: [],
    }),
    template: `
        <main v-if="loading" class="page-shell"><Spinner /></main>
        <main v-else class="page-doc page-shell">
            <div class="doc-wrap doc-wrap--rules" ref="scroller">
                <header class="doc-hero">
                    <p class="doc-kicker">RULES</p>
                    <h1>{{ doc && doc.title || 'Rules' }}</h1>
                    <p class="doc-subtitle">{{ doc && doc.subtitle }}</p>
                </header>

                <div class="rules-cta">
                    <h2>Submitting a record?</h2>
                    <p>Chapter 2 is where most people get denied. Read it, then use the form in the header.</p>
                    <a class="rules-cta__btn" href="https://forms.gle/2j7Xy5QLZqG3sijj9" target="_blank" rel="noopener">Open submission form</a>
                </div>

                <div class="rules-layout" v-if="doc">
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
                        <section
                            v-for="ch in doc.chapters"
                            :id="ch.id"
                            :key="ch.id"
                            class="rules-section"
                        >
                            <h2><span class="rules-num">{{ ch.num }}</span> {{ ch.label }}</h2>
                            <p class="rules-intro" v-if="ch.intro">{{ ch.intro }}</p>
                            <ol class="rules-numbered">
                                <li v-for="(r, ri) in ch.rules" :key="ri">{{ r }}</li>
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
            var el = document.getElementById(id);
            if (!el) return;
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
            function ease(t) { return 1 - Math.pow(1 - t, 3); }
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
            var current = this.sections[0] && this.sections[0].id;
            var scTop = scroller.getBoundingClientRect().top;
            for (var i = 0; i < this.sections.length; i++) {
                var el = document.getElementById(this.sections[i].id);
                if (el && el.getBoundingClientRect().top - scTop <= 80) {
                    current = this.sections[i].id;
                }
            }
            this.active = current;
        },
    },
    async mounted() {
        this.doc = await fetchRules();
        if (this.doc && this.doc.chapters) {
            this.sections = this.doc.chapters.map(function (c) {
                return { id: c.id, num: c.num, label: c.label };
            });
            this.active = this.sections[0] && this.sections[0].id;
        }
        this.loading = false;
        var self = this;
        this.$nextTick(function () {
            if (self.$refs.scroller) {
                self._onScroll = function () { self.onScroll(); };
                self.$refs.scroller.addEventListener('scroll', self._onScroll, { passive: true });
            }
        });
    },
    beforeUnmount() {
        if (this._onScroll && this.$refs.scroller) {
            this.$refs.scroller.removeEventListener('scroll', this._onScroll);
        }
    },
};
