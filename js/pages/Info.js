import { fetchInfo } from '../content.js';
import Spinner from '../components/Spinner.js';

export default {
    components: { Spinner },
    data: () => ({
        loading: true,
        doc: null,
    }),
    template: `
        <main v-if="loading" class="page-shell"><Spinner /></main>
        <main v-else class="page-doc page-shell">
            <div class="doc-wrap">
                <header class="doc-hero">
                    <p class="doc-kicker">INFO</p>
                    <h1>{{ doc && doc.title || 'About the Broken List' }}</h1>
                    <p class="doc-subtitle">{{ doc && doc.subtitle }}</p>
                </header>
                <section class="doc-panel" v-if="doc">
                    <div v-for="(sec, i) in doc.sections" :key="i" class="doc-box" style="margin-top:0;margin-bottom:1rem">
                        <h3>{{ sec.heading }}</h3>
                        <p v-for="(para, pi) in splitBody(sec.body)" :key="pi" style="white-space:pre-line">{{ para }}</p>
                    </div>
                </section>
                <p v-else class="doc-lead">Could not load info.</p>
            </div>
        </main>
    `,
    methods: {
        splitBody(body) {
            return String(body || '').split(/\n\n+/).filter(Boolean);
        },
    },
    async mounted() {
        this.doc = await fetchInfo();
        this.loading = false;
    },
};
