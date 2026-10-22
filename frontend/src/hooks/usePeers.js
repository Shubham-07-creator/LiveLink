import { useState, useRef, useCallback, useEffect } from 'react';

const DEFAULT_STUN_SERVERS = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" }
];

export default function usePeers({ sendSignal, localStream, myId, onPeerStream, onPeerLeft } = {}) {
    const peersRef = useRef({}); // peerId -> { pc, isPolite, makingOffer, ignoreOffer, isSettingRemoteAnswerPending, iceCandidateQueue, senders, disconnectTimer }
    const [remoteVideos, setRemoteVideos] = useState([]); // [{ socketId, stream, name, avatar, videoEnabled }]
    const [isReconnecting, setIsReconnecting] = useState(false);
    const [reconnectFailed, setReconnectFailed] = useState(false);
    const reconnectTimerRef = useRef(null);
    const iceServersRef = useRef(DEFAULT_STUN_SERVERS);

    // Update ICE servers (e.g. from backend endpoint)
    const setIceServers = useCallback((servers) => {
        if (Array.isArray(servers) && servers.length) {
            iceServersRef.current = servers;
        }
    }, []);

    // 45s Reconnection Failure Watchdog
    useEffect(() => {
        if (isReconnecting) {
            if (!reconnectTimerRef.current) {
                reconnectTimerRef.current = setTimeout(() => {
                    setReconnectFailed(true);
                }, 45000);
            }
        } else {
            if (reconnectTimerRef.current) {
                clearTimeout(reconnectTimerRef.current);
                reconnectTimerRef.current = null;
            }
            setReconnectFailed(false);
        }
        return () => {
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        };
    }, [isReconnecting]);

    // Check if any peer is still reconnecting
    const updateReconnectionState = useCallback(() => {
        const peers = Object.values(peersRef.current);
        const hasReconnecting = peers.some(p => 
            p.pc && (p.pc.connectionState === 'disconnected' || p.pc.iceConnectionState === 'disconnected' || p.pc.connectionState === 'failed')
        );
        setIsReconnecting(hasReconnecting);
    }, []);

    // Close a single peer connection cleanly
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

    // Create RTCPeerConnection with Perfect Negotiation pattern
    const createPeer = useCallback((peerId, meta = {}) => {
        if (peersRef.current[peerId]?.pc) {
            return peersRef.current[peerId].pc;
        }

        const isPolite = myId ? (myId > peerId) : true;
        const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });

        const peerEntry = {
            pc,
            isPolite,
            makingOffer: false,
            ignoreOffer: false,
            isSettingRemoteAnswerPending: false,
            iceCandidateQueue: [],
            senders: {},
            disconnectTimer: null,
            name: meta.name || "Participant",
            avatar: meta.avatar || null
        };
        peersRef.current[peerId] = peerEntry;

        // Add local tracks to peer connection
        if (localStream) {
            localStream.getTracks().forEach(track => {
                const sender = pc.addTrack(track, localStream);
                peerEntry.senders[track.kind] = sender;
            });
        }

        // PERFECT NEGOTIATION: onnegotiationneeded
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

        // ICE candidate generation
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                sendSignal?.(peerId, { candidate: event.candidate });
            }
        };

        // Modern ontrack listener
        pc.ontrack = (event) => {
            const [stream] = event.streams;
            const remoteStream = stream || new MediaStream([event.track]);

            setRemoteVideos(prev => {
                const existing = prev.find(v => v.socketId === peerId);
                if (existing) {
                    return prev.map(v => v.socketId === peerId ? { ...v, stream: remoteStream } : v);
                }
                return [...prev, {
                    socketId: peerId,
                    stream: remoteStream,
                    name: peerEntry.name,
                    avatar: peerEntry.avatar,
                    videoEnabled: event.track.kind === 'video' ? event.track.enabled : true
                }];
            });

            onPeerStream?.(peerId, remoteStream);
        };

        // ConnectionState monitoring & ICE Restart
        const handleStateChange = () => {
            const state = pc.connectionState || pc.iceConnectionState;

            if (state === 'disconnected') {
                setIsReconnecting(true);
                if (!peerEntry.disconnectTimer) {
                    peerEntry.disconnectTimer = setTimeout(() => {
                        if (pc.connectionState === 'disconnected' || pc.iceConnectionState === 'disconnected') {
                            console.warn(`[WebRTC] Peer ${peerId} disconnected >5s. Triggering restartIce().`);
                            try { pc.restartIce(); } catch (e) { console.error("restartIce error:", e); }
                        }
                    }, 5000);
                }
            } else if (state === 'failed') {
                setIsReconnecting(true);
                console.warn(`[WebRTC] Peer ${peerId} failed. Recreating peer connection.`);
                recreatePeer(peerId, meta);
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
    }, [myId, localStream, sendSignal, onPeerStream, updateReconnectionState]);

    // Recreate a failed peer connection
    const recreatePeer = useCallback((peerId, meta) => {
        closePeer(peerId);
        createPeer(peerId, meta);
    }, [closePeer, createPeer]);

    // Handle incoming signals (SDP descriptions & ICE candidates)
    const handleSignal = useCallback(async (senderId, signalData) => {
        let peer = peersRef.current[senderId];
        if (!peer) {
            createPeer(senderId);
            peer = peersRef.current[senderId];
        }
        if (!peer || !peer.pc) return;

        const pc = peer.pc;

        try {
            if (signalData.description) {
                const { description } = signalData;
                const readyForOffer = !peer.makingOffer && (pc.signalingState === "stable" || peer.isSettingRemoteAnswerPending);
                const offerCollision = description.type === "offer" && !readyForOffer;

                peer.ignoreOffer = !peer.isPolite && offerCollision;
                if (peer.ignoreOffer) {
                    console.warn(`[WebRTC Perfect Negotiation] Impolite peer ignoring colliding offer from ${senderId}`);
                    return;
                }

                peer.isSettingRemoteAnswerPending = description.type === "answer";
                await pc.setRemoteDescription(new RTCSessionDescription(description));
                peer.isSettingRemoteAnswerPending = false;

                // Drain queued ICE candidates
                while (peer.iceCandidateQueue.length > 0) {
                    const candidate = peer.iceCandidateQueue.shift();
                    try {
                        await pc.addIceCandidate(new RTCIceCandidate(candidate));
                    } catch (e) {
                        if (!peer.ignoreOffer) console.warn("Queued ICE candidate error:", e);
                    }
                }

                if (description.type === "offer") {
                    await pc.setLocalDescription();
                    sendSignal?.(senderId, { description: pc.localDescription });
                }
            } else if (signalData.candidate) {
                const candidate = new RTCIceCandidate(signalData.candidate);
                if (pc.remoteDescription && pc.remoteDescription.type) {
                    try {
                        await pc.addIceCandidate(candidate);
                    } catch (e) {
                        if (!peer.ignoreOffer) console.warn("addIceCandidate error:", e);
                    }
                } else {
                    peer.iceCandidateQueue.push(signalData.candidate);
                }
            }
        } catch (err) {
            console.error(`[WebRTC] Signal handling error from ${senderId}:`, err);
        }
    }, [createPeer, sendSignal]);

    // Live track replacement across all active senders
    const replaceTrackOnPeers = useCallback(async (kind, newTrack) => {
        const promises = Object.values(peersRef.current).map(async (peer) => {
            const sender = peer.senders?.[kind];
            if (sender && typeof sender.replaceTrack === 'function') {
                try {
                    await sender.replaceTrack(newTrack);
                } catch (e) {
                    console.warn(`Failed to replace ${kind} track on peer:`, e);
                }
            } else if (peer.pc && newTrack) {
                try {
                    const newSender = peer.pc.addTrack(newTrack, localStream);
                    peer.senders[kind] = newSender;
                } catch (e) {
                    console.warn("addTrack fallback error:", e);
                }
            }
        });
        await Promise.all(promises);
    }, [localStream]);

    // Close all peer connections on leave/unload
    const closeAllPeers = useCallback(() => {
        Object.keys(peersRef.current).forEach(id => closePeer(id));
        peersRef.current = {};
        setRemoteVideos([]);
        setIsReconnecting(false);
    }, [closePeer]);

    // Clean up on page unload
    useEffect(() => {
        const handleBeforeUnload = () => closeAllPeers();
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            closeAllPeers();
        };
    }, [closeAllPeers]);

    return {
        peersRef,
        remoteVideos,
        isReconnecting,
        reconnectFailed,
        setRemoteVideos,
        setIceServers,
        createPeer,
        closePeer,
        closeAllPeers,
        handleSignal,
        replaceTrackOnPeers
    };
}
