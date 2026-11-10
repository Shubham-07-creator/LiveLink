# LiveLink Test Suite

Black-box tests: they talk to your running app (local, staging, or deployed) the way a real user and an attacker would.
All tools are free (Playwright, socket.io-client, axe-core).

## Setup (once)
```
npm install
npm run setup            # downloads Chromium
cp .env.example .env     # set BASE_URL / API_URL / SOCKET_URL
```
Use LOCAL or STAGING. The tests create real users and rooms. Only use `DESTRUCTIVE=1` on local/staging.

## Run
| Command | What it checks |
|---|---|
| `npm test` | Everything, then writes **REPORT.md** |
| `npm run test:api` | Auth, cookies, Google-auth takeover, CORS, injection, headers, rate limit, TURN endpoint |
| `npm run test:socket` | Room limit, private-room race, host-only events, cross-room signals, flooding, cleanup |
| `npm run test:pages` | Console errors/crashes on every page x every theme value, mobile overflow, axe a11y |
| `npm run test:call` | Real 2-5 user calls, frozen video, mic/cam, leave modal, ghost tiles, chat XSS, screen share, refresh |
| `npm run test:network` | TURN relay gathering, offline recovery, join/leave loops |
| `npm run test:bundle` | Secrets and source maps in the public frontend bundle |
| `npm run test:destructive` | Everything incl. brute-force rate-limit test |
| `npm run show` | HTML report with traces, screenshots, videos |

## Reading the result
Open **REPORT.md**: BROKEN (fix), FLAKY (passed only on retry, still a bug), Warnings, Passed, Skipped.

## If a test fails with "not found"
The tests do not know your exact labels. Edit:
- `config.js`: API paths, socket event names, request bodies, room limit
- `selectors.js`: button labels for join, mic, camera, share, chat, leave

## Not covered by automation (test by hand)
Real phones on mobile data, iPhone Safari, Bluetooth switching, echo, audio quality, 30-minute heat/battery,
Render cold start from a cold phone, real Google login popup. Check `chrome://webrtc-internals` for a `relay` candidate.
