import React, { useEffect, useRef, useState } from 'react'
import io from "socket.io-client";
import { Badge, IconButton, TextField, Box, Typography, Paper } from '@mui/material';
import { Button } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff'
import styles from "../styles/videoComponent.module.css";
import CallEndIcon from '@mui/icons-material/CallEnd'
import MicIcon from '@mui/icons-material/Mic'
import MicOffIcon from '@mui/icons-material/MicOff'
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare'
import ChatIcon from '@mui/icons-material/Chat'
import server from '../environment';

const server_url = server;
var connections = {};

const peerConfigConnections = {
    "iceServers": [
        { "urls": "stun:stun.l.google.com:19302" }
    ]
}

const nameOverlayStyle = {
    position: 'absolute', bottom: 10, left: 10, color: 'white', 
    backgroundColor: 'rgba(0,0,0,0.6)', px: 1.5, py: 0.5, borderRadius: 1, fontWeight: 'bold', zIndex: 10
};

export default function VideoMeetComponent() {
    var socketRef = useRef();
    let socketIdRef = useRef();
    let localVideoref = useRef();
    let miniLocalVideoRef = useRef(); 
    const messageInputRef = useRef(null); 

    let [videoAvailable, setVideoAvailable] = useState(true);
    let [audioAvailable, setAudioAvailable] = useState(true);

    let [video, setVideo] = useState(true); 
    let [audio, setAudio] = useState(true);

    let [screen, setScreen] = useState();
    let [showModal, setModal] = useState(true);
    let [screenAvailable, setScreenAvailable] = useState();
    let [messages, setMessages] = useState([])
    let [newMessages, setNewMessages] = useState(0);

    let [askForUsername, setAskForUsername] = useState(true);
    let [username, setUsername] = useState("");

    const videoRef = useRef([])
    let [videos, setVideos] = useState([])
    let [isRemoteMain, setIsRemoteMain] = useState(false);
    const roomNamesRef = useRef({});

    useEffect(() => {
        getPermissions();
    }, [])

    useEffect(() => {
        if (!askForUsername && window.localStream) {
            if (video) {
                if (localVideoref.current) localVideoref.current.srcObject = window.localStream;
                if (miniLocalVideoRef.current) miniLocalVideoRef.current.srcObject = window.localStream;
            } else {
                if (localVideoref.current) localVideoref.current.srcObject = null;
                if (miniLocalVideoRef.current) miniLocalVideoRef.current.srcObject = null;
            }
        }
    }, [isRemoteMain, askForUsername, videos, video]);

    let getDislayMedia = () => {
        if (screen) {
            if (navigator.mediaDevices.getDisplayMedia) {
                navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
                    .then(getDislayMediaSuccess)
                    .catch((e) => console.log(e))
            }
        }
    }

    const getPermissions = async () => {
        try {
            const videoPermission = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoPermission) setVideoAvailable(true);

            const audioPermission = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (audioPermission) setAudioAvailable(true);

            setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);

            if (videoAvailable || audioAvailable) {
                const userMediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                if (userMediaStream) {
                    window.localStream = userMediaStream;
                    if (localVideoref.current) {
                        localVideoref.current.srcObject = userMediaStream;
                    }
                }
            }
        } catch (error) {
            console.log(error);
        }
    };

    useEffect(() => {
        if (video !== undefined && audio !== undefined) {
            getUserMedia();
        }
    }, [video, audio])

    let getMedia = () => {
        setVideo(videoAvailable);
        setAudio(audioAvailable);
        connectToSocketServer();
    }

    let getUserMediaSuccess = (stream) => {
        try {
            window.localStream.getTracks().forEach(track => track.stop())
        } catch (e) { console.log(e) }

        window.localStream = stream
        if (localVideoref.current && video) localVideoref.current.srcObject = stream;
        if (miniLocalVideoRef.current && video) miniLocalVideoRef.current.srcObject = stream;

        for (let id in connections) {
            if (id === socketIdRef.current) continue

            connections[id].addStream(window.localStream)

            connections[id].createOffer().then((description) => {
                connections[id].setLocalDescription(description)
                    .then(() => {
                        socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
                    })
                    .catch(e => console.log(e))
            })
        }

        stream.getTracks().forEach(track => track.onended = () => {
            setVideo(false);
            setAudio(false);

            try {
                let tracks = localVideoref.current.srcObject.getTracks()
                tracks.forEach(track => track.stop())
            } catch (e) { console.log(e) }

            let blackSilence = (...args) => new MediaStream([black(...args), silence()])
            window.localStream = blackSilence()
            if (localVideoref.current) localVideoref.current.srcObject = window.localStream;
            if (miniLocalVideoRef.current) miniLocalVideoRef.current.srcObject = window.localStream;

            for (let id in connections) {
                connections[id].addStream(window.localStream)

                connections[id].createOffer().then((description) => {
                    connections[id].setLocalDescription(description)
                        .then(() => {
                            socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
                        })
                        .catch(e => console.log(e))
                })
            }
        })
    }

    let getUserMedia = () => {
        if (window.localStream) {
            let videoTrack = window.localStream.getVideoTracks()[0];
            if (videoTrack) videoTrack.enabled = video;
            let audioTrack = window.localStream.getAudioTracks()[0];
            if (audioTrack) audioTrack.enabled = audio;
            return;
        }
        if ((video && videoAvailable) || (audio && audioAvailable)) {
            navigator.mediaDevices.getUserMedia({ video: video, audio: audio })
                .then(getUserMediaSuccess)
                .catch((e) => console.log(e))
        } else {
            try {
                let tracks = localVideoref.current.srcObject.getTracks()
                tracks.forEach(track => track.stop())
            } catch (e) { }
        }
    }

    let getDislayMediaSuccess = (stream) => {
        try {
            window.localStream.getTracks().forEach(track => track.stop())
        } catch (e) { console.log(e) }

        window.localStream = stream
        if (localVideoref.current) localVideoref.current.srcObject = stream

        for (let id in connections) {
            if (id === socketIdRef.current) continue

            connections[id].addStream(window.localStream)

            connections[id].createOffer().then((description) => {
                connections[id].setLocalDescription(description)
                    .then(() => {
                        socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
                    })
                    .catch(e => console.log(e))
            })
        }

        stream.getTracks().forEach(track => track.onended = () => {
            setScreen(false)

            try {
                let tracks = localVideoref.current.srcObject.getTracks()
                tracks.forEach(track => track.stop())
            } catch (e) { console.log(e) }

            let blackSilence = (...args) => new MediaStream([black(...args), silence()])
            window.localStream = blackSilence()
            if (localVideoref.current) localVideoref.current.srcObject = window.localStream

            getUserMedia()
        })
    }

    let gotMessageFromServer = (fromId, message) => {
        var signal = JSON.parse(message)

        if (fromId !== socketIdRef.current) {
            if (signal.sdp) {
                connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
                    if (signal.sdp.type === 'offer') {
                        connections[fromId].createAnswer().then((description) => {
                            connections[fromId].setLocalDescription(description).then(() => {
                                socketRef.current.emit('signal', fromId, JSON.stringify({ 'sdp': connections[fromId].localDescription }))
                            }).catch(e => console.log(e))
                        }).catch(e => console.log(e))
                    }
                }).catch(e => console.log(e))
            }

            if (signal.ice) {
                connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e))
            }
        }
    }

    let connectToSocketServer = () => {
        socketRef.current = io.connect(server_url, { secure: false })

        socketRef.current.on('signal', gotMessageFromServer)

        socketRef.current.on('connect', () => {
            socketRef.current.emit('join-call', window.location.href, username)
            socketIdRef.current = socketRef.current.id

            socketRef.current.on('chat-message', addMessage)

            socketRef.current.on('video-status-changed', (senderId, isVideoEnabled) => {
                setVideos(prevVideos => 
                    prevVideos.map(vid => 
                        vid.socketId === senderId ? { ...vid, videoEnabled: isVideoEnabled } : vid
                    )
                );
            });

            socketRef.current.on('user-left', (id) => {
                setVideos((videos) => videos.filter((video) => video.socketId !== id))
            })

            socketRef.current.on('user-joined', (id, clients, roomUserNamesMap) => {
                if (roomUserNamesMap) {
                    roomNamesRef.current = roomUserNamesMap;
                }

                clients.forEach((socketListId) => {
                    if (socketListId === socketIdRef.current) return;

                    if (!connections[socketListId]) {
                        connections[socketListId] = new RTCPeerConnection(peerConfigConnections)
                        
                        connections[socketListId].onicecandidate = function (event) {
                            if (event.candidate != null) {
                                socketRef.current.emit('signal', socketListId, JSON.stringify({ 'ice': event.candidate }))
                            }
                        }

                        connections[socketListId].onaddstream = (event) => {
                            const videoTrack = event.stream.getVideoTracks()[0];
                            let initialVideoState = true;
                            if (videoTrack) {
                                initialVideoState = videoTrack.enabled;
                            }

                            let videoExists = videoRef.current.find(video => video.socketId === socketListId);
                            let assignedName = (roomUserNamesMap && roomUserNamesMap[socketListId]) || "Participant";

                            if (videoExists) {
                                setVideos(videos => {
                                    const updatedVideos = videos.map(video =>
                                        video.socketId === socketListId ? { ...video, stream: event.stream, name: assignedName } : video
                                    );
                                    videoRef.current = updatedVideos;
                                    return updatedVideos;
                                });
                            } else {
                                let newVideo = {
                                    socketId: socketListId,
                                    stream: event.stream,
                                    name: assignedName,
                                    autoplay: true,
                                    playsinline: true,
                                    videoEnabled: initialVideoState
                                };

                                setVideos(videos => {
                                    const updatedVideos = [...videos, newVideo];
                                    videoRef.current = updatedVideos;
                                    return updatedVideos;
                                });
                            }
                        };

                        if (window.localStream !== undefined && window.localStream !== null) {
                            connections[socketListId].addStream(window.localStream)
                        } else {
                            let blackSilence = (...args) => new MediaStream([black(...args), silence()])
                            window.localStream = blackSilence()
                            connections[socketListId].addStream(window.localStream)
                        }
                    }
                })

                if (id === socketIdRef.current) {
                    for (let id2 in connections) {
                        if (id2 === socketIdRef.current) continue

                        try {
                            connections[id2].addStream(window.localStream)
                        } catch (e) { }

                        connections[id2].createOffer().then((description) => {
                            connections[id2].setLocalDescription(description)
                                .then(() => {
                                    socketRef.current.emit('signal', id2, JSON.stringify({ 'sdp': connections[id2].localDescription }))
                                })
                                .catch(e => console.log(e))
                        })
                    }
                }
            })
        })
    }

    let silence = () => {
        let ctx = new AudioContext()
        let oscillator = ctx.createOscillator()
        let dst = oscillator.connect(ctx.createMediaStreamDestination())
        oscillator.start()
        ctx.resume()
        return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false })
    }
    let black = ({ width = 640, height = 480 } = {}) => {
        let canvas = Object.assign(document.createElement("canvas"), { width, height })
        canvas.getContext('2d').fillRect(0, 0, width, height)
        let stream = canvas.captureStream()
        return Object.assign(stream.getVideoTracks()[0], { enabled: false })
    }

    let handleVideo = () => {
        if (window.localStream) {
            let videoTrack = window.localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setVideo(videoTrack.enabled);
                
                if (socketRef.current) {
                    socketRef.current.emit('video-toggle', videoTrack.enabled);
                }
            }
        }
    }
    let handleAudio = () => {
        if (window.localStream) {
            let audioTrack = window.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setAudio(audioTrack.enabled);
            }
        }
    }

    useEffect(() => {
        if (screen !== undefined) {
            getDislayMedia();
        }
    }, [screen])

    let handleScreen = () => {
        setScreen(!screen);
    }

    let handleEndCall = () => {
        try {
            let tracks = localVideoref.current.srcObject.getTracks()
            tracks.forEach(track => track.stop())
        } catch (e) { }
        window.location.href = "/"
    }

    const addMessage = (data, sender, socketIdSender) => {
        setMessages((prevMessages) => [
            ...prevMessages,
            { sender: sender, data: data }
        ]);
        if (socketIdSender !== socketIdRef.current) {
            setNewMessages((prevNewMessages) => prevNewMessages + 1);
        }
    };

    let sendMessage = () => {
        const currentMsg = messageInputRef.current ? messageInputRef.current.value : "";
        if (!currentMsg || currentMsg.trim() === "") return; 
        socketRef.current.emit('chat-message', currentMsg, username)
        if (messageInputRef.current) messageInputRef.current.value = "";
    }

    let connect = () => {
        setAskForUsername(false);
        getMedia();
    }

    return (
        <Box sx={{ width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#000814' }}>
            {askForUsername === true ?
                <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2, color: 'white' }}>
                    <Typography variant="h4">Enter into Lobby </Typography>
                    <TextField id="outlined-basic" label="Username" value={username} onChange={e => setUsername(e.target.value)} variant="outlined" sx={{ input: { color: 'white' }, label: { color: 'gray' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'white' } } }} />
                    <Button variant="contained" onClick={connect}>Connect</Button>
                    <Box sx={{ mt: 2, width: 320, height: 240, borderRadius: 2, overflow: 'hidden' }}>
                        <video ref={localVideoref} autoPlay muted style={{ width: '100%', height: '100%', objectFit: 'cover' }}></video>
                    </Box>
                </Box> :

                <Box sx={{ display: 'flex', flexDirection: 'row', width: '100vw', height: '100vh', overflow: 'hidden' }}>

                    {/* MAIN LAYOUT ENGINE PANEL */}
                    <Box sx={{ flexGrow: 1, position: 'relative', height: '100%', backgroundColor: '#000814' }}>
                        
                        <Box sx={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }}>
                            {!isRemoteMain ? (
                                <>
                                    {videos.length > 0 && videos[0].videoEnabled !== false ? (
                                        <video
                                            ref={ref => { if (ref && videos[0].stream) ref.srcObject = videos[0].stream; }}
                                            autoPlay
                                            playsInline
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    ) : (
                                        <Box sx={{ width: '100%', height: '100%', backgroundColor: '#121212', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Typography variant="h6" color="white">
                                                {videos.length > 0 ? `${videos[0].name} Camera Off` : "Waiting for other users..."}
                                            </Typography>
                                        </Box>
                                    )}
                                    {videos.length > 0 && (
                                        <audio ref={ref => { if (ref && videos[0].stream) ref.srcObject = videos[0].stream; }} autoPlay />
                                    )}
                                    <Typography sx={nameOverlayStyle}>{videos.length > 0 ? videos[0].name : "Participant"}</Typography>
                                </>
                            ) : (
                                <>
                                    {video ? (
                                        <video ref={localVideoref} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <Box sx={{ width: '100%', height: '100%', backgroundColor: '#121212', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Typography variant="h6" color="white">Camera Off</Typography>
                                        </Box>
                                    )}
                                    <Typography sx={nameOverlayStyle}>{username || "You"} (You)</Typography>
                                </>
                            )}
                        </Box>

                        {/* COMPACT FLOATING CORNER PIP EMBED FRAME */}
                        {videos.length > 0 && (
                            <Paper 
                                elevation={8} 
                                onClick={() => setIsRemoteMain(!isRemoteMain)} 
                                sx={{ position: 'absolute', top: 20, left: 20, width: '160px', height: '220px', borderRadius: 3, overflow: 'hidden', zIndex: 5, cursor: 'pointer', border: '2px solid rgba(255,255,255,0.3)' }}
                            >
                                {!isRemoteMain ? (
                                    <>
                                        {video ? (
                                            <video ref={miniLocalVideoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <Box sx={{ width: '100%', height: '100%', backgroundColor: '#121212', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Typography variant="caption" color="white">Camera Off</Typography>
                                            </Box>
                                        )}
                                        <Typography sx={{ ...nameOverlayStyle, bottom: 5, left: 5, fontSize: '11px' }}>{username || "You"} (You)</Typography>
                                    </>
                                ) : (
                                    <>
                                        {videos[0].videoEnabled !== false ? (
                                            <video
                                                ref={ref => { if (ref && videos[0].stream) ref.srcObject = videos[0].stream; }}
                                                autoPlay
                                                playsInline
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        ) : (
                                            <Box sx={{ width: '100%', height: '100%', backgroundColor: '#121212', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Typography variant="caption" color="white">Camera Off</Typography>
                                            </Box>
                                        )}
                                        <audio ref={ref => { if (ref && videos[0].stream) ref.srcObject = videos[0].stream; }} autoPlay />
                                        <Typography sx={{ ...nameOverlayStyle, bottom: 5, left: 5, fontSize: '11px' }}>{videos[0].name}</Typography>
                                    </>
                                )}
                            </Paper>
                        )}

                        {/* CONTROL ACTION DOCK CONTROLLERS SYSTEM BAR */}
                        <Box sx={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 2, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.6)', p: '10px 25px', borderRadius: 4 }}>
                            <IconButton onClick={handleVideo} style={{ color: "white" }} size="large">
                                {video ? <VideocamIcon sx={{ fontSize: 28 }} /> : <VideocamOffIcon sx={{ fontSize: 28, color: 'red' }} />}
                            </IconButton>
                            <IconButton onClick={handleEndCall} style={{ color: "red" }} size="large">
                                <CallEndIcon sx={{ fontSize: 28 }} />
                            </IconButton>
                            <IconButton onClick={handleAudio} style={{ color: "white" }} size="large">
                                {audio ? <MicIcon sx={{ fontSize: 28 }} /> : <MicOffIcon sx={{ fontSize: 28, color: 'red' }} />}
                            </IconButton>

                            {screenAvailable === true ?
                                <IconButton onClick={handleScreen} style={{ color: "white" }} size="large">
                                    {screen === true ? <ScreenShareIcon sx={{ fontSize: 28, color: '#4caf50' }} /> : <StopScreenShareIcon sx={{ fontSize: 28 }} />}
                                </IconButton> : <></>}

                            <Badge badgeContent={newMessages} max={999} color='orange'>
                                <IconButton onClick={() => { setModal(!showModal); setNewMessages(0); }} style={{ color: "white" }} size="large">
                                    <ChatIcon sx={{ fontSize: 28 }} />
                                </IconButton>
                            </Badge>
                        </Box>
                    </Box>

                    {/* RIGHT SIDE CHAT PANEL WITH WHATSAPP MESSAGING LAYOUT */}
                    {showModal && (
                        <Box sx={{ width: 350, minWidth: 350, height: '100%', backgroundColor: '#efeae2', display: 'flex', flexDirection: 'column', borderLeft: '1px solid #ddd', zIndex: 12 }}>
                            <Box sx={{ p: 2, backgroundColor: '#075e54', color: 'white' }}>
                                <Typography variant="h6" fontWeight="bold">Chat Room</Typography>
                            </Box>
                            
                            <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {messages.length !== 0 ? messages.map((item, index) => {
                                    const isMe = item.sender === username;
                                    return (
                                        <Box key={index} sx={{
                                            alignSelf: isMe ? 'flex-end' : 'flex-start',
                                            background: isMe ? '#dcf8c6' : '#ffffff',
                                            padding: '8px 12px',
                                            borderRadius: isMe ? '10px 10px 0px 10px' : '10px 10px 10px 0px',
                                            maxWidth: '75%',
                                            boxShadow: '0px 1px 2px rgba(0,0,0,0.15)'
                                        }}>
                                            {!isMe && <Typography sx={{ fontWeight: "bold", fontSize: '12px', color: '#075e54', mb: '4px' }}>{item.sender}</Typography>}
                                            <Typography sx={{ fontSize: '14px', color: '#303030', wordBreak: 'break-word' }}>{item.data}</Typography>
                                        </Box>
                                    );
                                }) : <Typography sx={{ color: '#666666', textAlign: 'center', mt: 4, width: '100%' }}>No Messages Yet</Typography>}
                            </Box>
                            
                            <Box sx={{ p: 1.5, background: '#f0f0f0', display: 'flex', gap: 1, borderTop: '1px solid #ddd', alignItems: 'center' }}>
                                <Box sx={{ flexGrow: 1, backgroundColor: '#ffffff', borderRadius: '5px', px: 1 }}>
                                    {/* FIXED BLINK IN CHAT: input ref attached directly to intercept change state re-renders */}
                                    <input 
                                        ref={messageInputRef}
                                        onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
                                        placeholder="Type a message" 
                                        style={{ width: '100%', border: 'none', outline: 'none', height: '40px', fontSize: '15px' }}
                                    />
                                </Box>
                                <Button variant='contained' onClick={sendMessage} sx={{ backgroundColor: '#075e54', height: '40px', '&:hover': { backgroundColor: '#054d3b' } }}>Send</Button>
                            </Box>
                        </Box>
                    )}

                </Box>
            }
        </Box>
    )
}