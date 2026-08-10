export default {
    template: `
        <main class="page-doc page-shell">
            <div class="doc-wrap">
                <header class="doc-hero">
                    <p class="doc-kicker">INFO</p>
                    <h1>About the Broken List</h1>
                    <p class="doc-subtitle">What this list is, who it is for, and how placements work</p>
                </header>

                <section class="doc-panel">
                    <h2 class="doc-h2"><span class="doc-icon">i</span> What is this?</h2>
                    <p>
                        The Broken List is Broken Team's public ranking of hard Geometry Dash levels.
                        It is not limited to extreme demons only. If a level is at least <strong>Hard</strong> difficulty,
                        long enough, and someone has beaten it with clean proof, it can be considered for the list.
                    </p>
                    <p>
                        Rankings are based on how hard the level is to finish, not on how popular the creator is
                        or how expensive the decoration looks. Higher on the list means harder. Completing a
                        higher-ranked level gives more leaderboard points.
                    </p>
                    <p>
                        The site has three tiers so the board does not turn into one endless scroll:
                        <strong>Main</strong> for the hardest stuff currently ranked,
                        <strong>Extended</strong> for everything still on the active board below Main,
                        and <strong>Legacy</strong> for levels that got pushed off Extended when harder ones landed.
                    </p>

                    <div class="doc-two-col">
                        <div>
                            <h3>How ranks move</h3>
                            <ul class="doc-bullets">
                                <li>Staff place levels by difficulty, then the order is the list</li>
                                <li>New hard levels can shove older ones down</li>
                                <li>When something drops past Extended, it goes Legacy</li>
                                <li>Legacy stays visible so history does not vanish overnight</li>
                            </ul>
                            <p class="doc-note">
                                There is a short window after a level hits Legacy where records may still be accepted.
                                After that, the level is closed for new submissions. Details are on the Rules page.
                            </p>
                        </div>
                        <div>
                            <h3>What you can do here</h3>
                            <ul class="doc-bullets">
                                <li>Browse Main, Extended, and Legacy</li>
                                <li>Open a level for video, ID, password, and records</li>
                                <li>Submit completions through the form in the header</li>
                                <li>Track points on the leaderboard</li>
                                <li>Run roulette challenges from Main / Extended</li>
                                <li>Ask questions or report issues on Discord</li>
                            </ul>
                        </div>
                    </div>

                    <div class="doc-box">
                        <h3>Getting a level on the list</h3>
                        <p class="doc-lead">
                            Nothing auto-adds. Staff have to actually look at it. Rough flow:
                        </p>
                        <ol class="doc-steps">
                            <li><span>1</span> Someone verifies or fully completes the level on a clear video</li>
                            <li><span>2</span> The level gets suggested to staff (Discord is the usual place)</li>
                            <li><span>3</span> Staff check length, difficulty floor, quality, and that the clear is real</li>
                            <li><span>4</span> If it fits, it lands on Main or Extended based on how hard it is</li>
                            <li><span>5</span> Later, if harder levels push it far enough, it can fall to Legacy</li>
                        </ol>
                    </div>

                    <div class="doc-box doc-box--checks">
                        <h3>Bare minimum before staff will even look</h3>
                        <ul class="doc-checks">
                            <li>At least Hard difficulty (nothing below that)</li>
                            <li>At least 30 seconds long (no upper limit)</li>
                            <li>Actually completable — someone has beaten it</li>
                            <li>Public video staff can review</li>
                            <li>No intended path that is only a secret route or a major bug</li>
                            <li>Staff sign-off before it goes live</li>
                        </ul>
                    </div>

                    <div class="doc-box">
                        <h3>Records and the leaderboard</h3>
                        <p>
                            Points come from verified completions on ranked levels. Higher ranks are worth more.
                            Progress records may count on some Main levels depending on the page. Extended usually wants 100%.
                            Legacy is mostly closed after the grace window.
                        </p>
                        <p>
                            If the board looks wrong, it is usually a missing or pending submission.
                            Ping staff on Discord with the video link instead of guessing.
                        </p>
                        <p>
                            Full recording requirements (clicks, attempts, CPS, cheat indicator, <strong>exactly 240 TPS</strong>, CBF, etc.)
                            live on the <strong>Rules</strong> page. Read that before you grind a submission you care about.
                        </p>
                    </div>

                    <div class="doc-box">
                        <h3>Who runs this</h3>
                        <p>
                            Broken Team maintains the list, reviews submissions, and decides placements.
                            Rulings are final. Being loud about a deny does not change the video.
                            Being clear in Discord usually gets a faster answer than a vague complaint.
                        </p>
                    </div>
                </section>
            </div>
        </main>
    `,
};
