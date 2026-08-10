import { store } from '../main.js';
import { fetchEditors } from '../content.js';
import Spinner from '../components/Spinner.js';

const roleIconMap = {
    owner: 'crown',
    admin: 'user-gear',
    helper: 'user-shield',
    dev: 'code',
    trial: 'user-lock',
};

const roleLabel = {
    owner: 'Owner',
    admin: 'Admin',
    helper: 'Helper',
    dev: 'Developer',
    trial: 'Trial',
};

export default {
    components: { Spinner },
    data: () => ({
        editors: [],
        loading: true,
        store,
        roleIconMap,
        roleLabel,
    }),
    template: `
        <main v-if="loading" class="page-shell">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-doc page-shell">
            <div class="doc-wrap">
                <header class="doc-hero">
                    <p class="doc-kicker">CREDITS</p>
                    <h1>Credits</h1>
                    <p class="doc-subtitle">Staff, template, and who touched the site</p>
                </header>

                <section class="doc-panel">
                    <h2 class="doc-h2">List staff</h2>
                    <p class="doc-lead" v-if="!editors.length">No staff listed yet. Edit data/_editors.json.</p>
                    <ul class="credits-staff" v-else>
                        <li v-for="(editor, i) in editors" :key="i">
                            <img
                                class="credits-role-icon"
                                :src="'./assets/' + (roleIconMap[editor.role] || 'user-shield') + (store.dark ? '-dark' : '') + '.svg'"
                                :alt="editor.role"
                            />
                            <div class="credits-staff__body">
                                <a
                                    v-if="editor.link"
                                    :href="editor.link"
                                    target="_blank"
                                    rel="noopener"
                                    class="credits-name"
                                >{{ editor.name }}</a>
                                <span v-else class="credits-name">{{ editor.name }}</span>
                                <span class="credits-role">{{ roleLabel[editor.role] || editor.role }}</span>
                            </div>
                        </li>
                    </ul>
                </section>

                <section class="doc-panel credits-site">
                    <h2 class="doc-h2">Website</h2>
                    <div class="credits-lines">
                        <p>
                            Website layout by
                            <a href="https://tsl.pages.dev/#/" target="_blank" rel="noopener">TheShittyList</a>
                        </p>
                        <p>
                            Template based on
                            <a href="https://tsl.pages.dev/#/" target="_blank" rel="noopener">TheShittyList</a>
                        </p>
                        <p>
                            Website modified by <strong>Kira</strong>
                        </p>
                    </div>
                </section>
            </div>
        </main>
    `,
    async mounted() {
        this.editors = (await fetchEditors()) || [];
        this.loading = false;
    },
};
