import { login, isLoggedIn } from '../auth.js';

export default {
    data: () => ({
        username: '',
        password: '',
        error: '',
        loading: false,
    }),
    template: `
        <main class="page-auth page-shell">
            <form class="auth-card" @submit.prevent="onSubmit">
                <h1>Login</h1>
                <input
                    type="text"
                    v-model="username"
                    placeholder="Username"
                    autocomplete="username"
                    required
                />
                <input
                    type="password"
                    v-model="password"
                    placeholder="Password"
                    autocomplete="current-password"
                    required
                />
                <p class="auth-error" v-if="error">{{ error }}</p>
                <button type="submit" class="auth-btn" :disabled="loading">
                    {{ loading ? '…' : 'Login' }}
                </button>
                <p class="auth-switch">
                    No account?
                    <router-link to="/register">Register</router-link>
                </p>
            </form>
        </main>
    `,
    methods: {
        async onSubmit() {
            this.error = '';
            this.loading = true;
            const res = await login(this.username, this.password);
            this.loading = false;
            if (!res.ok) {
                this.error = res.error;
                return;
            }
            if (res.user.role === 'owner' || res.user.role === 'admin') {
                this.$router.push('/admin');
            } else {
                this.$router.push('/');
            }
        },
    },
    mounted() {
        if (isLoggedIn()) this.$router.replace('/');
    },
};
