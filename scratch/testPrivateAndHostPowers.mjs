import http from 'node:http';
import assert from 'node:assert';
import { io as Client } from '../frontend/node_modules/socket.io-client/build/esm/index.js';
import { connectToSocket } from '../backend/src/controllers/socketManager.js';

console.log("=============================================================");
console.log("  RUNNING PRIVATE CALLS & HOST POWERS VERIFICATION TEST SUITE ");
console.log("=============================================================");

const server = http.createServer();
connectToSocket(server);

await new Promise((resolve) => server.listen(0, resolve));
const port = server.address().port;
const serverUrl = `http://localhost:${port}`;
console.log(`[INIT] Test server running on ${serverUrl}`);

function createClient() {
    return Client(serverUrl, {
        transports: ['websocket'],
        reconnection: false
    });
}

try {
    // -------------------------------------------------------------
    // TEST 1: Private 1-on-1 Call: 2 Join, 3rd Blocked
    // -------------------------------------------------------------
    console.log("\n--- TEST 1: Private 1-on-1 Room Strict Capacity ---");
    const privateRoom = "p-priv-user-test";

    const c1 = createClient();
    const c2 = createClient();
    const c3 = createClient();

    await new Promise((resolve) => c1.on('connect', resolve));
    await new Promise((resolve) => c2.on('connect', resolve));
    await new Promise((resolve) => c3.on('connect', resolve));

    // Client 1 joins private room
    const c1JoinedPromise = new Promise((resolve) => {
        c1.on('user-joined', (joinedId, allUsers, names, avatars, hostId, isLocked, permissions, isPrivate) => {
            if (joinedId === c1.id) {
                assert.strictEqual(hostId, c1.id, "First joiner must be host");
                assert.strictEqual(isPrivate, true, "isPrivate must be true for p- rooms");
                resolve();
            }
        });
    });
    c1.emit('join-call', privateRoom, 'Alice');
    await c1JoinedPromise;
    console.log("  [PASS] Client 1 (Alice) joined private call as Host (isPrivate=true)");

    // Client 2 joins private room
    const c2JoinedPromise = new Promise((resolve) => {
        c2.on('user-joined', (joinedId, allUsers, names, avatars, hostId, isLocked, permissions, isPrivate) => {
            if (joinedId === c2.id) {
                assert.strictEqual(allUsers.length, 2, "Room must have 2 participants");
                assert.strictEqual(isPrivate, true, "isPrivate must be true for Client 2");
                resolve();
            }
        });
    });
    c2.emit('join-call', privateRoom, 'Bob');
    await c2JoinedPromise;
    console.log("  [PASS] Client 2 (Bob) joined private call (Room now has exactly 2 participants)");

    // Client 3 attempts to join private room -> must be rejected with room-full
    const c3RejectedPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Timeout waiting for room-full")), 3000);
        c3.on('room-full', (info) => {
            clearTimeout(timeout);
            assert.strictEqual(info.isPrivate, true, "info.isPrivate must be true");
            assert.strictEqual(info.max, 2, "Max must be 2");
            assert.ok(info.message.includes("private 1-on-1 call"), "Must explain private call capacity");
            resolve();
        });
        c3.on('user-joined', () => {
            clearTimeout(timeout);
            reject(new Error("Client 3 should NOT have joined a full private call!"));
        });
    });
    c3.emit('join-call', privateRoom, 'Intruder');
    await c3RejectedPromise;
    console.log("  [PASS] Client 3 (Intruder) rejected from full private room (Strict 2-person limit enforced)");

    c1.disconnect();
    c2.disconnect();
    c3.disconnect();
    await new Promise((r) => setTimeout(r, 200));

    // -------------------------------------------------------------
    // TEST 2: Host Extra Powers in Group Meeting
    // -------------------------------------------------------------
    console.log("\n--- TEST 2: Host Extra Powers & Administrative Controls ---");
    const groupRoom = "grp-test-powers-room";

    const host = createClient();
    const guest = createClient();

    await new Promise((resolve) => host.on('connect', resolve));
    await new Promise((resolve) => guest.on('connect', resolve));

    // Join room
    await new Promise((resolve) => {
        host.on('user-joined', (id) => { if (id === host.id) resolve(); });
        host.emit('join-call', groupRoom, 'HostMaster');
    });

    await new Promise((resolve) => {
        guest.on('user-joined', (id) => { if (id === guest.id) resolve(); });
        guest.emit('join-call', groupRoom, 'GuestUser');
    });
    console.log("  [PASS] Host and Guest successfully joined group room");

    // 2A: Host toggles Screen Share Permission
    const screenPermissionPromise = new Promise((resolve) => {
        guest.on('permissions-changed', (perms) => {
            if (perms.allowScreenShare === false) {
                resolve();
            }
        });
    });
    host.emit('toggle-screen-share-permission', false);
    await screenPermissionPromise;
    console.log("  [PASS] Host disabled screen sharing -> Guest received permissions-changed (allowScreenShare: false)");

    // 2B: Host toggles Chat Permission and Non-Host Chat is Blocked
    const chatPermissionPromise = new Promise((resolve) => {
        guest.on('permissions-changed', (perms) => {
            if (perms.allowChat === false) {
                resolve();
            }
        });
    });
    host.emit('toggle-chat-permission', false);
    await chatPermissionPromise;
    console.log("  [PASS] Host disabled chat -> Guest received permissions-changed (allowChat: false)");

    // Guest attempts to chat while disabled -> Expect chat-error
    const chatErrorPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Timeout waiting for chat-error")), 3000);
        guest.on('chat-error', (msg) => {
            clearTimeout(timeout);
            assert.ok(msg.includes("disabled by the meeting host"), "Error must state host disabled chat");
            resolve();
        });
        guest.on('chat-message', () => {
            clearTimeout(timeout);
            reject(new Error("Chat should NOT have been broadcast when disabled!"));
        });
    });
    guest.emit('chat-message', 'Hello while locked', 'GuestUser');
    await chatErrorPromise;
    console.log("  [PASS] Non-host chat message blocked by backend when allowChat is false");

    // 2C: Host force turns off participant camera
    const forceVideoPromise = new Promise((resolve) => {
        guest.on('force-video-off', (info) => {
            assert.strictEqual(info.requestedBy, 'HostMaster');
            resolve();
        });
    });
    host.emit('force-stop-video', guest.id);
    await forceVideoPromise;
    console.log("  [PASS] Host forced video off for Guest -> Guest received force-video-off");

    // 2D: Host terminates meeting for all participants
    const endMeetingPromise = new Promise((resolve) => {
        guest.on('meeting-ended-by-host', (info) => {
            assert.strictEqual(info.hostName, 'HostMaster');
            assert.ok(info.message.includes("ended this meeting"), "Must contain termination message");
            resolve();
        });
    });
    host.emit('end-meeting-for-all');
    await endMeetingPromise;
    console.log("  [PASS] Host ended meeting for all -> All participants received meeting-ended-by-host");

    host.disconnect();
    guest.disconnect();
    server.close();

    console.log("\n=============================================================");
    console.log(">>> ALL 7 PRIVATE CALL & HOST CONTROL TESTS PASSED (100%) <<<");
    console.log("=============================================================\n");
    process.exit(0);
} catch (err) {
    console.error("\n[FAIL] Test assertion error:", err);
    server.close();
    process.exit(1);
}
