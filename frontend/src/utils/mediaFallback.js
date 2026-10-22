// Fallback tracks for joining without hardware media
export const createSilenceTrack = () => {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return null;
        const ctx = new AudioCtx();
        const oscillator = ctx.createOscillator();
        const dst = oscillator.connect(ctx.createMediaStreamDestination());
        oscillator.start();
        if (ctx.state === 'suspended') ctx.resume();
        const track = dst.stream.getAudioTracks()[0];
        track.enabled = false;
        return track;
    } catch (e) {
        return null;
    }
};

export const createBlackVideoTrack = ({ width = 640, height = 480 } = {}) => {
    try {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillRect(0, 0, width, height);
        const stream = canvas.captureStream(10);
        const track = stream.getVideoTracks()[0];
        track.enabled = false;
        return track;
    } catch (e) {
        return null;
    }
};
