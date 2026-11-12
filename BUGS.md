# 🐛 LiveLink Discovered Bugs & Regressions Log

This document records all functional, security, stability, or boundary bugs uncovered during the development and execution of the LiveLink layered test suite. Per SDET engineering rules, every issue logged here received a dedicated reproduction test and resolution commit.

## Summary Table

| Bug ID | Severity | Status | Summary | Affected Component | Regression Test | Resolution Commit |
|:---:|:---:|:---:|:---|:---|:---|:---:|
| **BUG-001** | High | Fixed | `app.js` unconditionally invoked `server.listen` and `mongoose.connect` on import with no `export { app, server }` | `backend/src/app.js:146` | `tests/integration/auth.test.js` | `8de833b` |
| **BUG-002** | High | Fixed | Missing `shadow` fallback property in `tokens.js` caused `Toast.jsx` crash on theme read | `frontend/src/tokens.js:215` | `tests/unit/themeAndTokens.test.js` | `9497e97` |
| **BUG-003** | Medium | Fixed | Hardcoded IP-based join rate limiter blocked automated concurrency and load test suites | `backend/src/controllers/socketManager.js:26` | `tests/signaling/raceCondition.test.js` | `875405d` |
| **BUG-004** | High | Fixed | `Toast.jsx` crashes with `TypeError: Cannot read properties of undefined (reading 'shadow')` when theme preference is 'system' or uninitialized | `frontend/src/tokens.js:215`, `frontend/src/components/ui/Toast.jsx:91` | `tests/unit/themeAndTokens.test.js` | `f46e7ec` |
| **BUG-005** | Medium | Fixed | Static frontend host response missing OWASP recommended security headers (`nosniff`, `SAMEORIGIN`) | `frontend/public/_headers`, `tests/e2e/serveFrontend.js:52` | `scripts/runZapBaselineScan.js` | `d8197e6` |
| **BUG-006** | Medium | Fixed | WCAG 2 AA accessibility violations: `meta-viewport` disabled zooming (`user-scalable=no`) and `textMuted` color contrast ratio (<4.5:1) | `frontend/public/index.html:6`, `frontend/src/tokens.js:13`, `frontend/src/components/ui/Badge.jsx:28` | `scripts/runLighthouseAudit.js`, `tests/e2e/a11y.spec.js` | `d8197e6` |

**Total Open Blockers**: **0** (All discovered bugs resolved and covered by regression tests).

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
- **Expected Behavior**: In `NODE_ENV === "test"`, the IP rate limiter allows synthetic test traffic to verify concurrency without artificial failure.
- **Actual Behavior**: High-concurrency test runs stalled waiting for room admission.
- **Regression Test**: `tests/signaling/raceCondition.test.js`, `tests/load/signalingLoad.js`
- **Fix Commit**: `875405d`

---

### [BUG-004] TypeError: Cannot read properties of undefined (reading 'shadow') in Toast.jsx
- **Severity**: High
- **Status**: Fixed & Verified
- **Affected File & Line**: `frontend/src/tokens.js:215`, `frontend/src/components/ui/Toast.jsx:91`, `frontend/src/contexts/ThemeContext.jsx:90`
- **Steps to Reproduce**:
  1. Open `/home` with theme preference set to `"system"` or with uninitialized `localStorage`.
  2. A toast is triggered (or component mounts reading theme tokens).
  3. `Toast.jsx` evaluates `tokens[mode].shadow` or `c.shadow`.
- **Expected Behavior**: Theme preference resolves strictly to `"light"` or `"dark"` via `window.matchMedia` before passing to tokens; `getTokens(mode)` and `createAppTheme()` guarantee `shadow`, `custom.shadow`, and `colors.shadow` exist on all modes without throwing.
- **Actual Behavior**: Uncaught TypeError: `Cannot read properties of undefined (reading 'shadow')` causing app to crash into `ErrorBoundary`.
- **Regression Test**: `tests/unit/themeAndTokens.test.js`
- **Fix Commit**: `f46e7ec`

---

### [BUG-005] Missing Security Headers on Static Frontend Serving
- **Severity**: Medium
- **Status**: Fixed & Verified
- **Affected File & Line**: `frontend/public/_headers`, `tests/e2e/serveFrontend.js:52`
- **Tooling Implementation Disclosure**: Detected via `scripts/runZapBaselineScan.js` (a custom Node.js HTTP baseline vulnerability script implementing OWASP ZAP core checks, used because the official ZAP docker container requires Docker which is not installed on this host environment).
- **Steps to Reproduce**:
  1. Perform HTTP security header baseline scan against frontend web server (`http://localhost:3000`).
  2. Inspect response headers for `index.html` and static assets.
- **Expected Behavior**: Server includes `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and `Referrer-Policy: strict-origin-when-cross-origin`.
- **Actual Behavior**: Security headers were missing on static responses, triggering OWASP baseline medium/low alerts.
- **Regression Test**: `scripts/runZapBaselineScan.js`
- **Fix Commit**: `d8197e6`

---

### [BUG-006] WCAG 2 AA Accessibility Violations in Viewport and Color Contrast
- **Severity**: Medium
- **Status**: Fixed & Verified
- **Affected File & Line**: `frontend/public/index.html:6`, `frontend/src/tokens.js:13`, `frontend/src/components/ui/Badge.jsx:28`
- **Tooling Implementation Disclosure**: Detected via `scripts/runLighthouseAudit.js` (an automated Playwright + Axe-Core + Navigation Timing audit script implementing Lighthouse CI thresholds, used because the standalone Google Lighthouse CLI binary requires external headless shell downloads blocked by network sandbox rules).
- **Steps to Reproduce**:
  1. Execute automated Axe-Core / Lighthouse CI accessibility audit on landing and authentication pages.
  2. Audit flags `meta-viewport` (`maximum-scale=1, user-scalable=no` preventing pinch-to-zoom) and `color-contrast` (`textMuted` `#627d98` on light surfaces yielding 4.41:1 ratio, below 4.5:1 WCAG AA threshold).
- **Expected Behavior**: Viewport allows scaling for visually impaired users; text foreground-to-background contrast ratio is >= 4.5:1.
- **Actual Behavior**: Accessibility score dropped to 94/100 due to viewport restriction and low contrast badges/subtitles.
- **Regression Test**: `scripts/runLighthouseAudit.js`, `tests/e2e/a11y.spec.js`
- **Fix Commit**: `d8197e6`
