import { round, score } from './score.js';

const dir = './data';

async function fetchJson(path) {
    const res = await fetch(path);
    if (!res.ok) {
        throw new Error(`${path} responded with ${res.status}`);
    }
    return res.json();
}

export async function fetchConfig() {
    try {
        const cfg = await fetchJson(`${dir}/_config.json`);
        return {
            mainCutoff: Number(cfg.mainCutoff) || 75,
            extendedCutoff: Number(cfg.extendedCutoff) || 150,
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
        const { verified } = scoreMap[verifier];
        verified.push({
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
            const { completed, progressed } = scoreMap[user];
            if (record.percent === 100) {
                completed.push({
                    rank: rank + 1,
                    level: level.name,
                    score: score(rank + 1, 100, level.percentToQualify),
                    link: record.link,
                });
                return;
            }

            progressed.push({
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
