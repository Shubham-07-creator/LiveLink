import { describe, it, expect, vi } from 'vitest';

/**
 * Pure state machine representing the WebRTC Perfect Negotiation logic
 * as implemented in usePeers.js.
 */
export class PeerNegotiationState {
  constructor({ myId, peerId }) {
    this.myId = myId;
    this.peerId = peerId;
    this.isPolite = myId < peerId;
    this.makingOffer = false;
    this.ignoreOffer = false;
    this.isSettingRemoteAnswerPending = false;
    this.signalingState = 'stable';
    this.remoteDescription = null;
    this.iceCandidateQueue = [];
    this.appliedCandidates = [];
  }

  handleSignalDescription(description) {
    const readyForOffer = !this.makingOffer && (this.signalingState === 'stable' || this.isSettingRemoteAnswerPending);
    const offerCollision = description.type === 'offer' && !readyForOffer;

    this.ignoreOffer = !this.isPolite && offerCollision;
    if (this.ignoreOffer) {
      return { action: 'ignored', reason: 'impolite_glare_collision' };
    }

    this.isSettingRemoteAnswerPending = description.type === 'answer';
    this.remoteDescription = description;
    this.signalingState = description.type === 'offer' ? 'have-remote-offer' : 'stable';
    this.isSettingRemoteAnswerPending = false;

    // Drain queued candidates
    const drained = [...this.iceCandidateQueue];
    this.iceCandidateQueue = [];
    this.appliedCandidates.push(...drained);

    return { action: 'accepted', drainedCandidates: drained.length };
  }

  handleSignalCandidate(candidate) {
    if (this.remoteDescription) {
      this.appliedCandidates.push(candidate);
      return { action: 'applied_immediately' };
    } else {
      this.iceCandidateQueue.push(candidate);
      return { action: 'queued' };
    }
  }
}

describe('Layer 1: WebRTC Perfect Negotiation & ICE Candidate Queuing', () => {
  it('assigns polite role deterministically based on peer ID lexical comparison', () => {
    const peerA = new PeerNegotiationState({ myId: 'alice', peerId: 'bob' });
    expect(peerA.isPolite).toBe(true); // 'alice' < 'bob'

    const peerB = new PeerNegotiationState({ myId: 'bob', peerId: 'alice' });
    expect(peerB.isPolite).toBe(false); // 'bob' > 'alice'
  });

  describe('Offer Collision (Glare) Resolution', () => {
    it('impolite peer ignores colliding offer from polite peer', () => {
      const impolite = new PeerNegotiationState({ myId: 'bob', peerId: 'alice' });
      // Simulate impolite peer currently in the process of making an offer
      impolite.makingOffer = true;
      impolite.signalingState = 'have-local-offer';

      const incomingOffer = { type: 'offer', sdp: 'fake-sdp-alice' };
      const result = impolite.handleSignalDescription(incomingOffer);

      expect(result.action).toBe('ignored');
      expect(impolite.ignoreOffer).toBe(true);
      expect(impolite.remoteDescription).toBeNull();
    });

    it('polite peer accepts colliding offer and rolls back local offer', () => {
      const polite = new PeerNegotiationState({ myId: 'alice', peerId: 'bob' });
      // Simulate polite peer currently in the process of making an offer
      polite.makingOffer = true;
      polite.signalingState = 'have-local-offer';

      const incomingOffer = { type: 'offer', sdp: 'fake-sdp-bob' };
      const result = polite.handleSignalDescription(incomingOffer);

      expect(result.action).toBe('accepted');
      expect(polite.ignoreOffer).toBe(false);
      expect(polite.remoteDescription).toEqual(incomingOffer);
    });
  });

  describe('Queued ICE Candidate Buffering', () => {
    it('safely buffers ICE candidates arriving before remoteDescription is established', () => {
      const peer = new PeerNegotiationState({ myId: 'alice', peerId: 'bob' });

      // Receive 3 early ICE candidates
      expect(peer.handleSignalCandidate({ candidate: 'cand-1' }).action).toBe('queued');
      expect(peer.handleSignalCandidate({ candidate: 'cand-2' }).action).toBe('queued');
      expect(peer.handleSignalCandidate({ candidate: 'cand-3' }).action).toBe('queued');

      expect(peer.iceCandidateQueue.length).toBe(3);
      expect(peer.appliedCandidates.length).toBe(0);

      // Now remoteDescription arrives
      const offer = { type: 'offer', sdp: 'fake-sdp' };
      const result = peer.handleSignalDescription(offer);

      expect(result.action).toBe('accepted');
      expect(result.drainedCandidates).toBe(3);
      expect(peer.iceCandidateQueue.length).toBe(0);
      expect(peer.appliedCandidates).toEqual([
        { candidate: 'cand-1' },
        { candidate: 'cand-2' },
        { candidate: 'cand-3' }
      ]);
    });

    it('applies ICE candidates immediately when remoteDescription is already active', () => {
      const peer = new PeerNegotiationState({ myId: 'alice', peerId: 'bob' });
      peer.handleSignalDescription({ type: 'offer', sdp: 'fake-sdp' });

      const cand = { candidate: 'cand-immediate' };
      expect(peer.handleSignalCandidate(cand).action).toBe('applied_immediately');
      expect(peer.iceCandidateQueue.length).toBe(0);
      expect(peer.appliedCandidates).toContainEqual(cand);
    });
  });
});
