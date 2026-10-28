// WebRTC Adaptive Bitrate & Resolution Calculation

export const calculateAdaptiveParams = ({
    participantCount = 1,
    isLocalSpeaker = false,
    isScreenSharing = false,
    isMobile = false,
    qualityTier = 'Good'
} = {}) => {
    let targetBitrate = 1800000; // 1.8 Mbps default for crystal-clear HD
    let targetFps = 30;
    let targetScale = 1.0;

    if (isScreenSharing) {
        // Screen share priority: full clarity, 30fps
        targetBitrate = 2500000;
        targetFps = 30;
        targetScale = 1.0;
    } else if (participantCount <= 2) {
        // 1-on-1 calls: Full HD / 720p 30fps fluid video
        targetBitrate = isMobile ? 1200000 : 1800000;
        targetFps = 30;
        targetScale = 1.0;
    } else if (isLocalSpeaker) {
        // Active speaker priority: 720p / 30fps
        targetBitrate = isMobile ? 1000000 : 1500000;
        targetFps = 30;
        targetScale = 1.0;
    } else if (participantCount === 3) {
        // 3 people mesh: Balanced 540p / 30fps
        targetBitrate = isMobile ? 650000 : 900000;
        targetFps = 30;
        targetScale = isMobile ? 1.5 : 1.25;
    } else {
        // 4 people mesh: 360p / 30fps (mobile 24fps)
        targetBitrate = isMobile ? 450000 : 650000;
        targetFps = isMobile ? 24 : 30;
        targetScale = isMobile ? 2.0 : 1.5;
    }

    // Network degradation adjustment (Audio is NEVER dropped or degraded)
    if (qualityTier === 'Poor') {
        targetBitrate = Math.round(targetBitrate * 0.55);
        targetScale = Math.min(3.0, targetScale * 1.5);
        targetFps = Math.min(targetFps, 24);
    } else if (qualityTier === 'Weak') {
        targetBitrate = Math.round(targetBitrate * 0.8);
    }

    return { targetBitrate, targetFps, targetScale };
};
