# 📋 LiveLink Manual QA Test Plan & Charters

This document covers all hardware, network edge-cases, audio-acoustic properties, and third-party integrations that cannot be fully verified via automated browser emulation.

---

## 📱 Hardware, Network & Real Device Verification

| Test Case ID | Test Scenario | Execution Steps | Expected Result | Pass / Fail | Notes |
|:---|:---|:---|:---|:---:|:---|
| **MAN-01** | **Two Real Devices Across Different Networks** | Connect Device 1 to local Wi-Fi and Device 2 to 4G/5G mobile data. Join the same room code. Open `chrome://webrtc-internals` on Device 1. | P2P media connects within 3s. `chrome://webrtc-internals` confirms active candidate pair (STUN `srflx` or Metered `relay` if symmetric NAT). | [ ] | |
| **MAN-02** | **iPhone Safari Native Test** | Open room link on iPhone (iOS 17+ Safari). Accept permissions. Speak and toggle camera. | Camera and microphone stream smoothly; H.264 hardware codec preferred; bottom dock remains above home bar. | [ ] | |
| **MAN-03** | **Android Chrome Test** | Open room link on Android Chrome. Test rear vs front camera switching in settings. | Stream switches between cameras without freezing or crashing WebRTC track. | [ ] | |
| **MAN-04** | **Samsung Internet Browser** | Open room link on Samsung Galaxy device using Samsung Internet. | Layout scales correctly, video renders without stretching, audio flows clearly. | [ ] | |
| **MAN-05** | **macOS Safari & Desktop Edge/Firefox** | Test Safari on macOS connecting to Firefox on Linux and Edge on Windows. | Perfect negotiation resolves offer/answer glare cleanly. Video tiles render in 3-way grid. | [ ] | |
| **MAN-06** | **Bluetooth Headset Disconnect / Connect Mid-Call** | Connect Bluetooth earbuds during active call, speak, disconnect Bluetooth, reconnect Bluetooth. | Audio stream automatically switches to device speaker/mic without call drop; `devicechange` event updates UI. | [ ] | |
| **MAN-07** | **Phone Call Interruption on Mobile** | Receive an incoming cellular call on mobile while in an active LiveLink meeting. | Microphone gracefully yields; after declining cellular call, LiveLink resumes audio without manual reload. | [ ] | |
| **MAN-08** | **Screen Lock & App Backgrounding** | Lock phone screen or switch to home screen for 10 seconds, then reopen browser. | Tab visibility optimization pauses video send; reopening restores media streams and maintains signaling. | [ ] | |
| **MAN-09** | **Device Orientation Rotation** | Rotate phone from portrait to landscape and back during a 3-user meeting. | Video tiles reposition to fill landscape space without horizontal overflow or cut-off controls. | [ ] | |
| **MAN-10** | **Low Battery Mode** | Enable iOS / Android battery saver during video call. | Frame rate gracefully throttles without tearing or audio stutter. | [ ] | |
| **MAN-11** | **Screen Share Text & Code Readability** | Presenter shares VS Code with small (12pt) font. Attendees inspect text sharpness. | Text is crisp and legible without blur (`contentHint = "detail"`, `maintain-resolution`, 1.2 Mbps cap). | [ ] | |
| **MAN-12** | **Tab Audio Sharing** | Share a browser tab playing video/music with "Share tab audio" checked. | Remote participants hear both presenter microphone and tab audio clearly. | [ ] | |
| **MAN-13** | **Acoustic Echo Test (Two Laptops in Same Room)** | Place two laptops 1 meter apart in the same room with speakers unmuted and microphones open. | Browser hardware `echoCancellation` suppresses audio feedback loop without piercing squeal. | [ ] | |
| **MAN-14** | **Render Free-Tier Cold Start Experience** | Let Render backend sleep for 20 minutes. Open meeting link as first visitor. | Lobby displays *"Waking up the server, this can take up to a minute..."* with spinner and Retry button. | [ ] | |
| **MAN-15** | **Real Google OAuth & Email Delivery** | Sign in with a live Google account; test password reset and verification emails. | Google popup completes auth and sets secure cookies; verification email arrives in inbox. | [ ] | |
| **MAN-16** | **30-Minute 4-User Endurance / Soak Call** | Maintain a 4-person mesh call for 30 minutes with active video and audio. | Laptop fans remain at reasonable levels; no progressive audio drift or out-of-sync lip flap. | [ ] | |

---

## 🕵️‍♂️ Exploratory Testing Charters (30 Minutes Each)

### Charter 1: "Break the Lobby"
- **Goal**: Find unhandled edge cases in device selection, name entry, and camera setup before joining.
- **Areas**: Denying permissions, unplugging camera, entering 5,000-character name, copy-pasting malformed URL, opening lobby with slow 2G.
- **Findings**: *(To be logged in BUGS.md)*

### Charter 2: "Break Host Controls"
- **Goal**: Attempt to bypass host authority and verify host succession logic.
- **Areas**: Non-host opening devtools to emit `force-mute` or `remove-participant`; host leaving while waiting room has 3 attendees; transferring host back and forth.
- **Findings**: *(To be logged in BUGS.md)*

### Charter 3: "Break the Waiting Room"
- **Goal**: Challenge waiting room isolation and admission queue states.
- **Areas**: Waiting user refreshing page; host denying user and user immediately clicking rejoin; multiple users arriving simultaneously while room locked.
- **Findings**: *(To be logged in BUGS.md)*

### Charter 4: "Break Screen Share"
- **Goal**: Stress screen capture transitions and single-presenter enforcement.
- **Areas**: Rapid start/stop, closing window being shared, attendee trying to share while host is sharing, mobile user attempting screen share.
- **Findings**: *(To be logged in BUGS.md)*

### Charter 5: "Break Reconnection & Network Drops"
- **Goal**: Verify recovery from severe network interruptions without creating ghost participants.
- **Areas**: Toggling airplane mode on/off for 5s, 15s, 45s; switching from Wi-Fi to cellular mid-speech; restarting Wi-Fi router.
- **Findings**: *(To be logged in BUGS.md)*

### Charter 6: "Try to Enter a Room I Should Not"
- **Goal**: Test boundary constraints on private rooms and maximum participant limits.
- **Areas**: 3 users racing to join `p-xxxx-xxxx-xxxx`; 5 users opening standard room at the exact same second; joining with invalid characters (`0`, `O`, `l`, `1`).
- **Findings**: *(To be logged in BUGS.md)*
