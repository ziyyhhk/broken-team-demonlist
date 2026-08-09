/**
 * Numbers of decimal digits to round to
 */
const scale = 3;

/**
 * Demo cutoffs — must match List.js.
 * For production Pointercrate-style: mainEnd = 75, extendedEnd = 150.
 */
const mainEnd = 2;
const extendedEnd = 4;

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

    // Scale formula so small demo ranks still give readable points
    const scaledRank = 1 + ((rank - 1) / Math.max(extendedEnd - 1, 1)) * 149;
    let score =
        (-24.9975 * Math.pow(scaledRank - 1, 0.4) + 200) *
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
