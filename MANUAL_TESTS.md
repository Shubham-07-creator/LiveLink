# 📋 LiveLink Manual QA Test Plan, Real-Device Matrix & Exploratory Charters

This comprehensive test plan covers physical hardware, real multi-network topologies, acoustic feedback, mobile OS constraints, and third-party integrations that cannot be fully simulated by headless browser automation.

---

## 📱 Hardware & Real-Device Test Checklist

| Test ID | Category | Scenario | Hardware / Network | Steps to Execute | Expected Behavior | Status | Tester Notes |
|:---|:---|:---|:---|:---|:---|:---:|:---|
| **MAN-01** | Multi-Network | Cross-Network P2P Traversal | Device A (Home Wi-Fi), Device B (5G Cellular) | 1. Join room from Device A and Device B.<br>2. Open `chrome://webrtc-internals` on Device A.<br>3. Inspect active ICE candidate pair. | Media connects within 3s. Uses `srflx` or falls back to Metered TURN `relay` if symmetric NAT. Zero audio/video freeze. | [ ] PASS | Verified candidate-pair type. |
| **MAN-02** | Mobile Browser | iOS Safari Native Experience | iPhone 14/15/16 (iOS 17+ Safari) | 1. Open room link.<br>2. Grant camera/mic permissions.<br>3. Join call. | Video stream renders with H.264 codec; bottom dock floats above native iOS home bar; no page zoom on input tap. | [ ] PASS | |
| **MAN-03** | Mobile Browser | Android Chrome Experience | Google Pixel / Samsung (Android 14+) | 1. Join call on Chrome.<br>2. Switch between front and rear cameras. | Camera switch completes in < 1s without track deadlock or black frame. | [ ] PASS | |
| **MAN-04** | Mobile Browser | Samsung Internet Browser | Samsung Galaxy S22/S23/S24 | 1. Join meeting via Samsung Internet.<br>2. Test in-call chat drawer and reactions. | Full layout scaling without horizontal scrolling; chat drawer slides smoothly over video tiles. | [ ] PASS | |
| **MAN-05** | Cross-Browser | Interop: Safari + Firefox + Edge | macOS Safari, Linux Firefox, Win11 Edge | 1. Establish 3-way conference across three different browser engines.<br>2. Verify offer/answer negotiation. | Perfect negotiation handles offer collision without glare; all 3 participants render in balanced grid. | [ ] PASS | |
| **MAN-06** | Audio Hardware | Bluetooth Headset Switch | AirPods / Pixel Buds / Sony WH-1000XM4 | 1. Start call on device speaker/mic.<br>2. Connect Bluetooth headset mid-call.<br>3. Disconnect Bluetooth headset. | Browser handles `devicechange` event; audio input/output seamlessly routes to Bluetooth and reverts to built-in speaker. | [ ] PASS | |
| **MAN-07** | Audio Hardware | Speakerphone & Output Toggle | Mobile device in call | 1. Toggle between earpiece and speakerphone modes. | Audio routes to designated hardware transducer at appropriate volume. | [ ] PASS | |
| **MAN-08** | OS Interruption | Cellular Call Interruption | iPhone / Android receiving phone call | 1. While in active video meeting, receive cellular phone call.<br>2. Decline cellular call. | WebRTC microphone yields during cellular ringing; restores audio automatically upon returning to LiveLink tab. | [ ] PASS | |
| **MAN-09** | OS Interruption | App Switching & Multitasking | Mobile device | 1. In active call, swipe to home screen or switch to messaging app for 15s.<br>2. Return to LiveLink. | Tab visibility pauses video send to save bandwidth; returning immediately reactivates video stream without socket drop. | [ ] PASS | |
| **MAN-10** | OS Interruption | Screen Lock & Power Key | iOS / Android device | 1. Lock screen for 10 seconds.<br>2. Unlock phone and focus browser. | Call remains connected in background (audio maintained); video resumes when screen unlocks. | [ ] PASS | |
| **MAN-11** | Mobile UX | Device Orientation Rotation | Tablet / Smartphone | 1. In a 3-user call, rotate from Portrait to Landscape and back. | Dock and video grid dynamically rearrange without element clipping or horizontal overflow. | [ ] PASS | |
| **MAN-12** | Mobile Hardware | Low Power / Battery Saver Mode | iOS Low Power Mode / Android Battery Saver | 1. Enable battery saver during 4-user call.<br>2. Observe video framerate and CPU usage. | Video framerate dynamically throttles (15-24fps) without audio glitching or frame freezing. | [ ] PASS | |
| **MAN-13** | Screen Share | Code & Small Text Sharpness | Presenter sharing 1080p IDE (12pt font) | 1. Presenter shares VS Code code window.<br>2. Viewers inspect code characters (`{`, `}`, `i`, `l`, `1`). | Text is crisp and legible without blur; `contentHint="detail"` and `maintain-resolution` active; bitrate clamped to 1.2Mbps. | [ ] PASS | |
| **MAN-14** | Screen Share | Tab Audio Sharing | Chrome sharing YouTube/audio tab | 1. Presenter checks "Share tab audio" and plays video.<br>2. Viewers listen. | Attendees hear high-fidelity stereo tab audio mixed cleanly with presenter microphone. | [ ] PASS | |
| **MAN-15** | Acoustic QA | Real Acoustic Echo Cancellation | 2 physical laptops 1m apart with unmuted speakers | 1. Both users sit in same room, unmute microphones, speak loudly. | Built-in browser `echoCancellation` and `noiseSuppression` prevent howling feedback loops. | [ ] PASS | |
| **MAN-16** | Cloud Hosting | Render Cold Start Recovery | Live backend sleeping after 15m inactivity | 1. Visit meeting link as first visitor after cold state. | Lobby displays clear banner: *"Waking up the server, this can take up to a minute"* with animated spinner and retry. | [ ] PASS | |
| **MAN-17** | 3rd Party Auth | Live Google OAuth & Email Delivery | Real Google Workspace / Gmail account | 1. Click "Sign in with Google" on auth page.<br>2. Complete real consent screen. | Session token issued in httpOnly cookie; user redirected to dashboard with prefilled name and avatar. | [ ] PASS | |
| **MAN-18** | Endurance | 30-Minute 4-Peer Mesh Soak | 4 active laptop clients for 30 minutes | 1. Maintain 4-user video conference for 30 consecutive minutes.<br>2. Monitor CPU, fan noise, and audio drift. | Memory footprint stays steady (< 120MB per tab); zero audio drift or out-of-sync lip flap; CPU load under 45%. | [ ] PASS | |

---

## 🕵️‍♂️ Exploratory Testing Charters (30 Minutes Each)

### Charter 1: "Break the Lobby"
- **Mission**: Discover unhandled edge cases in hardware device selection, permission denials, and pre-join configuration.
- **Target Areas**:
  - Unplugging USB webcam while lobby preview is rendering.
  - Denying camera permission while allowing microphone, then joining.
  - Submitting 2,000-character display name or emojis/RTL characters.
  - Pasting invalid or malformed room URLs (e.g., `/room/invalid!@#$%^`).
  - Loading lobby with network throttled to 2G.

### Charter 2: "Break Host Controls"
- **Mission**: Verify host moderation security boundary and host succession under adversarial conditions.
- **Target Areas**:
  - Non-host emitting raw WebSocket events (`mute-participant`, `remove-participant`, `lock-room`).
  - Host leaving the meeting while 3 participants are queued in the waiting room.
  - Rapidly transferring host authority between users.
  - Host muting all participants while another user is speaking.

### Charter 3: "Break the Waiting Room"
- **Mission**: Challenge waiting room isolation, state machine synchronization, and admission queues.
- **Target Areas**:
  - User denied by host immediately clicking "Try again".
  - Waiting user refreshing the browser tab mid-wait.
  - 4 users hitting the locked room URL at the exact same millisecond.
  - Host disconnecting while attendees wait.

### Charter 4: "Break Screen Share"
- **Mission**: Stress screen capture transitions, browser permission revocation, and single-presenter rules.
- **Target Areas**:
  - Participant attempting to start screen share while host is already presenting.
  - Presenter stopping share via Chrome's native floating bar ("Stop sharing") vs the LiveLink dock button.
  - Closing the application window being shared.
  - Resizing the shared window rapidly between 4K and 720p.

### Charter 5: "Break Reconnection & Network Drops"
- **Mission**: Ensure robust WebRTC ICE restart and WebSocket auto-reconnect without ghost peer tiles.
- **Target Areas**:
  - Toggling Wi-Fi off for 3s, 15s, and 45s.
  - Switching Wi-Fi networks mid-speech.
  - Backend server restart during active 4-user conference.
  - Peer abruptly closing laptop lid or force-killing browser.

### Charter 6: "Try to Enter a Room I Should Not"
- **Mission**: Enforce boundary conditions and admission gates on private 1-on-1 calls and room capacity.
- **Target Areas**:
  - 3 users racing to join a private room (`p-xxxx-xxxx-xxxx`).
  - 5 users racing to join a standard room simultaneously.
  - Attempting to join with ambiguous characters (`0`, `O`, `1`, `l`, `I`).
  - Attempting to access non-existent room codes.
