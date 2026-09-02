/**
 * Temporary loader: serves the last known-good Admin panel from the pinned commit
 * so the site stays usable. Submissions tab can be merged in a follow-up.
 */
const url =
  'https://cdn.jsdelivr.net/gh/ziyyhhk/broken-team-demonlist@01bf14bc226d2ebb59211f19cbef12d93a635f04/js/pages/Admin.js';

const mod = await import(/* @vite-ignore */ url);
export default mod.default;
