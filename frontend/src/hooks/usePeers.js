import { useState, useRef, useCallback, useEffect } from 'react';
import { calculateAdaptiveParams } from '../utils/adaptiveQuality';

const DEFAULT_STUN_SERVERS = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" }
];

export default function usePeers({ sendSignal, localStream, myId, onPeerStream, onPeerLeft } = {}) {
    const peersRef = useRef({});
    const [remoteVideos, setRemoteVideos] = useState([]);
    const [isReconnecting, setIsReconnecting] = useState(false);
    const [reconnectFailed, setReconnectFailed] = useState(false);
    const reconnectTimerRef = useRef(null);
    const iceServersRef = useRef(DEFAULT_STUN_SERVERS);

    const setIceServers = useCallback((servers) => {
        if (Array.isArray(servers) && servers.length) iceServersRef.current = servers;
    }, []);

    // 45s Reconnection Watchdog
    useEffect(() => {
        if (isReconnecting) {
            if (!reconnectTimerRef.current) {
                reconnectTimerRef.current = setTimeout(() => setReconnectFailed(true), 45000);
            }
        } else {
            if (reconnectTimerRef.current) {
                clearTimeout(reconnectTimerRef.current);
                reconnectTimerRef.current = null;
            }
            setReconnectFailed(false);
        }
        return () => { if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current); };
    }, [isReconnecting]);

    const updateReconnectionState = useCallback(() => {
        const peers = Object.values(peersRef.current);
        const hasReconnecting = peers.some(p => 
            p.pc && (p.pc.connectionState === 'disconnected' || p.pc.iceConnectionState === 'disconnected' || p.pc.connectionState === 'failed')
        );
        setIsReconnecting(hasReconnecting);
    }, []);

    const closePeer = useCallback((peerId) => {
        const peer = peersRef.current[peerId];
        if (peer) {
            if (peer.disconnectTimer) clearTimeout(peer.disconnectTimer);
            if (peer.pc) {
                peer.pc.ontrack = null;
                peer.pc.onicecandidate = null;
                peer.pc.onconnectionstatechange = null;
                peer.pc.oniceconnectionstatechange = null;
                peer.pc.onnegotiationneeded = null;
                try { peer.pc.close(); } catch (e) {}
            }
            delete peersRef.current[peerId];
        }
        setRemoteVideos(prev => prev.filter(v => v.socketId !== peerId));
        onPeerLeft?.(peerId);
        updateReconnectionState();
    }, [onPeerLeft, updateReconnectionState]);

    // Create RTCPeerConnection with Perfect Negotiation
    const createPeer = useCallback((peerId, meta = {}) => {
        if (peersRef.current[peerId]?.pc) return peersRef.current[peerId].pc;

        const isPolite = myId ? (myId > peerId) : true;
        const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });

        const peerEntry = {
            pc, isPolite, makingOffer: false, ignoreOffer: false,
            isSettingRemoteAnswerPending: false, iceCandidateQueue: [], senders: {},
            disconnectTimer: null, name: meta.name || "Participant", avatar: meta.avatar || null
        };
        peersRef.current[peerId] = peerEntry;

        if (localStream) {
            localStream.getTracks().forEach(track => {
                peerEntry.senders[track.kind] = pc.addTrack(track, localStream);
            });
        }

        pc.onnegotiationneeded = async () => {
            try {
                peerEntry.makingOffer = true;
                await pc.setLocalDescription();
                sendSignal?.(peerId, { description: pc.localDescription });
            } catch (err) {
                console.error(`[WebRTC] Negotiation error for ${peerId}:`, err);
            } finally {
                peerEntry.makingOffer = false;
            }
        };

        pc.onicecandidate = (event) => {
            if (event.candidate) sendSignal?.(peerId, { candidate: event.candidate });
        };

        pc.ontrack = (event) => {
            const [stream] = event.streams;
            const remoteStream = stream || new MediaStream([event.track]);
            setRemoteVideos(prev => {
                const existing = prev.find(v => v.socketId === peerId);
                if (existing) return prev.map(v => v.socketId === peerId ? { ...v, stream: remoteStream } : v);
                return [...prev, {
                    socketId: peerId, stream: remoteStream, name: peerEntry.name, avatar: peerEntry.avatar,
                    videoEnabled: event.track.kind === 'video' ? event.track.enabled : true
                }];
            });
            onPeerStream?.(peerId, remoteStream);
        };

        const handleStateChange = () => {
            const state = pc.connectionState || pc.iceConnectionState;
            if (state === 'disconnected') {
                setIsReconnecting(true);
                if (!peerEntry.disconnectTimer) {
                    peerEntry.disconnectTimer = setTimeout(() => {
                        if (pc.connectionState === 'disconnected' || pc.iceConnectionState === 'disconnected') {
                            try { pc.restartIce(); } catch (e) {}
                        }
                    }, 5000);
                }
            } else if (state === 'failed') {
                setIsReconnecting(true);
                closePeer(peerId);
                createPeer(peerId, meta);
            } else if (state === 'connected') {
                if (peerEntry.disconnectTimer) {
                    clearTimeout(peerEntry.disconnectTimer);
                    peerEntry.disconnectTimer = null;
                }
                updateReconnectionState();
            }
        };

        pc.onconnectionstatechange = handleStateChange;
        pc.oniceconnectionstatechange = handleStateChange;
        return pc;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [myId, localStream, sendSignal, onPeerStream, updateReconnectionState, closePeer]);

    // Signal handling
    const handleSignal = useCallback(async (senderId, signalData) => {
        let peer = peersRef.current[senderId];
        if (!peer) { createPeer(senderId); peer = peersRef.current[senderId]; }
        if (!peer?.pc) return;
        const pc = peer.pc;

        try {
            if (signalData.description) {
                const { description } = signalData;
                const readyForOffer = !peer.makingOffer && (pc.signalingState === "stable" || peer.isSettingRemoteAnswerPending);
                const offerCollision = description.type === "offer" && !readyForOffer;
                peer.ignoreOffer = !peer.isPolite && offerCollision;
                if (peer.ignoreOffer) return;

                peer.isSettingRemoteAnswerPending = description.type === "answer";
                await pc.setRemoteDescription(new RTCSessionDescription(description));
                peer.isSettingRemoteAnswerPending = false;

                while (peer.iceCandidateQueue.length > 0) {
                    const cand = peer.iceCandidateQueue.shift();
                    try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch (e) {}
                }

                if (description.type === "offer") {
                    await pc.setLocalDescription();
                    sendSignal?.(senderId, { description: pc.localDescription });
                }
            } else if (signalData.candidate) {
                const cand = new RTCIceCandidate(signalData.candidate);
                if (pc.remoteDescription?.type) {
                    try { await pc.addIceCandidate(cand); } catch (e) {}
                } else {
                    peer.iceCandidateQueue.push(signalData.candidate);
                }
            }
        } catch (err) {
            console.error(`[WebRTC] Signal handling error from ${senderId}:`, err);
        }
    }, [createPeer, sendSignal]);

    // Live track replacement
    const replaceTrackOnPeers = useCallback(async (kind, newTrack) => {
        const promises = Object.values(peersRef.current).map(async (peer) => {
            const sender = peer.senders?.[kind];
            if (sender && typeof sender.replaceTrack === 'function') {
                try { await sender.replaceTrack(newTrack); } catch (e) {}
            } else if (peer.pc && newTrack) {
                try { peer.senders[kind] = peer.pc.addTrack(newTrack, localStream); } catch (e) {}
            }
        });
        await Promise.all(promises);
    }, [localStream]);

    // PHASE 2: Adaptive sender parameter adjustment
    const applyAdaptiveQuality = useCallback(async (options) => {
        const { targetBitrate, targetFps, targetScale } = calculateAdaptiveParams(options);
        for (const peer of Object.values(peersRef.current)) {
            const videoSender = peer.senders?.['video'];
            if (videoSender && typeof videoSender.getParameters === 'function') {
                try {
                    const params = videoSender.getParameters();
                    if (!params.encodings || params.encodings.length === 0) params.encodings = [{}];
                    params.encodings[0].maxBitrate = targetBitrate;
                    params.encodings[0].maxFramerate = targetFps;
                    params.encodings[0].scaleResolutionDownBy = targetScale;
                    await videoSender.setParameters(params);
                } catch (e) {}
            }
        }
    }, []);

    // Pause video sends when tab is hidden (Audio stays active)
    useEffect(() => {
        const handleVisibilityChange = () => {
            const isHidden = document.hidden;
            Object.values(peersRef.current).forEach(peer => {
                const videoSender = peer.senders?.['video'];
                if (videoSender && typeof videoSender.getParameters === 'function') {
                    try {
                        const params = videoSender.getParameters();
                        if (params.encodings?.[0]) {
                            params.encodings[0].active = !isHidden;
                            videoSender.setParameters(params).catch(() => {});
                        }
                    } catch (e) {}
                }
            });
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    const closeAllPeers = useCallback(() => {
        Object.keys(peersRef.current).forEach(id => closePeer(id));
        peersRef.current = {};
        setRemoteVideos([]);
        setIsReconnecting(false);
    }, [closePeer]);

    useEffect(() => {
        const handleBeforeUnload = () => closeAllPeers();
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            closeAllPeers();
        };
    }, [closeAllPeers]);

    return {
        peersRef, remoteVideos, isReconnecting, reconnectFailed, setRemoteVideos,
        setIceServers, createPeer, closePeer, closeAllPeers, handleSignal,
        replaceTrackOnPeers, applyAdaptiveQuality
    };
}
