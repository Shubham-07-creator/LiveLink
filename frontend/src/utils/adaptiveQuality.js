/**
 * WebRTC Adaptive Bitrate & Resolution Calculation
 * Bitrate table per participant count (2, 3, 4 peers) with network degradation handling.
 * Audio is prioritized and protected from video downscaling.
 */

export const calculateAdaptiveParams = ({
    participantCount = 1,
    isLocalSpeaker = false,
    isScreenSharing = false,
    isMobile = false,
    qualityTier = 'Good'
} = {}) => {
    // 1. Bitrate Table by Participant Count
    // 2 peers = 720p / 30fps / 1.5 Mbps
    // 3 peers = 480p / 30fps / 800 kbps
    // 4 peers = 360p / 24fps / 450 kbps
    let targetBitrate = 1500000;
    let targetFps = 30;
    let targetScale = 1.0;

    if (isScreenSharing) {
        // Screen share handled separately (capped at 1.2 Mbps, 15 fps)
        targetBitrate = 1200000;
        targetFps = 15;
        targetScale = 1.0;
    } else if (participantCount <= 2) {
        // 2 participants: 720p / 30fps / 1.5 Mbps
        targetBitrate = 1500000;
        targetFps = 30;
        targetScale = 1.0;
    } else if (participantCount === 3) {
        // 3 participants: 480p / 30fps / 800 kbps (scale 1.5: 720 / 1.5 = 480)
        targetBitrate = 800000;
        targetFps = 30;
        targetScale = 1.5;
    } else {
        // 4 participants: 360p / 24fps / 450 kbps (scale 2.0: 720 / 2.0 = 360)
        targetBitrate = 450000;
        targetFps = 24;
        targetScale = 2.0;
    }

    // 2. Network Degradation Adjustments
    // Weak = half the table bitrate (minimum 250 kbps floor)
    // Poor = 250 kbps / 15fps / scaleResolutionDownBy 2.0
    if (qualityTier === 'Poor') {
        targetBitrate = 250000;
        targetFps = 15;
        targetScale = Math.max(targetScale, 2.0);
    } else if (qualityTier === 'Weak') {
        targetBitrate = Math.max(250000, Math.round(targetBitrate / 2));
        targetFps = Math.min(targetFps, 24);
    }

    return { targetBitrate, targetFps, targetScale };
};
