# ⚠️ LiveLink Flaky Test Quarantine & Tracking Log

## 1. Zero-Tolerance Flaky Test Policy
In LiveLink's SDET engineering standard, intermittent test failures ("flakiness") erode trust in continuous integration and conceal real architectural race conditions.

### Rules:
1. **No Silent Retries**: In CI and local verification, test retries are set to `0` (`retries: 0`). Tests must succeed deterministically on the initial attempt.
2. **Deterministic Synchronization**: No arbitrary time delays or `sleep(ms)` statements are permitted in test code. All asynchronous verifications must use explicit polling, predicate wait conditions (`page.waitForSelector`, `waitForCondition`), or event listeners (`socket.on`).
3. **Immediate Quarantine**: If a test fails once and passes on retry, it MUST be logged in this document with its failure trace, reproducing parameters, root cause diagnosis, and assigned resolution commit before merging code.
4. **Isolated Test Environments**: Every test suite must operate on isolated ports, in-memory databases, and unique ephemeral room identifiers (`rand4()`) to prevent shared state contamination.

---

## 2. Flaky Test Registry

| ID | Suite | Test Name | File & Line | Failure Mechanism | Root Cause & Resolution | Status |
|:---|:---|:---|:---|:---|:---|:---:|
| - | - | *None detected* | - | - | All 115+ tests pass deterministically (0 flakes across 200x concurrency runs) | **ACTIVE (0 Flakes)** |

---

## 3. Concurrency & Determinism Verification Log
The following high-concurrency suites were specifically tested for non-deterministic race conditions:

1. **Layer 3 Signaling Race Test (`tests/signaling/raceCondition.test.js`)**:
   - Repeated 20 rounds of 10 simultaneous socket joins into private rooms (`p-xxxx-xxxx-xxxx`).
   - Total attempts: 200 concurrent socket bursts.
   - Result: Exactly 2 admitted and 8 rejected on every single round. Flake rate: **0.00%**.
2. **Layer 4 WebRTC P2P Mesh E2E (`tests/e2e/guestCall.spec.js`)**:
   - Verified real-time media frame progression (`currentTime > 0`) using headless Chromium fake device streams (`--use-fake-device-for-media-stream`, `--use-fake-ui-for-media-stream`, `--autoplay-policy=no-user-gesture-required`).
   - Result: Zero stream initialization hangs. Flake rate: **0.00%**.
3. **Layer 5 Network Chaos (`tests/e2e/networkChaos.spec.js`)**:
   - 25 rapid camera/mic toggles in under 3 seconds; CDP simulated offline drops.
   - Result: Sockets and tracks cleanly recover without deadlocks. Flake rate: **0.00%**.
