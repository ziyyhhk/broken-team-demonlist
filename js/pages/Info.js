export default {
    template: `
        <main class="page-doc page-shell">
            <div class="doc-wrap">
                <header class="doc-hero">
                    <h1>About the Broken List</h1>
                    <p class="doc-subtitle">What this list is, who it’s for, and how placements work</p>
                </header>

                <section class="doc-panel">
                    <h2 class="doc-h2">
                        <span class="doc-icon">i</span>
                        What is this?
                    </h2>
                    <p>
                        The Broken List is Broken Team’s public ranking of hard Geometry Dash levels.
                        It’s not limited to extreme demons only — if a level is at least <strong>Hard</strong> difficulty,
                        long enough, and someone has beaten it with clean proof, it can be considered for the list.
                    </p>
                    <p>
                        Rankings are based on how hard the level is to complete, not on how flashy the decoration is.
                        Higher on the list means harder. Completing a higher-ranked level gives more leaderboard points.
                    </p>

                    <div class="doc-two-col">
                        <div>
                            <h3>How ranks work</h3>
                            <ul class="doc-bullets">
                                <li><strong>Main</strong> — the hardest levels currently on the list</li>
                                <li><strong>Extended</strong> — still ranked, but below Main</li>
                                <li><strong>Legacy</strong> — levels that fell off Extended when harder ones got added</li>
                            </ul>
                            <p class="doc-note">
                                When a new hard level is placed high enough, everything below it shifts down.
                                If something drops past Extended, it goes Legacy. Legacy levels stay visible,
                                but new records usually stop being accepted after a short grace period.
                            </p>
                        </div>
                        <div>
                            <h3>What you can do here</h3>
                            <ul class="doc-bullets">
                                <li>Browse levels by tier and open details / verification</li>
                                <li>Submit your own completions through the form in the header</li>
                                <li>Check the leaderboard for points from verified records</li>
                                <li>Play roulette runs using Main / Extended levels</li>
                                <li>Ask questions or report issues on Discord</li>
                            </ul>
                        </div>
                    </div>

                    <div class="doc-box">
                        <h3>Getting a level on the list</h3>
                        <p class="doc-lead">
                            Staff decide placements. There’s no automatic “upload and you’re in.”
                            In practice it goes roughly like this:
                        </p>
                        <ol class="doc-steps">
                            <li><span>1</span> Someone verifies the level (or a strong completion exists) with a clear video</li>
                            <li><span>2</span> The level is suggested to staff — Discord is the usual place</li>
                            <li><span>3</span> Staff check length, difficulty floor, quality, and that the clear is legitimate</li>
                            <li><span>4</span> If it fits, it’s placed somewhere on Main or Extended by difficulty</li>
                            <li><span>5</span> Later, if harder levels push it down far enough, it can fall to Legacy</li>
                        </ol>
                    </div>

                    <div class="doc-box doc-box--checks">
                        <h3>Bare minimum for a level to even be considered</h3>
                        <ul class="doc-checks">
                            <li>At least Hard difficulty (nothing below that)</li>
                            <li>At least 30 seconds long (no upper limit)</li>
                            <li>Actually completable — someone has to have beaten it</li>
                            <li>Public verification or completion video staff can review</li>
                            <li>No intended path that is just a secret route or a major bug</li>
                            <li>Staff sign-off before it goes live on the list</li>
                        </ul>
                    </div>

                    <div class="doc-box">
                        <h3>Records and the leaderboard</h3>
                        <p>
                            Points come from completions (and progress, where the list allows it) on ranked levels.
                            Higher ranks are worth more. Legacy is mostly historical after the grace window —
                            see the Rules page for exactly what a video needs to include.
                        </p>
                        <p>
                            If something looks wrong on the board, it’s usually a missing or pending submission.
                            Ping staff on Discord instead of assuming the site is broken.
                        </p>
                    </div>
                </section>
            </div>
        </main>
    `,
};
