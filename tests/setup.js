// Global Test Setup for Vitest
import { vi } from 'vitest';

// WebRTC mock primitives
if (typeof globalThis.RTCSessionDescription === 'undefined') {
  globalThis.RTCSessionDescription = class RTCSessionDescription {
    constructor(descriptionInitDict) {
      this.type = descriptionInitDict?.type || 'offer';
      this.sdp = descriptionInitDict?.sdp || '';
    }
  };
}

if (typeof globalThis.RTCIceCandidate === 'undefined') {
  globalThis.RTCIceCandidate = class RTCIceCandidate {
    constructor(candidateInitDict) {
      this.candidate = candidateInitDict?.candidate || '';
      this.sdpMid = candidateInitDict?.sdpMid || '0';
      this.sdpMLineIndex = candidateInitDict?.sdpMLineIndex || 0;
    }
  };
}

// Window matchMedia mock for Theme tests
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });
}
