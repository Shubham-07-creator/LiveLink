# 🧪 LiveLink Complete Layered Test Plan

**Application Overview**: Real-time WebRTC video conferencing web application (React 19, Socket.IO, Node/Express, MongoDB, WebRTC P2P mesh capped at 4 users, private 1-on-1 calls with `p-` prefix, host controls and waiting room, Metered TURN relay, and optional Gemini summary).

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
| **Authentication & Tokens** | `backend/src/controllers/user.controller.js`<br>`backend/src/models/user.model.js` | **HIGH** | Token forgery, tokenVersion bypass, expired refresh token reuse, Google ID token spoofing | Layer 1 (Unit), Layer 2 (Integration), Layer 7 (Security) |
| **Room Code Generator & Validator** | `frontend/src/utils/roomCode.js`<br>`backend/src/controllers/socketManager.js` | **HIGH** | Ambiguous characters (0/O/1/l), code collision, regex bypass, private room confusion | Layer 1 (Unit), Layer 3 (Signaling), Layer 4 (E2E) |
| **Atomic Private 1-on-1 Lock & Capacity** | `backend/src/controllers/socketManager.js` | **HIGH** | Race condition: 2 simultaneous joins admitting a 3rd user; standard 4-user overflow | Layer 3 (Socket.IO Race Test - 200 iterations), Layer 4 (E2E) |
| **Signaling & Host Moderation** | `backend/src/controllers/socketManager.js`<br>`frontend/src/hooks/useSignaling.js` | **HIGH** | Unauthorized host actions (mute/kick/lock/spotlight), waiting room leaks, host succession drop | Layer 3 (Socket Mock Testing), Layer 4 (E2E Host Journeys) |
| **Screen Share Single-Presenter** | `backend/src/controllers/socketManager.js`<br>`frontend/src/hooks/useMedia.js` | **HIGH** | Simultaneous presenters clashing, unmirrored text degradation, resolution vs framerate | Layer 1 (Unit), Layer 3 (Signaling), Layer 4 (E2E) |
| **Adaptive Bitrate & Codec Ordering** | `frontend/src/utils/adaptiveQuality.js`<br>`frontend/src/hooks/usePeers.js` | **HIGH** | Audio starvation under network congestion, wrong codec priority on mobile vs desktop | Layer 1 (Unit), Layer 5 (Network Chaos) |
| **Perfect Negotiation & Glare Handling** | `frontend/src/hooks/usePeers.js` | **HIGH** | Offer collision race, polite peer rollback failure, unbuffered early ICE candidate loss | Layer 1 (Unit Mock), Layer 4 (E2E 2-Peer Mesh), Layer 5 (Chaos) |
| **Input Validation (Zod Schemas)** | `backend/src/middleware/validator.js` | **HIGH** | NoSQL injection, XSS in chat/name, oversized payloads, invalid avatar schemes | Layer 1 (Unit), Layer 2 (Integration), Layer 7 (Security) |
| **CORS & Rate Limiting** | `backend/src/app.js`<br>`backend/src/routes/users.routes.js` | **HIGH** | Origin reflection vulnerability, brute-force auth bypass, DDoS on join endpoints | Layer 2 (Integration), Layer 3 (Signaling), Layer 7 (Security) |
| **ICE & TURN Credential Service** | `backend/src/controllers/user.controller.js`<br>`backend/src/routes/users.routes.js` | **MEDIUM** | API key leakage in bundle, expired HMAC credential generation, endpoint flooding | Layer 2 (Integration), Layer 7 (Secret Scanning) |
| **Optional Gemini AI Summary** | `backend/src/controllers/ai.controller.js`<br>`frontend/src/pages/VideoMeet.jsx` | **MEDIUM** | Missing consent banner, unhandled 429 quota exhaustion, transcript storage leak | Layer 2 (Integration Fakes), Layer 4 (E2E), Layer 7 (Security) |
| **Media Capture & Devices** | `frontend/src/hooks/useMedia.js`<br>`frontend/src/utils/mediaFallback.js` | **MEDIUM** | Permission denied crashes, unplugged device crashes, audio feedback loops | Layer 4 (E2E Fake Devices), Layer 10 (Manual Real Hardware) |
| **Network Quality Telemetry** | `frontend/src/hooks/useStats.js` | **LOW** | Incorrect stats-to-quality tier classification, false Poor alert | Layer 1 (Unit), Layer 5 (Network Throttling) |
| **Design System & Theme Engine** | `frontend/src/theme.js`<br>`frontend/src/tokens.js`<br>`frontend/src/components/ui/Toast.jsx` | **LOW** | Undefined theme property crash (e.g. shadow on Toast), missing palette keys | Layer 1 (Unit), Layer 4 (Visual Regression), Layer 8 (A11y) |

---

## 🏗️ 10 Test Layers Overview

1. **Layer 1: Unit Tests**: Vitest test suite testing pure functions, math, encoders, negotiation rules, schemas, and theme token resolvers.
2. **Layer 2: Backend Integration**: Supertest + in-memory MongoDB tests covering all auth, session, CORS, NoSQL injection, and TURN endpoints.
3. **Layer 3: Signaling & Socket Tests**: Headless Socket.IO clients verifying capacity, atomic lock race conditions (200x repetition), host permissions, and room teardown memory leaks.
4. **Layer 4: End-to-End (E2E)**: Playwright multi-context tests running fake audio/video streams across guest, host, private, and mobile journeys.
5. **Layer 5: Network & Chaos**: CDP network throttling (Slow 3G, packet loss, offline drops), ICE restarts, server restart resilience, and rapid toggle stress.
6. **Layer 6: Load & Stress**: Artillery/k6 scenarios simulating 200 to 1,000 concurrent socket connections and REST endpoints to identify capacity limits.
7. **Layer 7: Security Audit**: Gitleaks history scanning, npm audit, XSS/injection payloads, JWT tampering, and security headers verification.
8. **Layer 8: Accessibility & Performance**: axe-core automated audits, prefers-reduced-motion validation, and Lighthouse metrics.
9. **Layer 9: CI / CD Workflow**: GitHub Actions pipeline automating lint, unit, integration, socket, E2E, and security checks on every PR.
10. **Layer 10: Manual Test Charters**: Structured manual test checklist (`MANUAL_TESTS.md`) for real devices, cross-network TURN verification, and hardware edge cases.
