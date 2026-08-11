/**
 * Load Admin from jsDelivr so relative imports (../auth.js etc.) resolve on the CDN.
 * No blob rewrite — avoids 404 on auth/content/Spinner.
 */
export { default } from 'https://cdn.jsdelivr.net/gh/ziyyhhk/broken-team-demonlist@1ed15d470ab131c2c8c8789fcbd74d023260dde2/js/pages/Admin.js';
