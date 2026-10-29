# 🎥 LiveLink — Peer-to-Peer WebRTC Video Conferencing

LiveLink is a secure, reliable, real-time video conferencing web application built with the **MERN Stack**, **WebRTC Peer-to-Peer Mesh**, and **Socket.IO**. Designed for high call reliability, crisp audio/video streaming, and a smooth, accessible user experience.

- **Encrypted peer-to-peer (DTLS-SRTP)**: Media streams flow directly between participants over WebRTC encrypted with DTLS-SRTP.
- **Server only handles signaling**: The Node.js/Socket.IO backend coordinates SDP offer/answer exchanges, ICE candidates, chat, and room state; it never processes, records, or stores raw media streams.

---

## 📌 Architecture & Technology Stack

- **Frontend**: React 19, Material-UI, Socket.IO Client, Web Audio API, Web Speech API
- **Backend**: Node.js, Express, Socket.IO, Pino (structured JSON logging), Helmet, Express Rate Limit, Zod validation
- **Database**: MongoDB Atlas via Mongoose
- **Signaling & Media**: WebRTC P2P Mesh with Google STUN + dynamic rate-limited TURN fallback, Socket.IO real-time signaling

```text
                               ┌────────────────────────────────┐
                               │   Socket.IO Signaling Server   │
                               │  - JWT & Room Code Validation  │
                               │  - Host Control Authorization   │
                               │  - Chat, Typing, Reactions     │
                               │  - Ephemeral TURN Credentials  │
                               └───────────────┬────────────────┘
                                               │
                         Signaling (SDP/ICE)   │   Signaling (SDP/ICE)
                         ┌─────────────────────┴─────────────────────┐
                         ▼                                           ▼
               ┌──────────────────┐    P2P WebRTC Mesh     ┌──────────────────┐
               │  Peer Client A   │◄──────────────────────►│  Peer Client B   │
               │  (Audio/Video)   │   Encrypted P2P Media  │  (Audio/Video)   │
               │                  │       (DTLS-SRTP)      │                  │
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
- **API Hardening**: Protected by `helmet`, strict `express-rate-limit` on auth endpoints, CORS origin restriction (fixed allowlist from `CLIENT_URLS`), and request validation powered by `zod`.
- **Secure Unified Room Codes**: Human-readable, unguessable room codes formatted as `xxxx-xxxx-xxxx` (standard) and `p-xxxx-xxxx-xxxx` (private 1-on-1) using custom alphabet nanoIDs (`23456789abcdefghjkmnpqrstuvwxyz`). Validated on join.
- **Atomic Private 1-on-1 Auto-Lock**: When the 2nd user enters a private room, the capacity check and auto-lock occur synchronously on the server so no 3rd user can enter. Both users can Leave, or End call for both.
- **Mesh Capacity Protection**: Enforces an honest 4-participant limit per room (`MAX_ROOM_PARTICIPANTS=4`) to ensure low latency and high quality in peer-to-peer topologies.

### 🎙️ 2. WebRTC Connection Stability & Adaptive Quality
- **WebRTC "Perfect Negotiation" Pattern**: Eliminates offer/answer glare and collision race conditions using deterministic polite/impolite peer roles, `makingOffer`, `ignoreOffer`, and automatic rollback.
- **Queued ICE Candidate Buffering**: ICE candidates arriving before `remoteDescription` is set are safely queued in memory and flushed once SDP negotiation resolves.
- **45-Second Reconnection Watchdog**: On connection state `disconnected`, waits 5 seconds before triggering `restartIce()`; on `failed`, tears down and recreates the peer connection with an automatic 45-second timeout.
- **Table-Based Adaptive Bitrate Scaling**:
  - **2 Peers**: 720p @ 30fps (1.5 Mbps, scale 1.0)
  - **3 Peers**: 480p @ 30fps (800 kbps, scale 1.5)
  - **4 Peers**: 360p @ 24fps (450 kbps, scale 2.0)
  - **Weak Network**: Half table bitrate (min 250 kbps floor, max 24 fps)
  - **Poor Network**: 250 kbps floor, 15 fps, scaleResolutionDownBy 2.0
  - **Audio Priority**: Audio is assigned high network priority (`networkPriority: 'high'`) and protected from downscaling.
  - **Tab Visibility Optimization**: Automatically pauses video sends when the tab is hidden to conserve bandwidth and CPU.
- **Platform Codec Preferences**: Uses `transceiver.setCodecPreferences` to prefer H.264 first on mobile, VP8 first on desktop, and VP9/AV1 last.
- **Screen Share Guardrails**:
  - `track.contentHint = "detail"` for crisp text readability.
  - Degradation preference: `maintain-resolution` for screen sharing sender, `maintain-framerate` for camera sender (feature-detected).
  - Bitrate capped at 1.2 Mbps, 10–15 fps.
  - Single presenter enforced atomically on the server; second presenter attempts are rejected with a friendly message.
- **Hardware Device Switching**: Live camera, microphone, and speaker selection in pre-call lobby and in-call settings with real-time `devicechange` hardware detection.
- **Network Quality Monitor**: In-call RTT latency and packet loss tracking via `RTCPeerConnection.getStats()`, displaying a live `Good` / `Weak` / `Poor` badge.
- **Active Speaker Highlight**: Real-time audio frequency analysis highlights the active speaker's video tile with an animated glowing green border.
- **Smart Mute Hint**: Web Audio analysis alerts participants with an "Unmute (M)" toast if they speak while their microphone is muted.
- **Graceful Media Fallback**: If permissions are denied, users can "Join without camera/mic" using black video and silence streams rather than getting blocked.

### 👑 3. Host Controls & Stage Management
- **Deterministic Host Assignment**: The first user to join is the room host. If the host leaves, host status is automatically passed to the next oldest connected participant.
- **Host Privileges (Validated on Server)**:
  - Mute individual participants or "Mute All".
  - Remove/kick participants with a clean disconnect and exit screen.
  - Lock/Unlock room with an integrated **Waiting Room**.
  - Admit or Deny users from the waiting room queue.
  - **Spotlight for Everyone**: Host can spotlight any participant for the whole meeting.
  - **Toggle Screen Share & Chat Permissions**: Restrict or enable participant screen sharing and chat.
  - **End Call for All / End Call for Both**: Host can terminate meeting for all; in private 1-on-1 calls, either user can end for both.
- **Grid vs. Speaker View**: Switch between an equal-grid view and a focused Speaker view. Screen sharing automatically switches all attendees into Speaker view.
- **Picture-in-Picture (PiP)**: Keep meetings visible while multitasking across other desktop apps.

### 🤖 4. Gemini AI Meeting Summary (Optional, Off by Default)
- **Host-Controlled**: AI summarization is strictly optional and off by default. Must be explicitly toggled on by the room host.
- **Participant Transparency**: A prominent banner is displayed to every participant: *"Transcript will be sent to Google Gemini"*.
- **Backend-Only Execution**: The Google Gemini API is called strictly from the backend via rate-limited `/api/v1/users/ai_summary`. Model configured via `GEMINI_MODEL` (default: `gemini-3.5-flash`).
- **Zero Transcript Storage**: Raw transcripts are processed ephemerally in-memory and are **never** stored in MongoDB or written to server disks.
- **Graceful Rate Limit Handling**: Returns a friendly message on HTTP 429: *"AI rate limit reached. Please try again in a minute."*
- **Live Captions**: Web Speech API speech-to-text broadcasted in real time to call participants as subtitles, labeled **"Beta, Chrome only"**.

---

## ⚡ Free-Tier Limits & Operational Realities

When deploying LiveLink on free-tier infrastructure, be aware of the following platform constraints:

| Service | Free-Tier Limit | Application Behavior & Mitigation |
|:---|:---|:---|
| **Render Web Service** (Signaling Server) | Free instance spins down after 15 minutes of inactivity | **Cold start takes 30–60 seconds**. LiveLink detects waking state, pings `/health`, and displays *"Waking up the server, this can take up to a minute"* with a retry button instead of a blank screen. |
| **Metered TURN Relay** | 50 GB/month free relay bandwidth | **Google STUN handles 80%+ of calls directly P2P**. Ephemeral TURN credentials are only used when peers are behind symmetric NAT/firewalls. Credentials are short-lived (1 hour) and rate-limited via `/api/v1/users/ice_servers`. |
| **Google Gemini API** (AI Summaries) | 15 Requests Per Minute (RPM), 1,500 Requests Per Day (RPD) | Backend enforces in-memory rate limiting (max 1 summary per room every 30s, max 1 per user every 15s). Catches HTTP 429 and displays a friendly toast notification. |
| **P2P Mesh Topology** | Scalability is bounded by upload bandwidth ($N \times (N-1)$ streams) | **Strict 4-participant cap** (`MAX_ROOM_PARTICIPANTS=4`) and 2-participant cap for private rooms (`p-xxxx-xxxx-xxxx`). Guarantees smooth performance without an expensive SFU server. |

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

# Step 6: CORS fixed allowlist (comma-separated origins)
CLIENT_URLS=http://localhost:3000,http://127.0.0.1:3000,https://livelink-svqx.onrender.com
CLIENT_URL=http://localhost:3000

GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
MAX_ROOM_PARTICIPANTS=4

# Step 7: TURN Relay Configuration (Backend only; served via /api/v1/users/ice_servers)
TURN_URL=turn:standard.relay.metered.ca:80
TURN_USER=your-turn-username
TURN_PASS=your-turn-password
TURN_SECRET=your_turn_hmac_secret
TURN_TTL_SECONDS=3600

# Step 9: Gemini AI Summary (Optional)
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.5-flash
```

### Frontend (`frontend/.env`)

```env
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
# Note: TURN credentials and Gemini keys are NEVER exposed in the frontend bundle.
```

---

## 🔒 HTTPS & Secure Context Requirements

WebRTC APIs (`navigator.mediaDevices.getUserMedia`, `navigator.mediaDevices.getDisplayMedia`, `RTCPeerConnection`) strictly require a **Secure Context** (`https://` or `http://localhost`).

- **Localhost Development**: When running locally on `http://localhost:3000`, modern browsers treat this as a secure context and permit camera/mic access.
- **Local Network Testing (LAN / IP Address)**: If you access LiveLink from another machine or phone via LAN IP (e.g. `http://192.168.1.100:3000`), Chromium and Safari **will block** camera/microphone access due to lack of HTTPS.
  - To test across devices on your LAN without a public domain, you can:
    1. Use a tunneling tool like `ngrok` or `localtunnel` with HTTPS: `ngrok http 3000`.
    2. Or enable Chrome's flag: `chrome://flags/#unsafely-treat-insecure-origin-as-secure` and add your LAN IP.
- **Production Deployment**: Deploy behind an SSL-terminating reverse proxy (Render, Vercel, Cloudflare) with valid HTTPS certificates.

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

## 🧪 Comprehensive Manual Test Checklist

- [ ] **1. Two Devices on Different Networks (One on Mobile Data)**:
  - Connect Device 1 on home/office Wi-Fi and Device 2 on 4G/5G mobile data.
  - Join the same room (`xxxx-xxxx-xxxx`).
  - Verify bidirectional audio and video establish within 3 seconds using STUN or TURN relay.
- [ ] **2. 4-Tab Load Test**:
  - Open 4 browser tabs in the same room.
  - Verify all 4 peer tiles render, audio flows, and adaptive bitrate scales down to 360p / 24fps / 450 kbps.
- [ ] **3. Slow 3G Throttling**:
  - In DevTools Network tab, throttle connection to "Slow 3G".
  - Verify quality tier shifts to "Weak" / "Poor", bitrate halves (min 250 kbps floor), and audio remains clear with high priority.
- [ ] **4. Permission-Blocked Flow**:
  - Block camera and microphone permissions in browser site settings.
  - Reload room URL; verify the lobby displays the alert with "Join without camera/mic".
  - Join call and verify attendee enters with black video / silent track without errors.
- [ ] **5. iPhone Safari**:
  - Open room URL in iOS Safari.
  - Verify camera and microphone work, H.264 codec is preferred, and touch controls respond cleanly.
- [ ] **6. Android Chrome**:
  - Open room URL in Android Chrome.
  - Verify camera switching, VP8/H.264 playback, and responsive bottom dock.
- [ ] **7. Firefox / Edge Cross-Browser**:
  - Connect between Firefox and Chromium Edge.
  - Verify perfect negotiation works without offer glare or candidate drops.
- [ ] **8. Screen Share with Text Readability**:
  - Share a code editor or text document.
  - Verify `track.contentHint = "detail"` is set, resolution is prioritized (`maintain-resolution`), framerate is capped at 15 fps, and text remains sharp.
  - Attempt to start screen share from a 2nd user; verify server rejects with message *"Someone is already sharing their screen"*.
- [ ] **9. Two Users Joining Private Room at the Same Time**:
  - Open two tabs simultaneously to `p-xxxx-xxxx-xxxx`.
  - Verify both join and the room auto-locks atomically.
  - Open a 3rd tab to the same private room; verify server rejects immediately with *"room-full"*.
  - Verify either user can click "Leave call" or "End call for both".
- [ ] **10. Cold-Start Waking Screen**:
  - Put backend to sleep or delay socket connection.
  - Verify UI shows *"Waking up the server, this can take up to a minute..."* with retry button and `/health` ping.
- [ ] **11. Gemini AI Summary with Participant Consent Banner**:
  - As host, open People Drawer and toggle on "AI Summary (Google Gemini)".
  - Verify EVERY participant sees banner *"Transcript will be sent to Google Gemini"*.
  - Speak with live captions enabled ("Beta, Chrome only").
  - Click "Generate Gemini Summary"; verify summary modal displays and handles 429 gracefully.
  - Verify transcript is not saved to MongoDB.

---

## ⚠️ Remaining Known Technical Realities

1. **P2P Mesh Topology Scaling**: LiveLink uses a pure client-side WebRTC mesh. Because each participant uploads their stream to every other peer ($N \times (N-1)$ streams), room capacity is intentionally capped at **4 participants** (`MAX_ROOM_PARTICIPANTS=4`) to protect client CPU and bandwidth. For larger rooms (>4 participants), an SFU (Selective Forwarding Unit like Mediasoup, LiveKit, or Janus) is required.
2. **Local Recording**: Meetings are recorded in WebM format directly in the host's browser via the `MediaStream Recording API` with mixed audio via `AudioContext` and downloaded to their machine. Cloud recording would require a server-side media compositor.
3. **Speech Recognition**: The Live Captions feature utilizes the browser's `SpeechRecognition` API, which works natively in Chromium-based browsers (Chrome, Edge, Brave) and is labeled "Beta, Chrome only". Safari and Firefox do not support the Web Speech API without external speech APIs.
4. **TURN Relay Server Quota**: On free-tier Metered TURN (50 GB/month), high-volume TURN relay across strict corporate symmetric NATs will consume bandwidth faster than direct P2P connections.

---

## 📄 License
This project is licensed under the **MIT License**.
