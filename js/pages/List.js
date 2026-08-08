async mounted() {
    this.list = await fetchList();
    this.editors = await fetchEditors();

    if (!this.list) {
        this.errors = ["Failed to load list. Retry in a few minutes or notify list staff."];
    } else {
        this.errors.push(
            ...this.list
                .filter(([_, err]) => err)
                .map(([_, err]) => `Failed to load level. (${err}.json)`)
        );
        if (!this.editors) {
            this.errors.push("Failed to load list editors.");
        }
    }

    this.loading = false;

    // ===== SECRETS =====
    console.log("%c broken team was here ", "background:#45b545;color:#fff;padding:6px 12px;border-radius:6px;font-weight:bold");
    console.log("%c type 'broken' in the console for a secret ", "color:#45b545");

    window.broken = () => {
        console.log("%c you found the secret ", "background:#111;color:#45b545;padding:8px 14px;border-radius:8px;font-size:14px");
        console.log("%c the list is broken... but so are the rules ", "color:#888");
        document.body.style.setProperty("--color-primary", "#ff2d55");
        setTimeout(() => {
            document.body.style.setProperty("--color-primary", "#45b545");
        }, 3000);
    };
},
