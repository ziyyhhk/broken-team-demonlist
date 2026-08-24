export default {
    props: {
        author: {
            type: String,
            required: true,
        },
        creators: {
            type: Array,
            required: true,
        },
        verifier: {
            type: String,
            required: true,
        },
    },
    template: `
        <div class="level-authors">
            <template v-if="selfVerified">
                <div class="type-title-sm">Creator & Verifier</div>
                <p class="type-body">
                    <span>{{ author }}</span>
                </p>
            </template>
            <template v-else>
                <div class="type-title-sm">{{ creators.length > 1 ? 'Creators' : 'Creator' }}</div>
                <p class="type-body">
                    <template v-if="creators.length">
                        <template v-for="(creator, index) in creators" :key="'c-' + index">
                            <span>{{ creator }}</span><span v-if="index < creators.length - 1">, </span>
                        </template>
                    </template>
                    <span v-else>{{ author || '—' }}</span>
                </p>
                <template v-if="hasVerifier">
                    <div class="type-title-sm">Verifier</div>
                    <p class="type-body">
                        <span>{{ verifier }}</span>
                    </p>
                </template>
            </template>
            <template v-if="showPublisher">
                <div class="type-title-sm">Publisher</div>
                <p class="type-body">
                    <span>{{ author }}</span>
                </p>
            </template>
        </div>
    `,

    computed: {
        hasVerifier() {
            return !!(this.verifier && String(this.verifier).trim());
        },
        selfVerified() {
            if (!this.hasVerifier) return false;
            return this.author === this.verifier && (!this.creators || this.creators.length === 0);
        },
        showPublisher() {
            const a = String(this.author || '').trim();
            if (!a || a === '?' || a === '??') return false;
            const creators = this.creators || [];
            if (creators.length === 1 && creators[0] === a) return false;
            if (!creators.length && a) return false;
            return true;
        },
    },
};
