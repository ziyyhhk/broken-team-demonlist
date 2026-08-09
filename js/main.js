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

const app = Vue.createApp({
    data: () => ({ store }),
    // Wrap router-view in a fade transition so every page change
    // gets a cinematic crossfade (CSS handles enter/leave classes
    // via the .app-fade-* selectors in main.css).
    template: `
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
