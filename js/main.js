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
            konamiIndex = 0;
            document.body.classList.toggle('secret');
        }
    } else {
        konamiIndex = 0;
    }
});

const app = Vue.createApp({
    data: () => ({ store, auth, isOwner, can }),
    methods: {
        logout() {
            logout();
            if (this.$router) this.$router.push('/');
        },
    },
    template: `
        <div class="app" :class="{ dark: store.dark }">
            <header class="nav">
                <div class="nav__brand">
                    <h2>The Broken List</h2>
                    <p>v1.0.3</p>
                </div>
                <nav class="nav__tabs">
                    <router-link class="nav__tab" to="/"><span class="type-label-lg">List</span></router-link>
                    <router-link class="nav__tab" to="/leaderboard"><span class="type-label-lg">Leaderboard</span></router-link>
                    <router-link class="nav__tab" to="/roulette"><span class="type-label-lg">Roulette</span></router-link>
                    <router-link class="nav__tab" to="/server-hardest"><span class="type-label-lg">Server Hardest</span></router-link>
                    <router-link class="nav__tab" to="/info"><span class="type-label-lg">Info</span></router-link>
                    <router-link class="nav__tab" to="/rules"><span class="type-label-lg">Rules</span></router-link>
                    <router-link class="nav__tab" to="/credits"><span class="type-label-lg">Credits</span></router-link>
                    <router-link class="nav__tab" to="/admin" v-if="auth.user && can('levels')"><span class="type-label-lg">Admin</span></router-link>
                </nav>
                <div class="nav__actions">
                    <button type="button" class="nav__icon" @click="store.toggleDark()" title="Toggle theme">☀</button>
                    <template v-if="auth.user">
                        <span class="nav__user">{{ auth.user.username }}</span>
                        <button type="button" class="nav__link" @click="logout">Log out</button>
                    </template>
                    <template v-else>
                        <router-link class="nav__link" to="/login">Login</router-link>
                        <router-link class="nav__link" to="/register">Register</router-link>
                    </template>
                    <a class="btn" href="#/" >Submit Record</a>
                </div>
            </header>
            <router-view />
        </div>
    `,
});

const router = VueRouter.createRouter({
    history: VueRouter.createWebHashHistory(),
    routes,
});

app.use(router);
app.mount('#app');
