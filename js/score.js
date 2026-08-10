/**
 * Numbers of decimal digits to round to
 */
const scale = 3;

/** Pointercrate-style defaults — List.js also loads cutoffs from data/_config.json */
const mainEnd = 75;
const extendedEnd = 150;

/**
 * Calculate the score awarded when having a certain percentage on a list level
 */
export function score(rank, percent, minPercent) {
    if (rank > extendedEnd) {
        return 0;
    }
    if (rank > mainEnd && percent < 100) {
        return 0;
    }

    let score =
        (-24.9975 * Math.pow(rank - 1, 0.4) + 200) *
        ((percent - (minPercent - 1)) / (100 - (minPercent - 1)));

    score = Math.max(0, score);

    if (percent != 100) {
        return round(score - score / 3);
    }

    return Math.max(round(score), 0);
}

export function round(num) {
    if (!('' + num).includes('e')) {
        return +(Math.round(num + 'e+' + scale) + 'e-' + scale);
    } else {
        var arr = ('' + num).split('e');
        var sig = '';
        if (+arr[1] + scale > 0) {
            sig = '+';
        }
        return +(
            Math.round(+arr[0] + 'e' + sig + (+arr[1] + scale)) +
            'e-' +
            scale
        );
    }
}
