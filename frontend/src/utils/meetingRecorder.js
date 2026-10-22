// Audio mixing and MediaRecorder helper for host-side local recording

export class MeetingRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.audioContext = null;
        this.destination = null;
    }

    startRecording(localStream, remoteVideos = []) {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioCtx();
            if (this.audioContext.state === 'suspended') this.audioContext.resume();
            this.destination = this.audioContext.createMediaStreamDestination();

            // Connect local audio
            if (localStream?.getAudioTracks().length) {
                const localSource = this.audioContext.createMediaStreamSource(localStream);
                localSource.connect(this.destination);
            }

            // Connect all remote participants audio
            remoteVideos.forEach(({ stream }) => {
                if (stream?.getAudioTracks().length) {
                    try {
                        const remoteSource = this.audioContext.createMediaStreamSource(stream);
                        remoteSource.connect(this.destination);
                    } catch (e) {
                        console.warn("Could not connect remote stream to recording:", e);
                    }
                }
            });

            // Combine video from local stream (or screen) with mixed audio
            const tracks = [...this.destination.stream.getAudioTracks()];
            if (localStream?.getVideoTracks().length) {
                tracks.push(localStream.getVideoTracks()[0]);
            }

            const mixedStream = new MediaStream(tracks);
            this.recordedChunks = [];

            const options = { mimeType: 'video/webm;codecs=vp8,opus' };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                delete options.mimeType;
            }

            this.mediaRecorder = new MediaRecorder(mixedStream, options);
            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data?.size > 0) this.recordedChunks.push(e.data);
            };

            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `LiveLink-Meeting-${Date.now()}.webm`;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                }, 100);

                if (this.audioContext) {
                    try { this.audioContext.close(); } catch (e) {}
                    this.audioContext = null;
                }
            };

            this.mediaRecorder.start(1000);
            return true;
        } catch (err) {
            console.error("Failed to start recording:", err);
            return false;
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
    }
}
