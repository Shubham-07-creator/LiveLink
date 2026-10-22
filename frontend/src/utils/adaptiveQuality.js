// WebRTC Adaptive Bitrate & Resolution Calculation

export const calculateAdaptiveParams = ({
    participantCount = 1,
    isLocalSpeaker = false,
    isScreenSharing = false,
    isMobile = false,
    qualityTier = 'Good'
} = {}) => {
    let targetBitrate = 1500000; // 1.5 Mbps default
    let targetFps = 30;
    let targetScale = 1.0;

    if (isMobile) {
        // Mobile constraint: 360p, 24fps
        targetBitrate = 400000;
        targetFps = 24;
        targetScale = 2.0;
    } else if (isScreenSharing) {
        // Screen share priority: full clarity
        targetBitrate = 2000000;
        targetFps = 30;
        targetScale = 1.0;
    } else if (isLocalSpeaker) {
        // Active speaker priority: 720p / 30fps
        targetBitrate = 1500000;
        targetFps = 30;
        targetScale = 1.0;
    } else if (participantCount <= 2) {
        // 1-on-1: 720p / 30fps
        targetBitrate = 1500000;
        targetFps = 30;
        targetScale = 1.0;
    } else if (participantCount === 3) {
        // 3 people: 480p
        targetBitrate = 800000;
        targetFps = 30;
        targetScale = 1.5;
    } else {
        // 4 people: 360p
        targetBitrate = 450000;
        targetFps = 24;
        targetScale = 2.0;
    }

    // Network degradation adjustment (Audio is NEVER dropped or degraded)
    if (qualityTier === 'Poor') {
        targetBitrate = Math.round(targetBitrate * 0.55);
        targetScale = Math.min(3.0, targetScale * 1.5);
        targetFps = Math.min(targetFps, 20);
    } else if (qualityTier === 'Weak') {
        targetBitrate = Math.round(targetBitrate * 0.8);
    }

    return { targetBitrate, targetFps, targetScale };
};
