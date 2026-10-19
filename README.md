# 🎥 LiveLink — Production-Ready WebRTC Video Conferencing

LiveLink is a secure, reliable, modern real-time video conferencing web application built with the **MERN Stack**, **WebRTC Peer-to-Peer Mesh**, and **Socket.IO**. Designed for high call reliability, crisp audio/video streaming, and a smooth, accessible user experience.

---

## 📌 Architecture & Technology Stack

- **Frontend**: React 19, Material-UI 7/9, Socket.IO Client, Web Audio API, Web Speech API
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
                                     │ (Up to 6 Peers)  │
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
- **Mesh Capacity Protection**: Enforces an honest 6-participant limit per room to ensure low latency and high quality in peer-to-peer topologies. Emits a friendly `room-full` modal.

### 🎙️ 2. Call Reliability & Media Experience
- **Hardware Device Switching**: Live camera, microphone, and speaker selection in pre-call lobby and in-call settings with real-time `devicechange` hardware detection.
- **Network Quality Monitor**: In-call RTT latency and packet loss tracking via `RTCPeerConnection.getStats()`, displaying a live `Good` / `Weak` / `Poor` badge.
- **Active Speaker Highlight**: Real-time audio frequency analysis highlights the active speaker's video tile with an animated glowing green border.
- **Smart Mute Hint**: Web Audio analysis alerts participants with an "Unmute (M)" toast if they speak while their microphone is muted.
- **Hardware Audio Constraints**: Enabled `echoCancellation`, `noiseSuppression`, and `autoGainControl` across all media streams.
- **45-Second Auto-Reconnection**: Reconnecting floating banner with automatic ICE restart and auto-rejoin. Displays a clear recovery dialog if reconnection cannot be restored after 45 seconds.
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
- **Modern Landing & Auth**: "How it works" timeline, interactive FAQ accordion, password strength meter, and inline validation.

### 🚀 5. Collaboration & Product Features
- **In-Call Chat & Image Sharing**: Chat with auto-link detection, live typing indicator ("Alice is typing..."), and image attachment sharing up to 2MB (with clipboard paste support).
- **Live Captions**: Web Speech API speech-to-text broadcasted in real time to all call participants as subtitles.
- **Local Recording**: Record audio/video locally in WebM format directly to user's device with prominent `REC` banner broadcasted to all participants.
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

# TURN Server Credentials (Optional, for symmetric NAT traversal)
TURN_URL=turn:your-turn-server.com:3478
TURN_USER=your-turn-username
TURN_PASS=your-turn-password
```

### Frontend (`frontend/.env`)

```env
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

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

## ⚠️ Known Limitations & Technical Realities

1. **P2P Mesh Topology**: LiveLink uses a pure WebRTC peer-to-peer mesh. Because each participant uploads their stream to every other peer ($N \times (N-1)$ streams), room capacity is intentionally capped at **6 participants** to protect CPU and bandwidth. For rooms larger than 6, an SFU (Selective Forwarding Unit like mediasoup or LiveKit) would be required.
2. **Local Recording**: Meetings are recorded in WebM format directly in the user's browser via the `MediaStream Recording API` and downloaded to their machine. Server-side cloud compositing requires an external rendering pipeline.
3. **Speech Recognition**: The Live Captions feature utilizes the browser's `SpeechRecognition` API, which works natively in Chromium-based browsers (Chrome, Edge, Brave).
4. **TURN Server**: In corporate firewalls or strict symmetric NAT networks, WebRTC peer connections require a configured TURN relay server (`TURN_URL`). Google STUN is provided by default for standard networks.

---

## 📄 License
This project is licensed under the **MIT License**.