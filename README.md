# 🎥 LiveLink — Production-Ready WebRTC Video Conferencing

LiveLink is a secure, reliable, modern real-time video conferencing web application built with the **MERN Stack**, **WebRTC Peer-to-Peer Mesh**, and **Socket.IO**. Designed for high call reliability, crisp audio/video streaming, and a smooth, accessible user experience.

---

## 📌 Architecture & Technology Stack

- **Frontend**: React 19, Material-UI, Socket.IO Client, Web Audio API, Web Speech API
- **Backend**: Node.js, Express, Socket.IO, Pino (structured JSON logging), Helmet, Express Rate Limit, Zod validation
- **Database**: MongoDB Atlas via Mongoose
- **Signaling & Media**: WebRTC P2P Mesh with Google STUN + dynamic TURN fallback, Socket.IO real-time signaling

```text
                               ┌────────────────────────────────┐
                               │   Socket.IO Signaling Server   │
                               │  - JWT & Room Code Validation  │
                               │  - Host Control Authorization   │
                               │  - Chat, Typing, Reactions     │
                               └───────────────┬────────────────┘
                                               │
                         Signaling (SDP/ICE)   │   Signaling (SDP/ICE)
                         ┌─────────────────────┴─────────────────────┐
                         ▼                                           ▼
               ┌──────────────────┐    P2P WebRTC Mesh     ┌──────────────────┐
               │  Peer Client A   │◄──────────────────────►│  Peer Client B   │
               │  (Audio/Video)   │   Encrypted P2P Media  │  (Audio/Video)   │
               └─────────┬────────┘                        └─────────┬────────┘
                         │                                           │
                         └─────────────────┐       ┌─────────────────┘
                                           ▼       ▼
                                     ┌──────────────────┐
                                     │  Peer Client C   │
                                     │ (Up to 4 Peers)  │
                                     └──────────────────┘
```

---

## ✨ Key Features & Capabilities

### 🔐 1. Security & Backend Hardening
- **Verified Google Authentication**: Authenticates securely using Google ID tokens (`google-auth-library`), verifying `audience` and `email_verified` directly on the server without trusting client claims.
- **HTTP-Only Cookies & Refresh Token Rotation**: Access tokens (7 days) and Refresh tokens (30 days) stored in secure, `httpOnly`, `sameSite` cookies with MongoDB revocation (`tokenVersion`).
- **Input Sanitization & Protocol Validation**: Chat messages and display names rendered as plain text. Custom avatar URLs strictly validated to enforce `https://`.
- **API Hardening**: Protected by `helmet`, strict `express-rate-limit` on auth endpoints, CORS origin restriction, and request validation powered by `zod`.
- **Secure Room Codes**: Human-readable, unguessable room codes formatted as `xxxx-xxxx-xxxx` using custom alphabet nanoIDs.
- **Mesh Capacity Protection**: Enforces an honest 4-participant limit per room (`MAX_ROOM_PARTICIPANTS=4`) to ensure low latency and high quality in peer-to-peer topologies. Emits a friendly `room-full` modal.

### 🎙️ 2. WebRTC Connection Stability & Adaptive Quality
- **WebRTC "Perfect Negotiation" Pattern**: Eliminates offer/answer glare and collision race conditions using deterministic polite/impolite peer roles, `makingOffer`, `ignoreOffer`, and automatic rollback.
- **Queued ICE Candidate Buffering**: ICE candidates arriving before `remoteDescription` is set are safely queued in memory and flushed once SDP negotiation resolves.
- **45-Second Reconnection Watchdog**: On connection state `disconnected`, waits 5 seconds before triggering `restartIce()`; on `failed`, tears down and recreates the peer connection with an automatic 45-second timeout.
- **Adaptive Bitrate & Resolution Scaling**:
  - **1-on-1**: 720p @ 30fps (1.5 Mbps)
  - **3 Participants**: 480p @ 30fps (800 kbps)
  - **4 Participants**: 360p @ 24fps (450 kbps)
  - **Mobile**: 360p @ 24fps (400 kbps)
  - **Active Speaker & Screen Share Priority**: Prioritized with full resolution and elevated bitrate limits.
  - **Audio Priority**: Audio is never dropped or degraded when network quality drops.
  - **Tab Visibility Optimization**: Automatically pauses video sends when the tab is hidden to conserve bandwidth and CPU.
- **Hardware Device Switching**: Live camera, microphone, and speaker selection in pre-call lobby and in-call settings with real-time `devicechange` hardware detection.
- **Network Quality Monitor**: In-call RTT latency and packet loss tracking via `RTCPeerConnection.getStats()`, displaying a live `Good` / `Weak` / `Poor` badge.
- **Active Speaker Highlight**: Real-time audio frequency analysis highlights the active speaker's video tile with an animated glowing green border.
- **Smart Mute Hint**: Web Audio analysis alerts participants with an "Unmute (M)" toast if they speak while their microphone is muted.
- **Hardware Audio Constraints**: Enabled `echoCancellation`, `noiseSuppression`, and `autoGainControl` across all media streams.
- **Graceful Media Fallback**: If permissions are denied, users can "Join without camera/mic" using black video and silence streams rather than getting blocked.
- **Duplicate Tab Prevention**: Uses the `BroadcastChannel` API to detect if the same room is active across multiple browser tabs, preventing feedback loops.

### 👑 3. Host Controls & Stage Management
- **Deterministic Host Assignment**: The first user to join is the room host. If the host leaves, host status is automatically passed to the next oldest connected participant.
- **Host Privileges (Validated on Server)**:
  - Mute individual participants or "Mute All".
  - Remove/kick participants with a clean disconnect and exit screen.
  - Lock/Unlock room with an integrated **Waiting Room**.
  - Admit or Deny users from the waiting room queue.
  - **Spotlight for Everyone**: Host can spotlight any participant for the whole meeting.
- **Grid vs. Speaker View**: Switch between an equal-grid view and a focused Speaker view. Screen sharing automatically switches all attendees into Speaker view.
- **Picture-in-Picture (PiP)**: Keep meetings visible while multitasking across other desktop apps.

### 🎨 4. Design System & Theme
- **Central MUI Theme**: Built with **Plus Jakarta Sans** for headings, **Inter** for body text, rounded card geometry (16-20px), and `#2563eb` primary branding.
- **Light & Dark Mode**: Persistent toggle synced with user preferences in MongoDB and cached in `localStorage`.
- **Accessibility**: High contrast (>= 4.5:1), visible keyboard focus rings, `prefers-reduced-motion` compliance, and slashed icons for muted states.
- **Modular Frontend Architecture**: Refactored monolithic component into cleanly isolated hooks (`useMedia`, `usePeers`, `useSignaling`, `useStats`) and components (`Lobby`, `Stage`, `ControlDock`, `Drawers`), with no file exceeding 300 lines.

### 🚀 5. Collaboration & Product Features
- **In-Call Chat & Image Sharing**: Chat with auto-link detection, live typing indicator ("Alice is typing..."), and image attachment sharing up to 2MB (with clipboard paste support).
- **Live Captions**: Web Speech API speech-to-text broadcasted in real time to all call participants as subtitles (labeled "Beta, Chrome only").
- **Local Recording**: Host-only recording mixing all participants' audio via `AudioContext` to local WebM format directly on user's device, with prominent `REC (Saved on device)` banner.
- **Scheduled Meetings**: Schedule future calls with generated room codes, list them on the dashboard, and export directly to Google Calendar.
- **Account Controls**: Profile editing, email verification, password reset, "Logout from all devices", and self-service account deletion.
- **Post-Call Feedback**: 1 to 5 star rating modal with comments stored in the database.
- **Observability**: Structured JSON request logging in backend using `pino` and React `ErrorBoundary` on the frontend.

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|:---:|:---|
| <kbd>M</kbd> | Toggle Microphone (Mute / Unmute) |
| <kbd>V</kbd> | Toggle Camera (Video On / Off) |
| <kbd>H</kbd> | Raise or Lower Hand |
| <kbd>C</kbd> | Open or Close Chat & People Panel |
| <kbd>Esc</kbd> | Close Open Dialogs, Menus, or Modals |

---

## ⚙️ Environment Variables Setup

### Backend (`backend/.env`)

```env
PORT=8000
NODE_ENV=development
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/livelinkdb
JWT_SECRET=your_jwt_secret_key_here
CLIENT_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# Room Mesh Capacity (Default: 4 participants)
MAX_ROOM_PARTICIPANTS=4

# TURN Relay Configuration (Optional, for symmetric NAT/firewall traversal)
TURN_URL=turn:your-turn-server.com:3478
TURN_USER=your-turn-username
TURN_PASS=your-turn-password

# Ephemeral Short-Lived TURN Credentials (RFC 5766 REST API)
TURN_SECRET=your_turn_hmac_secret
TURN_TTL_SECONDS=86400
```

### Frontend (`frontend/.env`)

```env
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

---

## 🔒 HTTPS & Secure Context Requirements

WebRTC APIs (`navigator.mediaDevices.getUserMedia`, `navigator.mediaDevices.getDisplayMedia`, `RTCPeerConnection`) strictly require a **Secure Context** (`https://` or `http://localhost`).

- **Localhost Development**: When running locally on `http://localhost:3000`, modern browsers treat this as a secure context and permit camera/mic access.
- **Local Network Testing (LAN / IP Address)**: If you access LiveLink from another machine or phone via LAN IP (e.g. `http://192.168.1.100:3000`), Chromium and Safari **will block** camera/microphone access due to lack of HTTPS.
  - To test across devices on your LAN without a public domain, you can:
    1. Use a tunneling tool like `ngrok` or `localtunnel` with HTTPS: `ngrok http 3000`.
    2. Or enable Chrome's flag: `chrome://flags/#unsafely-treat-insecure-origin-as-secure` and add your LAN IP.
- **Production Deployment**: Deploy behind an SSL-terminating reverse proxy (Nginx, Caddy, Cloudflare, Vercel, or Render) with valid HTTPS certificates.

---

## 🏃 Local Development Quickstart

### 1. Prerequisites
- **Node.js** v18+ & **npm**
- **MongoDB** Atlas cluster or local MongoDB instance

### 2. Backend Setup
```bash
cd backend
npm install
npm start
```
*Backend runs on `http://localhost:8000`.*

### 3. Frontend Setup
```bash
cd frontend
npm install
npm start
```
*Frontend runs on `http://localhost:3000`.*

---

## 🧪 Comprehensive Testing Checklist

- [ ] **2 Devices on Different Networks**: Join with one device on Wi-Fi and another on 4G/5G mobile data. Verify P2P media connects smoothly using Google STUN (or configured TURN).
- [ ] **4-Tab Load Test**: Open 4 browser tabs in the same room. Verify all 4 peer tiles render, audio flows, and adaptive bitrate scales down to 360p without lag.
- [ ] **5th Participant Rejection**: Attempt to join a 5th participant in a full room; verify the server emits `room-full` and displays the capacity reached dialog.
- [ ] **Network Throttling (Slow 3G)**: In DevTools Network tab, throttle connection to "Slow 3G". Verify the network badge changes to "Poor", the "Reconnecting..." banner appears, and audio is prioritized over video.
- [ ] **Permission-Blocked Flow**: Block camera and microphone in browser site settings. Reload and verify the lobby renders the friendly banner with "Join without camera/mic" option, and allows entry without crashing.
- [ ] **Device Switching**: Plug in or select a different camera/microphone while in the lobby and in-call. Verify `replaceTrack` switches feeds smoothly without call interruption.
- [ ] **Mobile Responsive Dock**: Emulate mobile viewport (<600px). Verify the control dock becomes a fixed bottom bar with >=44px touch targets, and ancillary actions tuck into the "More" menu.
- [ ] **Host Controls & Waiting Room**: Lock the room as host, have a 2nd user join, verify they wait in the waiting room, and verify the host can Admit or Deny them.
- [ ] **Local Recording**: Start recording as host; verify all participants see the red `REC (Saved on device)` banner, and stopping downloads the `.webm` file locally.
- [ ] **Browser Compatibility**: Test on iPhone Safari, Android Chrome, and Firefox/Edge to verify consistent layout and WebRTC negotiation.
- [ ] **Lighthouse 90+ Audit**: Audit dashboard and meeting lobby using Chrome DevTools Lighthouse to verify >= 90 scores on Accessibility, Performance, and Best Practices.

---

## ⚠️ Known Limitations & Technical Realities

1. **P2P Mesh Topology Scaling**: LiveLink uses a pure client-side WebRTC mesh. Because each participant uploads their stream to every other peer ($N \times (N-1)$ streams), room capacity is intentionally capped at **4 participants** (`MAX_ROOM_PARTICIPANTS=4`) to protect client CPU and bandwidth. For larger rooms (>4 participants), an SFU (Selective Forwarding Unit like Mediasoup, LiveKit, or Janus) is required.
2. **Local Recording**: Meetings are recorded in WebM format directly in the host's browser via the `MediaStream Recording API` with mixed audio via `AudioContext` and downloaded to their machine. Cloud recording would require a server-side rendering pipeline.
3. **Speech Recognition**: The Live Captions feature utilizes the browser's `SpeechRecognition` API, which works natively in Chromium-based browsers (Chrome, Edge, Brave). Safari and Firefox do not currently support speech-to-text without external cloud speech APIs.
4. **TURN Relay Server**: In corporate firewalls or strict symmetric NAT networks, WebRTC peer connections require a configured TURN relay server (`TURN_URL`). Google STUN is provided by default for standard networks.

---

## 📄 License
This project is licensed under the **MIT License**.
