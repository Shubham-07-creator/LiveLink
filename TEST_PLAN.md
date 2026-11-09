# 🧪 LiveLink Complete Layered Test Plan

**Application Overview**: Real-time WebRTC video conferencing web application (React 19, Socket.IO, Node/Express, MongoDB Atlas, WebRTC P2P mesh capped at 4 users, private 1-on-1 calls with `p-` prefix, host controls and waiting room, Metered TURN relay, and optional Gemini summary).

---

## 🎯 Coverage & Quality Goals
- **Backend Business Logic**: >= 80% coverage
- **Overall Codebase**: >= 70% coverage
- **Security-Critical Code**: 100% coverage (authentication, token rotation/revocation, host permission checks, room capacity enforcement, atomic private lock)
- **Zero Paid Services**: 100% free and open-source testing tooling (Vitest, Supertest, mongodb-memory-server, Playwright, axe-core, k6, gitleaks, OWASP ZAP baseline).

---

## 🗺️ Module Risk Matrix & Testing Layer Assignment

| Module / Subsystem | Primary Files | Risk Level | Primary Failure Modes | Assigned Test Layer |
|:---|:---|:---:|:---|:---:|
| **1. Authentication & Tokens** | `backend/src/controllers/user.controller.js`<br>`backend/src/models/user.model.js` | **HIGH** | Token forgery, tokenVersion bypass, expired refresh token reuse, session fixation | Layer 1 (Unit), Layer 2 (Integration), Layer 4 (E2E), Layer 7 (Security) |
| **2. Google Authentication** | `backend/src/controllers/user.controller.js`<br>`backend/src/routes/users.routes.js` | **HIGH** | ID token forgery, wrong audience, unverified email spoofing, account takeover | Layer 2 (Mock Verifier Integration), Layer 10 (Manual Real Popup) |
| **3. Sockets & Signaling** | `backend/src/controllers/socketManager.js`<br>`frontend/src/hooks/useSignaling.js` | **HIGH** | Mesh connectivity failure, cross-room signal leakage, connection drops, ghost participants | Layer 3 (Socket.IO Mock Suite), Layer 5 (Network Chaos), Layer 6 (Load) |
| **4. Rooms & Capacity Logic** | `frontend/src/utils/roomCode.js`<br>`backend/src/controllers/socketManager.js` | **CRITICAL** | Race condition: simultaneous joins admitting a 3rd user to private or 5th to standard room | Layer 1 (Unit), Layer 3 (200x Concurrency Race Test), Layer 4 (E2E) |
| **5. Lobby & Media Setup** | `frontend/src/components/video/Lobby.jsx`<br>`frontend/src/hooks/useMedia.js` | **MEDIUM** | Permission denied crashes, mic meter unresponsiveness, Render cold start hang | Layer 4 (E2E Guest Flow, Permission Denied NotAllowedError path) |
| **6. Call Stage & Video Rendering** | `frontend/src/components/video/Stage.jsx`<br>`frontend/src/components/video/VideoTile.jsx` | **HIGH** | Frozen remote video, video element frames failing to advance (`currentTime`, `videoWidth`) | Layer 4 (E2E 2, 3, 4 Users Video Advancement Assertion) |
| **7. Chat & Sanitization** | `frontend/src/components/video/ChatDrawer.jsx`<br>`backend/src/controllers/socketManager.js` | **HIGH** | XSS script injection, socket flooding, 5MB oversized payload denial of service | Layer 1 (Unit), Layer 3 (Signaling Flooding), Layer 4 (E2E Chat XSS) |
| **8. Screen Share Controls** | `frontend/src/hooks/useMedia.js`<br>`frontend/src/hooks/usePeers.js` | **HIGH** | Multiple presenters clashing, unmirrored text blur, aspect ratio stretching | Layer 1 (Unit), Layer 3 (Single-Presenter Lock), Layer 4 (E2E Fake Canvas Stream) |
| **9. Host Moderation & Waiting Room** | `backend/src/controllers/socketManager.js`<br>`frontend/src/components/video/PeopleDrawer.jsx` | **HIGH** | Privilege escalation (non-host emit), host succession drop, waiting room bypass | Layer 3 (Host Sockets), Layer 4 (E2E Host Lock/Admit/Mute Flow) |
| **10. Meeting History** | `backend/src/controllers/user.controller.js`<br>`frontend/src/pages/history.jsx` | **MEDIUM** | Multi-tenant IDOR leak (User B reading User A activity), local recording download | Layer 2 (Multi-Tenant Supertest), Layer 4 (E2E Page Flow) |
| **11. Profile & Settings** | `frontend/src/pages/profile.jsx`<br>`backend/src/controllers/user.controller.js` | **MEDIUM** | Avatar URL injection (non-https), preferences desynchronization, account deletion | Layer 1 (Unit), Layer 2 (Integration), Layer 4 (E2E) |
| **12. Scheduled Meetings** | `backend/src/controllers/user.controller.js`<br>`frontend/src/pages/home.jsx` | **MEDIUM** | Unauthorized meeting deletion, schedule conflict, date-time parsing bug | Layer 2 (Integration), Layer 4 (E2E Home Modal) |
| **13. Theme & Toast System** | `frontend/src/tokens.js`<br>`frontend/src/theme.js`<br>`frontend/src/components/ui/Toast.jsx` | **HIGH** | Undefined theme token crash (`Cannot read properties of undefined (reading 'shadow')`), WCAG AA | Layer 1 (Regression Unit), Layer 4 (All Pages in Light/Dark/System/Garbage Theme) |
| **14. Gemini AI Summary** | `backend/src/controllers/ai.controller.js`<br>`frontend/src/pages/VideoMeet.jsx` | **MEDIUM** | Missing participant consent banner, unhandled 429 quota exhaustion, transcript storage leak | Layer 2 (Fakes), Layer 4 (E2E), Layer 7 (Prompt Injection) |
| **15. Network Telemetry & TURN** | `frontend/src/utils/adaptiveQuality.js`<br>`backend/src/controllers/user.controller.js` | **HIGH** | Ephemeral HMAC credential failure, secret leak in bundle, relay candidates gathering | Layer 1 (Unit), Layer 2 (Integration), Layer 5 (CDP Network & Relay Chaos) |

---

## 🏗️ 10 Test Layers Execution Architecture

1. **Layer 1: Unit Tests**: Vitest test suite testing pure functions, math, encoders, negotiation rules, schemas, and theme token resolvers.
2. **Layer 2: Backend Integration**: Supertest + in-memory MongoDB tests covering all auth, session, CORS, NoSQL injection, and TURN endpoints.
3. **Layer 3: Signaling & Socket Tests**: Headless Socket.IO clients verifying capacity, atomic lock race conditions (200x repetition), host permissions, and room teardown memory leaks.
4. **Layer 4: End-to-End (E2E)**: Playwright multi-context tests running fake audio/video streams across guest, host, private, and mobile journeys.
5. **Layer 5: Network & Chaos**: CDP network throttling (Slow 3G, packet loss, offline drops), ICE restarts, server restart resilience, and rapid toggle stress.
6. **Layer 6: Load & Stress**: Automated socket ramping scenarios simulating 150 to 500 concurrent socket connections to measure latency and capacity.
7. **Layer 7: Security Audit**: Gitleaks history scanning, npm audit, XSS/injection payloads, JWT tampering, and security headers verification.
8. **Layer 8: Accessibility & Performance**: axe-core automated audits, prefers-reduced-motion validation, and Lighthouse metrics.
9. **Layer 9: CI / CD Workflow**: GitHub Actions pipeline automating lint, unit, integration, socket, E2E, and security checks on every PR.
10. **Layer 10: Manual Test Charters**: Structured manual test checklist (`MANUAL_TESTS.md`) for real devices, cross-network TURN verification, and hardware edge cases.
