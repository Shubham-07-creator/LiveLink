import { useState, useEffect, useRef } from "react";

/**
 * useVoiceActivity Hook
 * Detects voice activity in real time using the Web Audio API AnalyserNode.
 * Operates entirely on client-side DSP with zero CPU overhead.
 * 
 * @param {MediaStream|null} localStream - User's local media stream
 * @param {boolean} isAudioMuted - Whether local mic is muted
 * @param {Array<{id: string, stream: MediaStream}>} remotePeers - Active remote peers with streams
 * @returns {{ localSpeaking: boolean, speakingPeers: Object.<string, boolean> }}
 */
export default function useVoiceActivity(localStream, isAudioMuted, remotePeers = []) {
  const [localSpeaking, setLocalSpeaking] = useState(false);
  const [speakingPeers, setSpeakingPeers] = useState({});

  const audioCtxRef = useRef(null);
  const localAnalyserRef = useRef(null);
  const localSourceRef = useRef(null);
  const remoteAnalysersRef = useRef(new Map());
  const rafIdRef = useRef(null);

  // Initialize AudioContext lazily on user gesture/stream availability
  const getAudioContext = () => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  };

  // Setup Local Stream Voice Activity Detection
  useEffect(() => {
    if (!localStream || isAudioMuted) {
      setLocalSpeaking(false);
      if (localSourceRef.current) {
        try { localSourceRef.current.disconnect(); } catch (e) {}
        localSourceRef.current = null;
      }
      return;
    }

    const audioTracks = localStream.getAudioTracks();
    if (audioTracks.length === 0 || !audioTracks[0].enabled) {
      setLocalSpeaking(false);
      return;
    }

    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;
      const source = ctx.createMediaStreamSource(localStream);
      source.connect(analyser);

      localAnalyserRef.current = analyser;
      localSourceRef.current = source;
    } catch (e) {
      // Audio node connection may fail if stream ends
    }

    return () => {
      if (localSourceRef.current) {
        try { localSourceRef.current.disconnect(); } catch (e) {}
        localSourceRef.current = null;
      }
    };
  }, [localStream, isAudioMuted]);

  // Setup Remote Peers Voice Activity Detection
  useEffect(() => {
    const ctx = getAudioContext();
    if (!ctx) return;

    const currentMap = remoteAnalysersRef.current;
    const activePeerIds = new Set(remotePeers.map(p => p.id));

    // Cleanup disconnected peers
    for (const [peerId, obj] of currentMap.entries()) {
      if (!activePeerIds.has(peerId)) {
        try { obj.source.disconnect(); } catch (e) {}
        currentMap.delete(peerId);
      }
    }

    // Connect new peers
    remotePeers.forEach(peer => {
      if (!currentMap.has(peer.id) && peer.stream) {
        const audioTracks = peer.stream.getAudioTracks();
        if (audioTracks.length > 0) {
          try {
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.4;
            const source = ctx.createMediaStreamSource(peer.stream);
            source.connect(analyser);
            currentMap.set(peer.id, { analyser, source });
          } catch (e) {
            // Safe ignore if track is not yet playable
          }
        }
      }
    });
  }, [remotePeers]);

  // Continuous loop to measure RMS volume with throttling (every ~100ms)
  useEffect(() => {
    let isRunning = true;
    let lastCheck = 0;
    const SPEECH_THRESHOLD = 18; // RMS threshold for active speech

    const checkVolume = (now) => {
      if (!isRunning) return;

      if (now - lastCheck >= 100) {
        lastCheck = now;

        // Check local
        if (localAnalyserRef.current && !isAudioMuted) {
          const buffer = new Uint8Array(localAnalyserRef.current.frequencyBinCount);
          localAnalyserRef.current.getByteFrequencyData(buffer);
          let sum = 0;
          for (let i = 0; i < buffer.length; i++) {
            sum += buffer[i];
          }
          const avg = sum / buffer.length;
          setLocalSpeaking(avg > SPEECH_THRESHOLD);
        } else {
          setLocalSpeaking(false);
        }

        // Check remotes
        if (remoteAnalysersRef.current.size > 0) {
          const newSpeaking = {};
          remoteAnalysersRef.current.forEach((obj, peerId) => {
            const buffer = new Uint8Array(obj.analyser.frequencyBinCount);
            obj.analyser.getByteFrequencyData(buffer);
            let sum = 0;
            for (let i = 0; i < buffer.length; i++) {
              sum += buffer[i];
            }
            const avg = sum / buffer.length;
            newSpeaking[peerId] = avg > SPEECH_THRESHOLD;
          });
          setSpeakingPeers(newSpeaking);
        }
      }

      rafIdRef.current = requestAnimationFrame(checkVolume);
    };

    rafIdRef.current = requestAnimationFrame(checkVolume);

    return () => {
      isRunning = false;
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [isAudioMuted]);

  // Global teardown
  useEffect(() => {
    return () => {
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        try { audioCtxRef.current.close(); } catch (e) {}
      }
    };
  }, []);

  return { localSpeaking, speakingPeers };
}
