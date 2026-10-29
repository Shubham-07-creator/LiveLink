import { test, expect } from '@playwright/test';

test.describe('E2E Layer 4: Multi-Peer Guest Journey & Real-time WebRTC Mesh', () => {
  test('two guests join the same meeting, establish P2P video stream, exchange chat, and leave cleanly', async ({ browser }) => {
    // Valid room code using unambiguous alphabet [2-9a-km-z]
    const roomCode = 'kmpq-wxyz-2345';

    // 1. Context A (Peer Alice)
    const contextA = await browser.newContext({
      permissions: ['camera', 'microphone']
    });
    const pageA = await contextA.newPage();

    // Catch any uncaught console errors
    const errorsA = [];
    pageA.on('pageerror', (err) => errorsA.push(err.message));

    await pageA.goto(`/${roomCode}`);

    // Verify Lobby loaded
    await expect(pageA.getByText('Ready to join?')).toBeVisible();

    // Fill in Guest Name
    const nameInputA = pageA.getByPlaceholder(/Enter your name/i);
    await nameInputA.fill('Alice QA');

    // Click "Join meeting"
    await pageA.getByRole('button', { name: 'Join meeting' }).click();

    // Verify Peer A is now in the meeting room (TopBar room code is visible)
    await expect(pageA.getByText(roomCode)).toBeVisible();

    // 2. Context B (Peer Bob in isolated browser context)
    const contextB = await browser.newContext({
      permissions: ['camera', 'microphone']
    });
    const pageB = await contextB.newPage();
    const errorsB = [];
    pageB.on('pageerror', (err) => errorsB.push(err.message));

    await pageB.goto(`/${roomCode}`);
    await expect(pageB.getByText('Ready to join?')).toBeVisible();

    const nameInputB = pageB.getByPlaceholder(/Enter your name/i);
    await nameInputB.fill('Bob QA');
    await pageB.getByRole('button', { name: 'Join meeting' }).click();
    await expect(pageB.getByText(roomCode)).toBeVisible();

    // 3. WebRTC Peer Connection Verification
    // Both peers should render <video> elements with non-zero frame dimensions and progressing currentTime
    await pageA.waitForFunction(() => {
      const videos = Array.from(document.querySelectorAll('video'));
      return videos.length >= 2 && videos.some(v => v.videoWidth > 0 && v.currentTime > 0);
    }, { timeout: 15000 });

    await pageB.waitForFunction(() => {
      const videos = Array.from(document.querySelectorAll('video'));
      return videos.length >= 2 && videos.some(v => v.videoWidth > 0 && v.currentTime > 0);
    }, { timeout: 15000 });

    // 4. In-Call Chat Exchange
    // Open chat on Page A
    await pageA.getByRole('button', { name: /In-call chat/i }).click();
    const chatInputA = pageA.getByPlaceholder(/Type a message/i);
    await expect(chatInputA).toBeVisible();

    await chatInputA.fill('Hello from Alice via P2P!');
    await chatInputA.press('Enter');

    // Open chat on Page B and verify message received
    await pageB.getByRole('button', { name: /In-call chat/i }).click();
    await expect(pageB.getByText('Hello from Alice via P2P!')).toBeVisible({ timeout: 5000 });

    // 5. Clean Leave Call Flow
    await pageA.getByRole('button', { name: /Leave/i }).first().click();

    // Confirm Leave modal
    const confirmLeaveBtn = pageA.getByRole('button', { name: 'Leave call' });
    if (await confirmLeaveBtn.isVisible()) {
      await confirmLeaveBtn.click();
    }

    // Verify Page B detects Peer A left
    await pageB.waitForFunction(() => {
      const remoteTiles = document.querySelectorAll('video');
      // Only 1 video remaining (Bob's self view)
      return remoteTiles.length <= 1;
    }, { timeout: 10000 });

    // Verify zero uncaught JavaScript console errors
    expect(errorsA).toEqual([]);
    expect(errorsB).toEqual([]);

    await contextA.close();
    await contextB.close();
  });
});
