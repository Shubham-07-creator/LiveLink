import { useState, useRef, useEffect, useCallback } from 'react';
import { createSilenceTrack, createBlackVideoTrack } from '../utils/mediaFallback';

const AUDIO_CONSTRAINTS = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 1,
    sampleRate: 48000,
    latency: { ideal: 0.01, max: 0.05 }
};

const getVideoConstraints = (cameraId) => ({
    ...(cameraId ? { deviceId: { exact: cameraId } } : {}),
    width: { ideal: 1280, max: 1920 },
    height: { ideal: 720, max: 1080 },
    frameRate: { ideal: 30, min: 24, max: 30 },
    facingMode: "user"
});

export default function useMedia({ onTrackReplaced, onSpeakingStateChange } = {}) {
    const [localStream, setLocalStream] = useState(null);
    const [screenStream, setScreenStream] = useState(null);
    const [videoEnabled, setVideoEnabled] = useState(true);
    const [audioEnabled, setAudioEnabled] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [videoDevices, setVideoDevices] = useState([]);
    const [audioInputDevices, setAudioInputDevices] = useState([]);
    const [audioOutputDevices, setAudioOutputDevices] = useState([]);
    const [selectedCamera, setSelectedCamera] = useState('');
    const [selectedMicrophone, setSelectedMicrophone] = useState('');
    const [selectedSpeaker, setSelectedSpeaker] = useState('');
    const [audioVolume, setAudioVolume] = useState(0);
    const [showMutedHint, setShowMutedHint] = useState(false);

    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const animFrameRef = useRef(null);
    const localStreamRef = useRef(null);

    const loadDevices = useCallback(async () => {
        try {
            if (!navigator.mediaDevices?.enumerateDevices) return;
            const devices = await navigator.mediaDevices.enumerateDevices();
            setVideoDevices(devices.filter(d => d.kind === 'videoinput'));
            setAudioInputDevices(devices.filter(d => d.kind === 'audioinput'));
            setAudioOutputDevices(devices.filter(d => d.kind === 'audiooutput'));
        } catch (e) {}
    }, []);

    const stopAudioVisualizer = useCallback(() => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        if (audioContextRef.current) {
            try { audioContextRef.current.close(); } catch (e) {}
            audioContextRef.current = null;
        }
        analyserRef.current = null;
        setAudioVolume(0);
    }, []);

    const startAudioVisualizer = useCallback((stream) => {
        stopAudioVisualizer();
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx || !stream?.getAudioTracks().length) return;
        try {
            const ctx = new AudioCtx();
            if (ctx.state === 'suspended') ctx.resume();
            audioContextRef.current = ctx;
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 64;
            source.connect(analyser);
            analyserRef.current = analyser;
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const check = () => {
                if (!analyserRef.current) return;
                analyserRef.current.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
                const vol = Math.min(100, Math.round((sum / dataArray.length) * 2.2));
                setAudioVolume(vol);
                const isMuted = !stream.getAudioTracks()[0]?.enabled;
                onSpeakingStateChange?.(!isMuted && vol > 15);
                setShowMutedHint(isMuted && vol > 25);
                animFrameRef.current = requestAnimationFrame(check);
            };
            animFrameRef.current = requestAnimationFrame(check);
        } catch (e) {}
    }, [stopAudioVisualizer, onSpeakingStateChange]);

    const initMedia = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: getVideoConstraints(selectedCamera),
                audio: selectedMicrophone ? { deviceId: { exact: selectedMicrophone }, ...AUDIO_CONSTRAINTS } : AUDIO_CONSTRAINTS
            });
            localStreamRef.current = stream;
            setLocalStream(stream);
            setPermissionDenied(false);
            startAudioVisualizer(stream);
            await loadDevices();
        } catch (err) {
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setPermissionDenied(true);
            } else {
                try {
                    const vid = await navigator.mediaDevices.getUserMedia({ video: true });
                    localStreamRef.current = vid;
                    setLocalStream(vid);
                } catch (e) {}
                try {
                    const aud = await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS });
                    if (localStreamRef.current) aud.getAudioTracks().forEach(t => localStreamRef.current.addTrack(t));
                    else { localStreamRef.current = aud; setLocalStream(aud); }
                    startAudioVisualizer(aud);
                } catch (e) {}
            }
            await loadDevices();
        }
    }, [selectedCamera, selectedMicrophone, loadDevices, startAudioVisualizer]);

    const joinWithoutMedia = useCallback(() => {
        const tracks = [createBlackVideoTrack(), createSilenceTrack()].filter(Boolean);
        const synthStream = new MediaStream(tracks);
        localStreamRef.current = synthStream;
        setLocalStream(synthStream);
        setVideoEnabled(false);
        setAudioEnabled(false);
        setPermissionDenied(false);
    }, []);

    const switchCamera = useCallback(async (deviceId) => {
        setSelectedCamera(deviceId);
        if (!localStreamRef.current) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: getVideoConstraints(deviceId) });
            const newTrack = stream.getVideoTracks()[0];
            const oldTrack = localStreamRef.current.getVideoTracks()[0];
            if (oldTrack) { localStreamRef.current.removeTrack(oldTrack); oldTrack.stop(); }
            localStreamRef.current.addTrack(newTrack);
            newTrack.enabled = videoEnabled;
            setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
            onTrackReplaced?.('video', newTrack);
        } catch (e) {}
    }, [videoEnabled, onTrackReplaced]);

    const switchMicrophone = useCallback(async (deviceId) => {
        setSelectedMicrophone(deviceId);
        if (!localStreamRef.current) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: deviceId }, ...AUDIO_CONSTRAINTS } });
            const newTrack = stream.getAudioTracks()[0];
            const oldTrack = localStreamRef.current.getAudioTracks()[0];
            if (oldTrack) { localStreamRef.current.removeTrack(oldTrack); oldTrack.stop(); }
            localStreamRef.current.addTrack(newTrack);
            newTrack.enabled = audioEnabled;
            setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
            startAudioVisualizer(localStreamRef.current);
            onTrackReplaced?.('audio', newTrack);
        } catch (e) {}
    }, [audioEnabled, startAudioVisualizer, onTrackReplaced]);

    const switchSpeaker = useCallback(async (deviceId) => {
        setSelectedSpeaker(deviceId);
        document.querySelectorAll('audio, video').forEach(el => {
            if (typeof el.setSinkId === 'function') el.setSinkId(deviceId).catch(() => {});
        });
    }, []);

    const toggleVideo = useCallback(() => {
        const track = localStreamRef.current?.getVideoTracks()[0];
        if (track) { track.enabled = !track.enabled; setVideoEnabled(track.enabled); return track.enabled; }
        return false;
    }, []);

    const toggleAudio = useCallback(() => {
        const track = localStreamRef.current?.getAudioTracks()[0];
        if (track) { track.enabled = !track.enabled; setAudioEnabled(track.enabled); return track.enabled; }
        return false;
    }, []);

    const stopScreenShare = useCallback(() => {
        screenStream?.getTracks().forEach(t => t.stop());
        setScreenStream(null);
        setIsScreenSharing(false);
        const cam = localStreamRef.current?.getVideoTracks()[0];
        if (cam) onTrackReplaced?.('video', cam);
    }, [screenStream, onTrackReplaced]);

    const startScreenShare = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
            const track = stream.getVideoTracks()[0];
            setScreenStream(stream);
            setIsScreenSharing(true);
            track.onended = () => stopScreenShare();
            onTrackReplaced?.('video', track);
            return stream;
        } catch (e) { return null; }
    }, [onTrackReplaced, stopScreenShare]);

    useEffect(() => {
        navigator.mediaDevices?.addEventListener?.('devicechange', loadDevices);
        return () => {
            navigator.mediaDevices?.removeEventListener?.('devicechange', loadDevices);
            stopAudioVisualizer();
            localStreamRef.current?.getTracks().forEach(t => t.stop());
            screenStream?.getTracks().forEach(t => t.stop());
        };
    }, [loadDevices, stopAudioVisualizer, screenStream]);

    return {
        localStream, screenStream, videoEnabled, audioEnabled, isScreenSharing, permissionDenied,
        videoDevices, audioInputDevices, audioOutputDevices, selectedCamera, selectedMicrophone, selectedSpeaker,
        audioVolume, showMutedHint, initMedia, joinWithoutMedia, loadDevices, switchCamera, switchMicrophone, switchSpeaker,
        toggleVideo, toggleAudio, startScreenShare, stopScreenShare, stopAudioVisualizer
    };
}
