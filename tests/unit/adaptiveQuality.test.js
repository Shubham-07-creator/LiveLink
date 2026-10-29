import { describe, it, expect } from 'vitest';
import { calculateAdaptiveParams } from '../../frontend/src/utils/adaptiveQuality.js';

describe('Layer 1: Adaptive Bitrate Table & Quality Degradation', () => {
  describe('Participant Count Table (Good Network Tier)', () => {
    it('sets 720p / 30fps / 1.5 Mbps for 1 or 2 participants', () => {
      const singlePeer = calculateAdaptiveParams({ participantCount: 1, qualityTier: 'Good' });
      expect(singlePeer.targetBitrate).toBe(1500000);
      expect(singlePeer.targetFps).toBe(30);
      expect(singlePeer.targetScale).toBe(1.0);

      const twoPeers = calculateAdaptiveParams({ participantCount: 2, qualityTier: 'Good' });
      expect(twoPeers.targetBitrate).toBe(1500000);
      expect(twoPeers.targetFps).toBe(30);
      expect(twoPeers.targetScale).toBe(1.0);
    });

    it('sets 480p / 30fps / 800 kbps for 3 participants', () => {
      const threePeers = calculateAdaptiveParams({ participantCount: 3, qualityTier: 'Good' });
      expect(threePeers.targetBitrate).toBe(800000);
      expect(threePeers.targetFps).toBe(30);
      expect(threePeers.targetScale).toBe(1.5); // 720 / 1.5 = 480
    });

    it('sets 360p / 24fps / 450 kbps for 4 participants', () => {
      const fourPeers = calculateAdaptiveParams({ participantCount: 4, qualityTier: 'Good' });
      expect(fourPeers.targetBitrate).toBe(450000);
      expect(fourPeers.targetFps).toBe(24);
      expect(fourPeers.targetScale).toBe(2.0); // 720 / 2.0 = 360
    });

    it('defaults to 4-participant profile if participant count exceeds 4', () => {
      const overflowPeers = calculateAdaptiveParams({ participantCount: 5, qualityTier: 'Good' });
      expect(overflowPeers.targetBitrate).toBe(450000);
      expect(overflowPeers.targetFps).toBe(24);
      expect(overflowPeers.targetScale).toBe(2.0);
    });
  });

  describe('Screen Share Override Guardrails', () => {
    it('caps screen share at 1.2 Mbps and 15 fps with unscaled resolution (scale 1.0)', () => {
      const screenShare2Peers = calculateAdaptiveParams({
        participantCount: 2,
        isScreenSharing: true,
        qualityTier: 'Good'
      });
      expect(screenShare2Peers.targetBitrate).toBe(1200000);
      expect(screenShare2Peers.targetFps).toBe(15);
      expect(screenShare2Peers.targetScale).toBe(1.0);

      const screenShare4Peers = calculateAdaptiveParams({
        participantCount: 4,
        isScreenSharing: true,
        qualityTier: 'Good'
      });
      expect(screenShare4Peers.targetBitrate).toBe(1200000);
      expect(screenShare4Peers.targetFps).toBe(15);
      expect(screenShare4Peers.targetScale).toBe(1.0);
    });
  });

  describe('Network Degradation Adjustments (Weak & Poor)', () => {
    it('Weak Network: halves table bitrate with a minimum floor of 250 kbps and max 24 fps', () => {
      // 2 peers: 1.5 Mbps / 2 = 750 kbps
      const weak2Peers = calculateAdaptiveParams({ participantCount: 2, qualityTier: 'Weak' });
      expect(weak2Peers.targetBitrate).toBe(750000);
      expect(weak2Peers.targetFps).toBe(24);
      expect(weak2Peers.targetScale).toBe(1.0);

      // 3 peers: 800 kbps / 2 = 400 kbps
      const weak3Peers = calculateAdaptiveParams({ participantCount: 3, qualityTier: 'Weak' });
      expect(weak3Peers.targetBitrate).toBe(400000);
      expect(weak3Peers.targetFps).toBe(24);
      expect(weak3Peers.targetScale).toBe(1.5);

      // 4 peers: 450 kbps / 2 = 225 kbps -> clamped to 250 kbps floor
      const weak4Peers = calculateAdaptiveParams({ participantCount: 4, qualityTier: 'Weak' });
      expect(weak4Peers.targetBitrate).toBe(250000); // Enforced 250 kbps floor
      expect(weak4Peers.targetFps).toBe(24);
      expect(weak4Peers.targetScale).toBe(2.0);
    });

    it('Poor Network: clamps to 250 kbps, 15 fps, and scaleResolutionDownBy 2.0', () => {
      const poor2Peers = calculateAdaptiveParams({ participantCount: 2, qualityTier: 'Poor' });
      expect(poor2Peers.targetBitrate).toBe(250000);
      expect(poor2Peers.targetFps).toBe(15);
      expect(poor2Peers.targetScale).toBe(2.0);

      const poor4Peers = calculateAdaptiveParams({ participantCount: 4, qualityTier: 'Poor' });
      expect(poor4Peers.targetBitrate).toBe(250000);
      expect(poor4Peers.targetFps).toBe(15);
      expect(poor4Peers.targetScale).toBe(2.0);
    });
  });

  describe('Graceful Defaults', () => {
    it('handles missing or empty arguments with safe standard defaults', () => {
      const defaultResult = calculateAdaptiveParams();
      expect(defaultResult.targetBitrate).toBe(1500000);
      expect(defaultResult.targetFps).toBe(30);
      expect(defaultResult.targetScale).toBe(1.0);
    });
  });
});
