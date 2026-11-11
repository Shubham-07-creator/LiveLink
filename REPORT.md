# LiveLink Test Report

2026-11-10T15:20:56.634Z

**PASS 5  |  FAIL 5  |  FLAKY 0  |  SKIPPED 0**

## Summary by area

| Area | Pass | Fail | Flaky | Skip |
|---|---|---|---|---|
| Real calls (2-5 users, chat, screen share, cleanup) | 5 | 5 | 0 | 0 |

## BROKEN (fix these)

- [Real calls (2-5 users, chat, screen share, cleanup)] **mic and camera toggles change state**
    Error: mic button not found (selectors.js)
    expect(locator).toBeVisible() failed
    Locator: getByRole('button', { name: /mute|unmute|microphone/i }).first()
    Expected: visible
    Timeout: 15000ms
    Error: element(s) not found
- [Real calls (2-5 users, chat, screen share, cleanup)] **leave asks for confirmation and then leaves**
    Error: user was not taken out of the room after confirming Leave
    user was not taken out of the room after confirming Leave
    expect(received).not.toBe(expected) // Object.is equality
    Expected: not "/pdaf-6cn4-hzu9"
    Call Log:
    - Timeout 15000ms exceeded while waiting on the predicate
- [Real calls (2-5 users, chat, screen share, cleanup)] **closing a tab removes the tile for the others (no ghost tiles)**
    Error: ghost tile stayed after peer left
    ghost tile stayed after peer left
    expect(received).toBeLessThan(expected)
    Expected: < 2
    Received:   2
    Call Log:
- [Real calls (2-5 users, chat, screen share, cleanup)] **chat: XSS payload is shown as text and never executes**
    Test timeout of 120000ms exceeded.
- [Real calls (2-5 users, chat, screen share, cleanup)] **screen share: shown for others, not mirrored, object-fit contain**
    Test timeout of 120000ms exceeded.

## FLAKY (passed only on retry, treat as bugs)

_None._

## Warnings (not failures, but look at them)

_None._

## Passed

- [04-call] 2 users see and hear each other (video frames actually advance)
- [04-call] room limit: user 5 sees the "room full" message
- [04-call] permission denied: friendly message, no crash, join without camera/mic
- [04-call] refresh mid-call: user rejoins and there is no duplicate tile
- [04-call] private room (p-): third person is rejected

## Skipped

_None._
