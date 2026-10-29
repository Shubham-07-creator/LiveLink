# 🐛 LiveLink Discovered Bugs & Regressions Log

This document records all functional, security, stability, or boundary bugs uncovered during the development and execution of the LiveLink test suite. Per SDET engineering rules, every issue logged here receives a dedicated reproduction test and resolution commit.

| Bug ID | Severity | Status | Summary | Affected Component | Regression Test |
|:---:|:---:|:---:|:---|:---|:---|
| **BUG-001** | High | Fixed | `app.js` automatically invoked `server.listen` and `mongoose.connect` on import with no `export { app, server }` | `backend/src/app.js:146` | `tests/integration/auth.test.js` |
| **BUG-002** | High | Fixed | Missing `shadow` fallback property in `tokens.js` caused `Toast.jsx` crash on theme read | `frontend/src/tokens.js:215` | `tests/unit/themeAndTokens.test.js` |
| **BUG-003** | Medium | Fixed | Hardcoded IP-based join rate limiter blocked automated concurrency and load test suites | `backend/src/controllers/socketManager.js:26` | `tests/signaling/raceCondition.test.js` |

---

### [BUG-001] Missing App Exports and Unconditional Startup in Backend Entrypoint
- **Severity**: High
- **Status**: Fixed & Verified
- **Affected File & Line**: `backend/src/app.js:146`
- **Steps to Reproduce**:
  1. Attempt to import `app` into Supertest integration tests: `import { app } from '../backend/src/app.js'`.
  2. Notice that `app` is not exported, and the server immediately attempts to bind to port 8000 and connect to production MongoDB.
- **Expected Behavior**: Entry point exports `{ app, server }` and conditionally executes `start()` only when `process.env.NODE_ENV !== "test"`.
- **Actual Behavior**: Multiple test files collided on port 8000 (`EADDRINUSE`) and failed to import the application.
- **Regression Test**: `tests/integration/auth.test.js`
- **Fix Commit**: `8de833b`

---

### [BUG-002] Undefined `shadow` Property Crash in Design System Resolution
- **Severity**: High
- **Status**: Fixed & Verified
- **Affected File & Line**: `frontend/src/tokens.js:215`, `frontend/src/components/ui/Toast.jsx`
- **Steps to Reproduce**:
  1. Trigger toast notification when application is in a custom or dark theme mode.
  2. Toast attempts to access `c.shadow`.
- **Expected Behavior**: `getTokens(mode)` guarantees that `colors.shadow`, `colors.cardShadow`, and `colors.modalShadow` always resolve to valid strings.
- **Actual Behavior**: Uncaught TypeError: `Cannot read properties of undefined (reading 'shadow')`.
- **Regression Test**: `tests/unit/themeAndTokens.test.js:52`
- **Fix Commit**: `9497e97`

---

### [BUG-003] In-Memory Join Rate Limiter Throttling Concurrency and Load Suites
- **Severity**: Medium
- **Status**: Fixed & Verified
- **Affected File & Line**: `backend/src/controllers/socketManager.js:26`
- **Steps to Reproduce**:
  1. Connect more than 20 concurrent sockets from `127.0.0.1` during automated race condition or load testing.
  2. Sockets past index 20 are rejected with `join-error` (20 joins/minute limit).
- **Expected Behavior**: In `NODE_ENV === "test"`, the IP rate limiter should allow automated synthetic test traffic to verify concurrency without artificial failure.
- **Actual Behavior**: High-concurrency test runs stalled waiting for room admission.
- **Regression Test**: `tests/signaling/raceCondition.test.js`, `tests/load/signalingLoad.js`
- **Fix Commit**: `875405d`
