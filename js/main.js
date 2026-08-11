import routes from './routes.js';
import { auth, logout, isOwner, can } from './auth.js';

export const store = Vue.reactive({
    dark: JSON.parse(localStorage.getItem('dark')) || false,
    togglingTheme: false,
    toggleDark() {
        if (this.togglingTheme) return;
        this.togglingTheme = true;

        const veil = document.createElement('div');
        veil.className = 'theme-veil';
        document.body.appendChild(veil);
        void veil.offsetWidth;
        veil.classList.add('theme-veil--in');

        window.setTimeout(() => {
            this.dark = !this.dark;
            localStorage.setItem('dark', JSON.stringify(this.dark));
            document.body.classList.toggle('dark', this.dark);

            veil.classList.remove('theme-veil--in');
            veil.classList.add('theme-veil--out');

            window.setTimeout(() => {
                veil.remove();
                this.togglingTheme = false;
            }, 380);
        }, 220);
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

const app = Vue.createApp({
    data: () => ({ store, auth }),
    computed: {
        showAdmin() {
            if (!auth.user) return false;
            return isOwner() || can('editLevels') || can('editList') || can('editEditors') || can('manageUsers');
        },
    },
    methods: {
        onLogout() {
            logout();
            if (this.$router) this.$router.push('/');
        },
    },
    template: `
        <header>
            <div class="logo">
                <div class="logo__text">
                    <h2>The Broken List</h2>
                    <p>v1.0.1</p>
                </div>
            </div>
            <nav class="nav">
                <div class="nav__tabs">
                    <router-link class="nav__tab" to="/"><span class="type-label-lg">List</span></router-link>
                    <router-link class="nav__tab" to="/leaderboard"><span class="type-label-lg">Leaderboard</span></router-link>
                    <router-link class="nav__tab" to="/roulette"><span class="type-label-lg">Roulette</span></router-link>
                    <router-link class="nav__tab" to="/server-hardest"><span class="type-label-lg">Server Hardest</span></router-link>
                    <router-link class="nav__tab" to="/info"><span class="type-label-lg">Info</span></router-link>
                    <router-link class="nav__tab" to="/rules"><span class="type-label-lg">Rules</span></router-link>
                    <router-link class="nav__tab" to="/credits"><span class="type-label-lg">Credits</span></router-link>
                    <router-link v-if="showAdmin" class="nav__tab" to="/admin"><span class="type-label-lg">Admin</span></router-link>
                </div>
                <div class="nav__actions">
                    <button
                        class="nav__icon"
                        title="Toggle theme"
                        aria-label="Toggle theme"
                        @click.prevent="store.toggleDark()"
                    >
                        <img :src="store.dark ? './assets/light.svg' : './assets/dark.svg'" alt="" />
                    </button>
                    <a class="nav__icon" title="Discord" href="https://discord.gg/swuWBj59yp" target="_blank" rel="noopener">
                        <img src="./assets/discord.svg" alt="Discord" />
                    </a>
                    <template v-if="auth.user">
                        <span class="nav__user">{{ auth.user.username }}</span>
                        <button type="button" class="nav__text-btn" @click="onLogout">Log out</button>
                    </template>
                    <template v-else>
                        <router-link class="nav__text-btn" to="/login">Login</router-link>
                        <router-link class="nav__text-btn" to="/register">Register</router-link>
                    </template>
                    <a
                        class="nav__cta type-label-lg"
                        href="https://forms.gle/2j7Xy5QLZqG3sijj9"
                        target="_blank"
                        rel="noopener"
                    >Submit Record</a>
                </div>
            </nav>
        </header>
        <div class="page-stage">
            <router-view v-slot="{ Component, route }">
                <transition name="page" mode="out-in">
                    <component :is="Component" :key="route.fullPath" />
                </transition>
            </router-view>
        </div>
    `,
});

const router = VueRouter.createRouter({
    history: VueRouter.createWebHashHistory(),
    routes,
    linkActiveClass: 'nav-active',
    linkExactActiveClass: 'nav-exact',
});

app.use(router);
app.mount('#app');
