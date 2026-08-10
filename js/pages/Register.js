import { register, isLoggedIn } from '../auth.js';

export default {
    data: () => ({
        username: '',
        password: '',
        confirm: '',
        error: '',
        info: '',
        loading: false,
    }),
    template: `
        <main class="page-auth page-shell">
            <form class="auth-card" @submit.prevent="onSubmit">
                <h1>Register</h1>
                <p class="auth-note">
                    Public accounts work on this device. For <strong>Admin</strong> access, the owner should create your account in Admin → Users and press Sync — then you can log in here.
                </p>
                <input type="text" v-model="username" placeholder="Username" autocomplete="username" required />
                <input type="password" v-model="password" placeholder="Password" autocomplete="new-password" required />
                <input type="password" v-model="confirm" placeholder="Confirm Password" autocomplete="new-password" required />
                <p class="auth-error" v-if="error">{{ error }}</p>
                <p class="auth-info" v-if="info">{{ info }}</p>
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
            this.info = '';
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
