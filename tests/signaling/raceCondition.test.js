import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startSignalingTestServer } from './setupSocketServer.js';

describe('Signaling Layer: Private 1-on-1 Room Concurrency & Race Condition Elimination', () => {
  let signaling;

  beforeAll(async () => {
    signaling = await startSignalingTestServer();
  });

  afterAll(async () => {
    await signaling.teardown();
  });

  it('atomically admits exactly 2 participants and rejects 8 simultaneous joiners across 20 concurrency rounds', async () => {
    const ROUNDS = 20;

    for (let round = 1; round <= ROUNDS; round++) {
      // Use valid unambiguous alphabet [2-9a-km-z] (no 0, 1, o, l)
      const validSuffix = ['bcde', 'fghj', 'kmno', 'pqrs', 'tuvw', 'xyza', '2345', '6789', 'cdef', 'ghjk', 'mnpq', 'rstu', 'vwxy', 'za23', '4567', '89bc', 'defg', 'hjkm', 'npqr', 'stuv'][round - 1];
      const privateRoom = `p-race-${validSuffix}-2345`;
      const numJoiners = 10;
      const clients = await Promise.all(
        Array.from({ length: numJoiners }, () => signaling.createClient())
      );

      let admittedCount = 0;
      let rejectedCount = 0;

      const outcomes = await Promise.all(
        clients.map((client, idx) => {
          return new Promise((resolve) => {
            let settled = false;

            client.once('user-joined', () => {
              if (!settled) {
                settled = true;
                admittedCount++;
                resolve('admitted');
              }
            });

            client.once('room-full', () => {
              if (!settled) {
                settled = true;
                rejectedCount++;
                resolve('rejected');
              }
            });

            client.once('join-error', (err) => {
              if (!settled) {
                settled = true;
                resolve(`error: ${err.message}`);
              }
            });

            client.emit('join-call', privateRoom, `Concurrent_${idx}`, null, null);
          });
        })
      );

      expect(admittedCount).toBe(2);
      expect(rejectedCount).toBe(8);
      expect(outcomes.filter(o => o === 'admitted').length).toBe(2);
      expect(outcomes.filter(o => o === 'rejected').length).toBe(8);

      for (const c of clients) c.disconnect();
    }
  }, 30000);
});
