import { describe, it, expect } from 'vitest';

/**
 * Reusable Codec Ordering Logic as implemented in usePeers.js
 */
export const sortCodecsByPlatform = (codecs, isMobile) => {
  if (!Array.isArray(codecs)) return [];
  const h264Codecs = codecs.filter(c => c.mimeType?.toLowerCase() === 'video/h264');
  const vp8Codecs = codecs.filter(c => c.mimeType?.toLowerCase() === 'video/vp8');
  const vp9Codecs = codecs.filter(c => c.mimeType?.toLowerCase() === 'video/vp9');
  const av1Codecs = codecs.filter(c => c.mimeType?.toLowerCase() === 'video/av1');
  const otherCodecs = codecs.filter(c => {
    const m = c.mimeType?.toLowerCase() || '';
    return m !== 'video/h264' && m !== 'video/vp8' && m !== 'video/vp9' && m !== 'video/av1';
  });

  if (isMobile) {
    return [...h264Codecs, ...vp8Codecs, ...otherCodecs, ...vp9Codecs, ...av1Codecs];
  } else {
    return [...vp8Codecs, ...h264Codecs, ...otherCodecs, ...vp9Codecs, ...av1Codecs];
  }
};

/**
 * Stats-to-Quality Classifier Logic as implemented in useStats.js
 */
export const classifyNetworkQuality = (avgRtt, lossRatePercent) => {
  const loss = parseFloat(lossRatePercent);
  if (avgRtt > 300 || loss > 8) {
    return 'Poor';
  } else if (avgRtt > 150 || loss > 3) {
    return 'Weak';
  }
  return 'Good';
};

describe('Layer 1: Codec Preferences & Network Quality Classification', () => {
  const mockCodecs = [
    { mimeType: 'video/VP9', clockRate: 90000 },
    { mimeType: 'video/rtx', clockRate: 90000 },
    { mimeType: 'video/AV1', clockRate: 90000 },
    { mimeType: 'video/H264', clockRate: 90000 },
    { mimeType: 'video/VP8', clockRate: 90000 }
  ];

  describe('Codec Preferences Ordering', () => {
    it('prioritizes H.264 first on mobile devices, with VP9 and AV1 placed last', () => {
      const sorted = sortCodecsByPlatform(mockCodecs, true);
      expect(sorted[0].mimeType).toBe('video/H264');
      expect(sorted[1].mimeType).toBe('video/VP8');
      expect(sorted[2].mimeType).toBe('video/rtx');
      expect(sorted[3].mimeType).toBe('video/VP9');
      expect(sorted[4].mimeType).toBe('video/AV1');
    });

    it('prioritizes VP8 first on desktop browsers, with VP9 and AV1 placed last', () => {
      const sorted = sortCodecsByPlatform(mockCodecs, false);
      expect(sorted[0].mimeType).toBe('video/VP8');
      expect(sorted[1].mimeType).toBe('video/H264');
      expect(sorted[2].mimeType).toBe('video/rtx');
      expect(sorted[3].mimeType).toBe('video/VP9');
      expect(sorted[4].mimeType).toBe('video/AV1');
    });

    it('handles empty or malformed codec arrays gracefully', () => {
      expect(sortCodecsByPlatform([], false)).toEqual([]);
      expect(sortCodecsByPlatform(null, true)).toEqual([]);
    });
  });

  describe('Stats-to-Quality Classifier', () => {
    it('classifies low RTT and zero loss as Good', () => {
      expect(classifyNetworkQuality(45, '0.0')).toBe('Good');
      expect(classifyNetworkQuality(120, '1.5')).toBe('Good');
      expect(classifyNetworkQuality(150, '3.0')).toBe('Good'); // Boundary exact
    });

    it('classifies moderate latency (151 - 300 ms) or moderate loss (3.1% - 8%) as Weak', () => {
      expect(classifyNetworkQuality(151, '1.0')).toBe('Weak');
      expect(classifyNetworkQuality(250, '2.0')).toBe('Weak');
      expect(classifyNetworkQuality(80, '3.1')).toBe('Weak');
      expect(classifyNetworkQuality(80, '7.9')).toBe('Weak');
      expect(classifyNetworkQuality(300, '8.0')).toBe('Weak'); // Boundary exact
    });

    it('classifies severe latency (> 300 ms) or severe packet loss (> 8%) as Poor', () => {
      expect(classifyNetworkQuality(301, '0.0')).toBe('Poor');
      expect(classifyNetworkQuality(500, '2.0')).toBe('Poor');
      expect(classifyNetworkQuality(50, '8.1')).toBe('Poor');
      expect(classifyNetworkQuality(450, '15.0')).toBe('Poor');
    });
  });
});
