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

    const myIdRef = useRef(myId);
    myIdRef.current = myId;
    const localStreamRef = useRef(localStream);
    localStreamRef.current = localStream;
    const sendSignalRef = useRef(sendSignal);
    sendSignalRef.current = sendSignal;
    const onPeerStreamRef = useRef(onPeerStream);
    onPeerStreamRef.current = onPeerStream;

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
        const currentMyId = myIdRef.current;
        // Strict guard: Never create peer connection to oneself or invalid target
        if (!peerId || (currentMyId && peerId === currentMyId)) {
            return null;
        }

        if (peersRef.current[peerId]?.pc) {
            if (meta.name) peersRef.current[peerId].name = meta.name;
            if (meta.avatar) peersRef.current[peerId].avatar = meta.avatar;
            return peersRef.current[peerId].pc;
        }

        const isPolite = currentMyId ? (currentMyId > peerId) : true;
        const pc = new RTCPeerConnection({
            iceServers: iceServersRef.current,
            bundlePolicy: "max-bundle",
            rtcpMuxPolicy: "require",
            iceCandidatePoolSize: 6
        });

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
            avatar: meta.avatar || null,
            remoteStream: new MediaStream()
        };
        peersRef.current[peerId] = peerEntry;

        const activeStream = localStreamRef.current;
        if (activeStream) {
            activeStream.getTracks().forEach(track => {
                try {
                    peerEntry.senders[track.kind] = pc.addTrack(track, activeStream);
                } catch (e) {}
            });
        }

        // Hardware-Accelerated Codec Optimization (VP8 & H264 Prioritization)
        try {
            if (typeof RTCRtpSender.getCapabilities === "function") {
                const capabilities = RTCRtpSender.getCapabilities("video");
                if (capabilities && Array.isArray(capabilities.codecs)) {
                    const preferred = capabilities.codecs.filter(c => 
                        c.mimeType.toLowerCase() === "video/vp8" || 
                        c.mimeType.toLowerCase() === "video/h264"
                    );
                    const others = capabilities.codecs.filter(c => !preferred.includes(c));
                    const sortedCodecs = [...preferred, ...others];

                    pc.getTransceivers().forEach(transceiver => {
                        if (transceiver.sender?.track?.kind === "video" && typeof transceiver.setCodecPreferences === "function") {
                            try { transceiver.setCodecPreferences(sortedCodecs); } catch (e) {}
                        }
                    });
                }
            }
        } catch (e) {}

        // Enforce maintain-framerate for buttery-smooth video transmission
        if (peerEntry.senders['video'] && typeof peerEntry.senders['video'].getParameters === 'function') {
            try {
                const params = peerEntry.senders['video'].getParameters();
                params.degradationPreference = 'maintain-framerate';
                if (!params.encodings || params.encodings.length === 0) params.encodings = [{}];
                params.encodings[0].networkPriority = 'high';
                peerEntry.senders['video'].setParameters(params).catch(() => {});
            } catch (e) {}
        }

        pc.onnegotiationneeded = async () => {
            if (pc.signalingState !== "stable" || peerEntry.makingOffer) return;
            try {
                peerEntry.makingOffer = true;
                await pc.setLocalDescription();
                sendSignalRef.current?.(peerId, { description: pc.localDescription });
            } catch (err) {
                console.error(`[WebRTC] Negotiation error for ${peerId}:`, err);
            } finally {
                peerEntry.makingOffer = false;
            }
        };

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                sendSignalRef.current?.(peerId, { candidate: event.candidate });
            }
        };

        pc.ontrack = (event) => {
            if (!peerEntry.remoteStream) {
                peerEntry.remoteStream = new MediaStream();
            }
            if (!peerEntry.remoteStream.getTracks().some(t => t.id === event.track.id)) {
                peerEntry.remoteStream.addTrack(event.track);
            }

            const streamToUse = (event.streams && event.streams[0]) ? event.streams[0] : peerEntry.remoteStream;

            const syncRemoteVideo = () => {
                const freshStream = new MediaStream(streamToUse.getTracks());
                const videoTracks = freshStream.getVideoTracks();
                const hasVideo = videoTracks.length > 0 && videoTracks.some(t => t.enabled !== false);

                setRemoteVideos(prev => {
                    const existingIndex = prev.findIndex(v => v.socketId === peerId);
                    const item = {
                        socketId: peerId,
                        stream: freshStream,
                        name: peerEntry.name,
                        avatar: peerEntry.avatar,
                        videoEnabled: hasVideo
                    };
                    if (existingIndex !== -1) {
                        const copy = [...prev];
                        copy[existingIndex] = item;
                        return copy;
                    }
                    return [...prev, item];
                });
            };

            event.track.onunmute = syncRemoteVideo;
            event.track.onmute = syncRemoteVideo;
            event.track.onended = syncRemoteVideo;

            syncRemoteVideo();
            onPeerStreamRef.current?.(peerId, streamToUse);
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
    }, [closePeer, updateReconnectionState]);

    // Signal handling
    const handleSignal = useCallback(async (senderId, signalData) => {
        const currentMyId = myIdRef.current;
        if (!senderId || (currentMyId && senderId === currentMyId)) return;

        let peer = peersRef.current[senderId];
        if (!peer) {
            createPeer(senderId, {});
            peer = peersRef.current[senderId];
        }
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
                    sendSignalRef.current?.(senderId, { description: pc.localDescription });
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
    }, [createPeer]);

    // Live track replacement
    const replaceTrackOnPeers = useCallback(async (kind, newTrack) => {
        const activeLocal = localStreamRef.current;
        const promises = Object.values(peersRef.current).map(async (peer) => {
            const sender = peer.senders?.[kind];
            if (sender && typeof sender.replaceTrack === 'function') {
                try { await sender.replaceTrack(newTrack); } catch (e) {}
            } else if (peer.pc && newTrack) {
                try {
                    peer.senders[kind] = peer.pc.addTrack(newTrack, activeLocal);
                } catch (e) {}
            }
        });
        await Promise.all(promises);
    }, []);

    // PHASE 2: Adaptive sender parameter adjustment
    const applyAdaptiveQuality = useCallback(async (options) => {
        const { targetBitrate, targetFps, targetScale } = calculateAdaptiveParams(options);
        for (const peer of Object.values(peersRef.current)) {
            const videoSender = peer.senders?.['video'];
            if (videoSender && typeof videoSender.getParameters === 'function') {
                try {
                    const params = videoSender.getParameters();
                    params.degradationPreference = 'maintain-framerate';
                    if (!params.encodings || params.encodings.length === 0) params.encodings = [{}];
                    params.encodings[0].maxBitrate = targetBitrate;
                    params.encodings[0].maxFramerate = targetFps;
                    params.encodings[0].scaleResolutionDownBy = targetScale;
                    params.encodings[0].networkPriority = 'high';
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
