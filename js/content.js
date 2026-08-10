import { round, score } from './score.js';

const dir = './data';

/** Bust browser / CDN cache so Admin saves show up after Pages rebuilds. */
async function fetchJson(path) {
    const url = path + (path.includes('?') ? '&' : '?') + 't=' + Date.now();
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
        throw new Error(`${path} responded with ${res.status}`);
    }
    return res.json();
}

export async function fetchConfig() {
    try {
        const cfg = await fetchJson(`${dir}/_config.json`);
        const main = Number(cfg.mainCutoff);
        const ext = Number(cfg.extendedCutoff);
        return {
            mainCutoff: Number.isFinite(main) && main > 0 ? main : 75,
            extendedCutoff: Number.isFinite(ext) && ext > 0 ? ext : 150,
        };
    } catch (e) {
        console.error('Failed to load config.', e);
        return { mainCutoff: 75, extendedCutoff: 150 };
    }
}

export async function fetchList() {
    let list;
    try {
        list = await fetchJson(`${dir}/_list.json`);
    } catch (e) {
        console.error('Failed to load list.', e);
        return null;
    }

    if (!Array.isArray(list)) {
        console.error('_list.json must contain an array of level file names.');
        return null;
    }

    return Promise.all(
        list.map(async (path, rank) => {
            try {
                const level = await fetchJson(`${dir}/${path}.json`);
                return [
                    {
                        ...level,
                        path,
                        records: [...(level.records ?? [])].sort(
                            (a, b) => b.percent - a.percent,
                        ),
                    },
                    null,
                ];
            } catch (e) {
                console.error(`Failed to load level #${rank + 1} ${path}.`, e);
                return [null, path];
            }
        }),
    );
}

export async function fetchEditors() {
    try {
        return await fetchJson(`${dir}/_editors.json`);
    } catch (e) {
        console.error('Failed to load editors.', e);
        return null;
    }
}

export async function fetchInfo() {
    try {
        return await fetchJson(`${dir}/info.json`);
    } catch (e) {
        console.error('Failed to load info.', e);
        return null;
    }
}

export async function fetchRules() {
    try {
        return await fetchJson(`${dir}/rules.json`);
    } catch (e) {
        console.error('Failed to load rules.', e);
        return null;
    }
}

export async function fetchLeaderboard() {
    const list = await fetchList();

    if (!list) {
        return [[], ['_list']];
    }

    const scoreMap = {};
    const errs = [];
    list.forEach(([level, err], rank) => {
        if (err || !level) {
            errs.push(err ?? `#${rank + 1}`);
            return;
        }

        const verifier =
            Object.keys(scoreMap).find(
                (u) => u.toLowerCase() === level.verifier.toLowerCase(),
            ) || level.verifier;
        scoreMap[verifier] ??= {
            verified: [],
            completed: [],
            progressed: [],
        };
        scoreMap[verifier].verified.push({
            rank: rank + 1,
            level: level.name,
            score: score(rank + 1, 100, level.percentToQualify),
            link: level.verification,
        });

        (level.records ?? []).forEach((record) => {
            const user =
                Object.keys(scoreMap).find(
                    (u) => u.toLowerCase() === record.user.toLowerCase(),
                ) || record.user;
            scoreMap[user] ??= {
                verified: [],
                completed: [],
                progressed: [],
            };
            if (record.percent === 100) {
                scoreMap[user].completed.push({
                    rank: rank + 1,
                    level: level.name,
                    score: score(rank + 1, 100, level.percentToQualify),
                    link: record.link,
                });
                return;
            }

            scoreMap[user].progressed.push({
                rank: rank + 1,
                level: level.name,
                percent: record.percent,
                score: score(rank + 1, record.percent, level.percentToQualify),
                link: record.link,
            });
        });
    });

    const res = Object.entries(scoreMap).map(([user, scores]) => {
        const { verified, completed, progressed } = scores;
        const total = [verified, completed, progressed]
            .flat()
            .reduce((prev, cur) => prev + cur.score, 0);

        return {
            user,
            total: round(total),
            ...scores,
        };
    });

    return [res.sort((a, b) => b.total - a.total), errs];
}
