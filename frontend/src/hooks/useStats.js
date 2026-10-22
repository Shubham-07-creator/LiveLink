import { useState, useRef, useEffect, useCallback } from 'react';

export default function useStats({ peersRef, isCallActive, onQualityAdjustmentNeeded } = {}) {
    const [overallQuality, setOverallQuality] = useState('Good');
    const [statsSummary, setStatsSummary] = useState({ rtt: 45, loss: '0.0', bitrate: 0 });
    const [peerQualities, setPeerQualities] = useState({}); // peerId -> { quality, rtt, loss }
    const [activeSpeakingPeers, setActiveSpeakingPeers] = useState({}); // peerId -> boolean

    const consecutiveGoodCountRef = useRef(0);
    const intervalRef = useRef(null);

    const pollStats = useCallback(async () => {
        if (!peersRef?.current) return;

        let totalRtt = 0;
        let rttCount = 0;
        let totalLost = 0;
        let totalReceived = 0;
        const newPeerQualities = {};
        const speakingMap = {};

        const entries = Object.entries(peersRef.current);
        for (const [peerId, peer] of entries) {
            const pc = peer.pc;
            if (!pc || (pc.connectionState !== 'connected' && pc.iceConnectionState !== 'connected')) {
                continue;
            }

            try {
                const stats = await pc.getStats();
                let peerRtt = 0;
                let peerLost = 0;
                let peerReceived = 0;

                for (const report of stats.values()) {
                    if (report.type === 'candidate-pair' && report.state === 'succeeded' && report.currentRoundTripTime) {
                        peerRtt = Math.round(report.currentRoundTripTime * 1000);
                        totalRtt += peerRtt;
                        rttCount++;
                    }
                    if (report.type === 'inbound-rtp') {
                        if (typeof report.packetsLost === 'number') {
                            peerLost += report.packetsLost;
                            totalLost += report.packetsLost;
                        }
                        if (typeof report.packetsReceived === 'number') {
                            peerReceived += report.packetsReceived;
                            totalReceived += report.packetsReceived;
                        }
                        if (report.kind === 'audio' && typeof report.audioLevel === 'number') {
                            if (report.audioLevel > 0.04) {
                                speakingMap[peerId] = true;
                            }
                        }
                    }
                }

                const peerLossRate = peerReceived > 0 
                    ? ((peerLost / (peerReceived + peerLost)) * 100).toFixed(1) 
                    : '0.0';

                let quality = 'Good';
                if (peerRtt > 300 || parseFloat(peerLossRate) > 8) {
                    quality = 'Poor';
                } else if (peerRtt > 150 || parseFloat(peerLossRate) > 3) {
                    quality = 'Weak';
                }

                newPeerQualities[peerId] = { quality, rtt: peerRtt, loss: peerLossRate };
            } catch (e) {
                // Ignore stats errors during peer renegotiation/teardown
            }
        }

        if (rttCount > 0) {
            const avgRtt = Math.round(totalRtt / rttCount);
            const overallLossRate = totalReceived > 0 
                ? ((totalLost / (totalReceived + totalLost)) * 100).toFixed(1) 
                : '0.0';

            let currentQuality = 'Good';
            if (avgRtt > 300 || parseFloat(overallLossRate) > 8) {
                currentQuality = 'Poor';
            } else if (avgRtt > 150 || parseFloat(overallLossRate) > 3) {
                currentQuality = 'Weak';
            }

            setOverallQuality(currentQuality);
            setStatsSummary({ rtt: avgRtt, loss: overallLossRate, bitrate: 0 });
            setPeerQualities(newPeerQualities);

            // Phase 2 Adaptive Quality triggers:
            // If Poor: downgrade immediately.
            // If Good for 15s (5 polls of 3s): gradually upgrade.
            if (currentQuality === 'Poor') {
                consecutiveGoodCountRef.current = 0;
                onQualityAdjustmentNeeded?.('downgrade');
            } else if (currentQuality === 'Good') {
                consecutiveGoodCountRef.current += 1;
                if (consecutiveGoodCountRef.current >= 5) {
                    onQualityAdjustmentNeeded?.('upgrade');
                    consecutiveGoodCountRef.current = 0;
                }
            } else {
                consecutiveGoodCountRef.current = 0;
            }
        }

        setActiveSpeakingPeers(speakingMap);
    }, [peersRef, onQualityAdjustmentNeeded]);

    useEffect(() => {
        if (!isCallActive) return;

        intervalRef.current = setInterval(pollStats, 3000);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isCallActive, pollStats]);

    return {
        overallQuality,
        statsSummary,
        peerQualities,
        activeSpeakingPeers
    };
}
