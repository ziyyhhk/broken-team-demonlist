import { register, isLoggedIn } from '../auth.js';

export default {
    data: () => ({
        username: '',
        password: '',
        confirm: '',
        error: '',
        loading: false,
    }),
    template: `
        <main class="page-auth page-shell">
            <form class="auth-card" @submit.prevent="onSubmit">
                <h1>Register</h1>
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
                    autocomplete="new-password"
                    required
                />
                <input
                    type="password"
                    v-model="confirm"
                    placeholder="Confirm Password"
                    autocomplete="new-password"
                    required
                />
                <p class="auth-error" v-if="error">{{ error }}</p>
                <button type="submit" class="auth-btn" :disabled="loading">
                    {{ loading ? '…' : 'Register' }}
                </button>
                <p class="auth-switch">
                    Already have an account?
                    <router-link to="/login">Login</router-link>
                </p>
            </form>
        </main>
    `,
    methods: {
        async onSubmit() {
            this.error = '';
            if (this.password !== this.confirm) {
                this.error = 'Passwords do not match.';
                return;
            }
            this.loading = true;
            const res = await register(this.username, this.password);
            this.loading = false;
            if (!res.ok) {
                this.error = res.error;
                return;
            }
            if (res.user.role === 'owner') this.$router.push('/admin');
            else this.$router.push('/');
        },
    },
    mounted() {
        if (isLoggedIn()) this.$router.replace('/');
    },
};
