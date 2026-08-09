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

// Header is rendered statically in index.html so it never goes
// away. Vue only owns #app, which is a child div that holds the
// <router-view>. The <transition> wrapper gives every route
// change a soft fade.
const app = Vue.createApp({
    data: () => ({ store }),
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
