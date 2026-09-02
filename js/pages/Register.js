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
                <p class="auth-sub">Create an account on this device.</p>

                <div class="auth-field">
                    <label for="reg-user">Username</label>
                    <input
                        id="reg-user"
                        type="text"
                        v-model="username"
                        placeholder="Username"
                        autocomplete="username"
                        required
                    />
                </div>
                <div class="auth-field">
                    <label for="reg-pass">Password</label>
                    <input
                        id="reg-pass"
                        type="password"
                        v-model="password"
                        placeholder="Password"
                        autocomplete="new-password"
                        required
                    />
                </div>
                <div class="auth-field">
                    <label for="reg-confirm">Confirm password</label>
                    <input
                        id="reg-confirm"
                        type="password"
                        v-model="confirm"
                        placeholder="Confirm password"
                        autocomplete="new-password"
                        required
                    />
                </div>

                <p class="auth-error" v-if="error">{{ error }}</p>
                <p class="auth-info" v-if="info">{{ info }}</p>

                <button type="submit" class="auth-btn auth-btn--block" :disabled="loading">
                    {{ loading ? 'Creating…' : 'Register' }}
                </button>

                <p class="auth-links">
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
