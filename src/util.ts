function logHR() {
    console.log('----------------------------------------------------------------------------------------');
}

function getTrackName(trackId: number): String {
    switch (trackId) {
        case 30:
            return 'Small Tipper';
        case 31:
            return 'Big Tipper';
        case 32:
            return 'Small Spender';
        case 33:
            return 'Medium Spender';
        case 34:
            return 'Big Spender';
        default:
            return 'Unsupported Track';
    }
}

export { logHR, getTrackName }