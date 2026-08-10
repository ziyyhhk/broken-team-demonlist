// https://stackoverflow.com/questions/3452546/how-do-i-get-the-youtube-video-id-from-a-url
export function getYoutubeIdFromUrl(url) {
    if (!url) return '';
    var match = String(url).match(
        /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|shorts\/|watch\?v=|watch\?.+&v=))([^#&?]{11})/,
    );
    return match ? match[1] : '';
}

export function embed(video) {
    var id = getYoutubeIdFromUrl(video);
    if (!id) return '';
    return (
        'https://www.youtube-nocookie.com/embed/' +
        id +
        '?rel=0&modestbranding=1&playsinline=1'
    );
}

export function localize(num) {
    return num.toLocaleString(undefined, { minimumFractionDigits: 3 });
}

export function getThumbnailFromId(id) {
    if (!id) return '';
    return 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg';
}

// https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
export function shuffle(array) {
    var currentIndex = array.length;
    var randomIndex;

    while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        var tmp = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = tmp;
    }

    return array;
}
