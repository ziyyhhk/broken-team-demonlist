export default {
    template: `
        <main class="page-doc page-shell">
            <div class="doc-wrap">
                <header class="doc-hero">
                    <h1>About the Broken List</h1>
                    <p class="doc-subtitle">Understanding how the list works and our policies</p>
                </header>

                <section class="doc-panel">
                    <h2 class="doc-h2">
                        <span class="doc-icon">i</span>
                        How the List Works
                    </h2>
                    <p>
                        The Broken List is a ranked list of extreme demons curated by Broken Team.
                        Levels are ordered by difficulty. Completing higher-ranked levels awards more points on the leaderboard.
                    </p>

                    <div class="doc-two-col">
                        <div>
                            <h3>Ranking System</h3>
                            <ul class="doc-bullets">
                                <li>Levels are ordered in <code>data/_list.json</code> from hardest to easiest</li>
                                <li>Main List covers the top ranks</li>
                                <li>Extended List covers the next tier</li>
                                <li>Anything past the Extended cutoff falls to Legacy</li>
                            </ul>
                        </div>
                        <div>
                            <h3>Community Features</h3>
                            <ul class="doc-bullets">
                                <li>Submit records through the form in the header</li>
                                <li>Climb the player leaderboard with verified completions</li>
                                <li>Run a demon roulette from Main / Extended levels</li>
                                <li>Join the Discord for list updates and discussion</li>
                            </ul>
                        </div>
                    </div>

                    <div class="doc-box">
                        <h3>Submission Process</h3>
                        <ol class="doc-steps">
                            <li><span>1</span> Player submits a record with video proof</li>
                            <li><span>2</span> List staff reviews the recording against the rules</li>
                            <li><span>3</span> Approved records are added to the level’s JSON</li>
                            <li><span>4</span> Leaderboard points update from the new completion</li>
                            <li><span>5</span> When new levels push older ones past the cutoff, they move to Legacy</li>
                        </ol>
                    </div>

                    <div class="doc-box doc-box--checks">
                        <h3>Basic Requirements for List Eligibility</h3>
                        <ul class="doc-checks">
                            <li>Extreme demon difficulty suitable for the list</li>
                            <li>Physically possible to complete</li>
                            <li>Passes quality / spam control standards</li>
                            <li>Has a verification video</li>
                            <li>No secret routes or broken physics exploits as the intended path</li>
                            <li>Staff approval required for placement</li>
                        </ul>
                    </div>
                </section>
            </div>
        </main>
    `,
};
