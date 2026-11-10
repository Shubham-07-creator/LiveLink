import mongoose from 'mongoose';
import net from 'node:net';
import { MongoMemoryServer } from 'mongodb-memory-server';

process.env.NODE_ENV = 'test';
process.env.PORT = process.env.PORT || '8000';
process.env.CLIENT_URLS = process.env.CLIENT_URLS || 'http://localhost:3000,http://127.0.0.1:3000';
process.env.JWT_SECRET = 'test-jwt-secret-key-32-chars-minimum-safe';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-token-secret-key-safe-32';
process.env.RUN_SERVER = 'false';

let mongoServer;

const isPortOpen = (port, host = '127.0.0.1', timeout = 500) => {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let status = false;
    socket.setTimeout(timeout);
    socket.once('connect', () => { status = true; socket.end(); });
    socket.once('timeout', () => { socket.destroy(); resolve(false); });
    socket.once('error', () => { socket.destroy(); resolve(false); });
    socket.once('close', () => { resolve(status); });
    socket.connect(port, host);
  });
};

let uri;
const localMongoAvailable = await isPortOpen(27017, '127.0.0.1');

if (localMongoAvailable) {
  const dbName = `livelink_test_${Date.now()}`;
  uri = `mongodb://127.0.0.1:27017/${dbName}`;
} else {
  mongoServer = await MongoMemoryServer.create();
  uri = mongoServer.getUri();
}

process.env.MONGO_URI = uri;

if (mongoose.connection.readyState !== 0) {
  await mongoose.disconnect();
}
await mongoose.connect(uri);
console.log(`[Test Backend] Connected to in-memory/test MongoDB at: ${uri}`);

const { server } = await import('./src/app.js');

const port = Number(process.env.PORT) || 8000;
server.listen(port, () => {
  console.log(`[Test Backend] LiveLink Test Backend running on http://localhost:${port}`);
});

const cleanup = async () => {
  console.log('[Test Backend] Shutting down cleanly...');
  try {
    server.close();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
    process.exit(0);
  } catch (err) {
    process.exit(1);
  }
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
