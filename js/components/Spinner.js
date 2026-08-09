export default {
    template: `
        <div class="spinner" role="status" aria-live="polite">
            <div class="spinner__mark" aria-hidden="true">
                <span></span><span></span><span></span>
            </div>
            <div class="spinner__copy">
                <strong>The Broken List</strong>
                <span>Loading levels<span class="spinner__dots" aria-hidden="true">...</span></span>
            </div>
            <div class="spinner__track" aria-hidden="true"><div></div></div>
        </div>
    `,
};
