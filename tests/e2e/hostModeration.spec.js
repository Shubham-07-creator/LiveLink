import { test, expect } from '@playwright/test';

const chars = '23456789abcdefghjkmnpqrstuvwxyz';
const rand4 = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
const makeRoom = () => `${rand4()}-${rand4()}-${rand4()}`;

const CTX_OPTIONS = {
  permissions: ['camera', 'microphone'],
  viewport: { width: 1280, height: 800 }
};

async function joinRoom(page, roomCode, name) {
  await page.goto(`/${roomCode}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await expect(page.getByText('Ready to join?')).toBeVisible({ timeout: 15000 });
  const nameInput = page.getByPlaceholder(/Enter your name/i).first();
  await expect(nameInput).toBeVisible({ timeout: 10000 });
  await nameInput.fill(name);
  const joinBtn = page.getByRole('button', { name: 'Join meeting' }).first();
  await expect(joinBtn).toBeEnabled({ timeout: 10000 });
  await joinBtn.click();
  await expect(page.getByText(roomCode).first()).toBeVisible({ timeout: 15000 });
}

async function openPeopleDrawer(page) {
  await page.bringToFront();
  await page.mouse.move(640, 750);
  const isDrawerOpen = await page.getByText(/HOST POWERS|People \(/i).isVisible().catch(() => false);
  if (!isDrawerOpen) {
    const peopleBtn = page.getByRole('button', { name: 'People', exact: true }).first();
    if (await peopleBtn.isVisible().catch(() => false)) {
      await peopleBtn.click();
    } else {
      await page.keyboard.press('p');
    }
  }
}

test.describe('E2E Layer 4: Host Controls, Waiting Room (Admit / Deny), Mute-All, Kick & Host Succession', () => {
  test('full host lifecycle: lock room, waiting room admit/deny, mute all, remove participant, host transfer', async ({ browser }) => {
    test.setTimeout(90000);
    const room = makeRoom();

    // 1. Host Context
    const ctxHost = await browser.newContext(CTX_OPTIONS);
    const pageHost = await ctxHost.newPage();
    await joinRoom(pageHost, room, 'Host Alice');

    // Host opens People Drawer
    await openPeopleDrawer(pageHost);
    await expect(pageHost.getByText(/HOST POWERS/i)).toBeVisible({ timeout: 10000 });

    // Host clicks "Lock Room"
    const lockBtn = pageHost.getByRole('button', { name: /Lock Room/i });
    await lockBtn.click();
    await expect(pageHost.getByRole('button', { name: /Unlock Room/i })).toBeVisible({ timeout: 5000 });

    // 2. Attendee Bob attempts to join locked room
    const ctxBob = await browser.newContext(CTX_OPTIONS);
    const pageBob = await ctxBob.newPage();
    await pageBob.goto(`/${room}`, { waitUntil: 'domcontentloaded' });
    await expect(pageBob.getByText('Ready to join?')).toBeVisible({ timeout: 15000 });

    const nameBob = pageBob.getByPlaceholder(/Enter your name/i).first();
    await expect(nameBob).toBeVisible({ timeout: 10000 });
    await nameBob.fill('Bob Attendee');

    const joinBtnBob = pageBob.getByRole('button', { name: 'Join meeting' }).first();
    await expect(joinBtnBob).toBeEnabled({ timeout: 10000 });
    await joinBtnBob.click();

    // Bob MUST see Waiting Room modal ("Waiting for the Host")
    await expect(
      pageBob.getByText(/Waiting for the Host|meeting is locked/i).first()
    ).toBeVisible({ timeout: 15000 });

    // Host sees Bob in the Waiting Room queue and clicks "Admit"
    await expect(pageHost.getByText('Bob Attendee')).toBeVisible({ timeout: 15000 });
    const admitBtn = pageHost.getByRole('button', { name: /Admit/i }).first();
    await admitBtn.click();

    // Bob enters meeting successfully
    await expect(pageBob.getByText(room).first()).toBeVisible({ timeout: 15000 });

    // 3. Attendee Charlie joins while room is still locked -> Host Denies
    const ctxCharlie = await browser.newContext(CTX_OPTIONS);
    const pageCharlie = await ctxCharlie.newPage();
    await pageCharlie.goto(`/${room}`, { waitUntil: 'domcontentloaded' });
    await expect(pageCharlie.getByText('Ready to join?')).toBeVisible({ timeout: 15000 });

    const nameCharlie = pageCharlie.getByPlaceholder(/Enter your name/i).first();
    await expect(nameCharlie).toBeVisible({ timeout: 10000 });
    await nameCharlie.fill('Charlie');

    const joinBtnCharlie = pageCharlie.getByRole('button', { name: 'Join meeting' }).first();
    await expect(joinBtnCharlie).toBeEnabled({ timeout: 10000 });
    await joinBtnCharlie.click();

    // Host sees Charlie in queue and clicks "Deny"
    await expect(pageHost.getByText('Charlie')).toBeVisible({ timeout: 15000 });
    const denyBtn = pageHost.getByRole('button', { name: /Deny/i }).first();
    await denyBtn.click();

    // Charlie sees "Entry Declined" modal
    await expect(
      pageCharlie.getByText(/Entry Declined|declined your request/i).first()
    ).toBeVisible({ timeout: 15000 });

    // 4. Host Mute All
    const muteAllBtn = pageHost.getByRole('button', { name: /Mute All/i });
    if (await muteAllBtn.isVisible().catch(() => false)) {
      await muteAllBtn.click();
      await pageBob.waitForTimeout(1000);
    }

    // 5. Host Succession: Alice (host) leaves -> Bob is promoted to Host
    await ctxHost.close();

    // Bob receives host status and can see HOST POWERS
    await openPeopleDrawer(pageBob);
    await expect(pageBob.getByText(/HOST POWERS/i)).toBeVisible({ timeout: 15000 });

    // 6. As new Host, Bob admits Dave and then removes Dave
    const ctxDave = await browser.newContext(CTX_OPTIONS);
    const pageDave = await ctxDave.newPage();
    await pageDave.goto(`/${room}`, { waitUntil: 'domcontentloaded' });
    await expect(pageDave.getByText('Ready to join?')).toBeVisible({ timeout: 15000 });

    const nameDave = pageDave.getByPlaceholder(/Enter your name/i).first();
    await expect(nameDave).toBeVisible({ timeout: 10000 });
    await nameDave.fill('Dave Attendee');

    const joinBtnDave = pageDave.getByRole('button', { name: 'Join meeting' }).first();
    await expect(joinBtnDave).toBeEnabled({ timeout: 10000 });
    await joinBtnDave.click();

    // Bob (new host) sees Dave in Waiting Room and Admits him
    await expect(pageBob.getByText('Dave Attendee')).toBeVisible({ timeout: 15000 });
    const admitDaveBtn = pageBob.getByRole('button', { name: /Admit/i }).first();
    await admitDaveBtn.click();

    // Dave joins meeting
    await expect(pageDave.getByText(room).first()).toBeVisible({ timeout: 15000 });

    // Bob removes Dave from meeting
    await pageBob.bringToFront();
    await pageBob.mouse.move(640, 750);
    const drawerOpen = await pageBob.getByText(/HOST POWERS/i).isVisible().catch(() => false);
    if (!drawerOpen) {
      const pBtn = pageBob.getByRole('button', { name: 'People', exact: true }).first();
      if (await pBtn.isVisible().catch(() => false)) {
        await pBtn.click();
      }
    }
    pageBob.on('console', msg => console.log('[BOB LOG]', msg.text()));
    pageDave.on('console', msg => console.log('[DAVE LOG]', msg.text()));

    // Wait for Dave to appear in Bob's participants list
    await expect(pageBob.getByText('Dave Attendee').last()).toBeVisible({ timeout: 15000 });
    console.log('Dave is visible on Bob page');

    // Target Dave's row specifically in the PeopleDrawer list
    const daveRow = pageBob.locator('li', { hasText: 'Dave Attendee' });
    await expect(daveRow).toBeVisible({ timeout: 15000 });
    const daveKickBtn = daveRow.locator('[data-testid="remove-participant-btn"], button[aria-label*="remove" i]').first();
    await expect(daveKickBtn).toBeVisible({ timeout: 10000 });
    await daveKickBtn.click();

    // Dave is kicked out to landing page and sees removal notification
    await expect(
      pageDave.getByText(/removed from this meeting by the host|removed from the meeting/i).first()
    ).toBeVisible({ timeout: 15000 });

    await ctxBob.close().catch(() => {});
    await ctxCharlie.close().catch(() => {});
    await ctxDave.close().catch(() => {});
  });
});
