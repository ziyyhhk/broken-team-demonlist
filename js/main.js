import routes from './routes.js';

export const store = Vue.reactive({
    dark: JSON.parse(localStorage.getItem('dark')) || false,
    toggleDark() {
        this.dark = !this.dark;
        localStorage.setItem('dark', JSON.stringify(this.dark));
        document.body.classList.toggle('dark', this.dark);
    },
});

document.body.classList.toggle('dark', store.dark);

const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let konamiIndex = 0;
window.addEventListener('keydown', (event) => {
    if (event.key === konamiCode[konamiIndex]) {
        konamiIndex += 1;
        if (konamiIndex === konamiCode.length) {
            document.body.classList.toggle('secret-mode');
            konamiIndex = 0;
        }
    } else {
        konamiIndex = event.key === konamiCode[0] ? 1 : 0;
    }
});

/*
 * The whole page (header + router-view) is inside the app's
 * template. The header is laid out as a flex child of <body>
 * using CSS, so the visual structure is identical to before.
 *
 * Why this works:
 *  - <router-link> is now inside a registered Vue component,
 *    so clicks actually navigate.
 *  - The header and the <router-view> are siblings under <body>,
 *    both rendered by the same app instance, so they share the
 *    same theme store and never get out of sync.
 *  - The <transition> wraps only <router-view>, so route changes
 *    fade nicely without affecting the header.
 */
const app = Vue.createApp({
    data: () => ({ store }),
    template: `
        <header>
            <div class="logo">
                <div class="logo__text">
                    <h2>The Broken List</h2>
                    <p>v1.0.0</p>
                </div>
            </div>
            <nav class="nav">
                <div class="nav__tabs">
                    <router-link class="nav__tab" to="/">
                        <span class="type-label-lg">List</span>
                    </router-link>
                    <router-link class="nav__tab" to="/leaderboard">
                        <span class="type-label-lg">Leaderboard</span>
                    </router-link>
                    <router-link class="nav__tab" to="/roulette">
                        <span class="type-label-lg">Roulette</span>
                    </router-link>
                </div>
                <div class="nav__actions">
                    <button
                        class="nav__icon"
                        title="Toggle theme"
                        aria-label="Toggle theme"
                        @click.prevent="store.toggleDark()"
                    >
                        <img
                            :src="store.dark ? './assets/light.svg' : './assets/dark.svg'"
                            alt=""
                        />
                    </button>
                    <a
                        class="nav__icon"
                        title="Discord"
                        href="https://discord.gg/swuWBj59yp"
                        target="_blank"
                        rel="noopener"
                    >
                        <img src="./assets/discord.svg" alt="Discord" />
                    </a>
                    <a
                        class="nav__cta type-label-lg"
                        href="https://forms.gle/2j7Xy5QLZqG3sijj9"
                        target="_blank"
                        rel="noopener"
                    >Submit Record</a>
                </div>
            </nav>
        </header>
        <router-view v-slot="{ Component, route }">
            <transition name="app-fade" mode="out-in">
                <component :is="Component" :key="route.path" />
            </transition>
        </router-view>
    `,
});

const router = VueRouter.createRouter({
    history: VueRouter.createWebHashHistory(),
    routes,
});

app.use(router);
app.mount('#app');
