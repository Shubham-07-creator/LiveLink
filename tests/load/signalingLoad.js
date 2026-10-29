import { startSignalingTestServer } from '../signaling/setupSocketServer.js';

async function runSignalingLoadTest() {
  console.log('=== [Layer 6: Signaling Stress & Load Test] ===');
  const signaling = await startSignalingTestServer();

  const TOTAL_CLIENTS = 150;
  const CONCURRENCY_BATCH = 15;
  const latencies = [];
  let successfulConnections = 0;
  let failedConnections = 0;

  const startTime = Date.now();
  console.log(`Ramping up ${TOTAL_CLIENTS} socket connections against ${signaling.serverUrl}...`);

  for (let batch = 0; batch < TOTAL_CLIENTS / CONCURRENCY_BATCH; batch++) {
    const promises = Array.from({ length: CONCURRENCY_BATCH }, async (_, idx) => {
      const clientIndex = batch * CONCURRENCY_BATCH + idx;
      // Valid unambiguous alphabet [2-9a-km-z]
      const validSuffixes = ['2345', '3456', '4567', '5678', '6789', '7892', '8923', '9234', 'bcde', 'fghj'];
      const room = `kmpq-wxyz-${validSuffixes[clientIndex % validSuffixes.length]}`;
      const connectStart = Date.now();

      try {
        const client = await signaling.createClient();
        const latency = Date.now() - connectStart;
        latencies.push(latency);

        const joinedPromise = new Promise((resolve, reject) => {
          client.once('user-joined', resolve);
          client.once('room-full', resolve);
          client.once('join-error', reject);
        });

        client.emit('join-call', room, `LoadUser_${clientIndex}`, null, null);
        await joinedPromise;

        successfulConnections++;
        return client;
      } catch (err) {
        failedConnections++;
        return null;
      }
    });

    await Promise.all(promises);
    // Yield brief tick between batches to measure sustained throughput
    await new Promise((r) => setTimeout(r, 50));
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  latencies.sort((a, b) => a - b);

  const p50 = latencies[Math.floor(latencies.length * 0.50)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const errorRate = ((failedConnections / TOTAL_CLIENTS) * 100).toFixed(2);

  const memoryUsageMB = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);

  console.log(`\n--- Load Test Results ---`);
  console.log(`Total Connections Attempted: ${TOTAL_CLIENTS}`);
  console.log(`Successful Connections:       ${successfulConnections}`);
  console.log(`Failed Connections:           ${failedConnections}`);
  console.log(`Error Rate:                   ${errorRate}%`);
  console.log(`Duration:                     ${durationSec}s`);
  console.log(`Latency p50:                  ${p50}ms`);
  console.log(`Latency p95:                  ${p95}ms`);
  console.log(`Latency p99:                  ${p99}ms`);
  console.log(`Heap Memory:                  ${memoryUsageMB} MB`);

  await signaling.teardown();

  if (Number(errorRate) > 1.0) {
    console.error(`FAILED: Error rate ${errorRate}% exceeds 1% threshold.`);
    process.exit(1);
  }

  if (p95 > 500) {
    console.error(`FAILED: p95 latency ${p95}ms exceeds 500ms threshold.`);
    process.exit(1);
  }

  console.log(`\nSUCCESS: Load test passed all SLA thresholds!\n`);
  process.exit(0);
}

runSignalingLoadTest().catch((err) => {
  console.error('Unexpected Load Test Error:', err);
  process.exit(1);
});
