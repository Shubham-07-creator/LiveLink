import mongoose from 'mongoose';
import net from 'node:net';

let mongoServer;
let isUsingMemoryServer = false;

const isPortOpen = (port, host = '127.0.0.1', timeout = 500) => {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let status = false;

    socket.setTimeout(timeout);
    socket.once('connect', () => {
      status = true;
      socket.end();
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('close', () => {
      resolve(status);
    });

    socket.connect(port, host);
  });
};

export const connectTestDb = async () => {
  process.env.NODE_ENV = 'test';
  process.env.CLIENT_URLS = 'http://localhost:3000,http://127.0.0.1:3000';
  process.env.JWT_SECRET = 'test-jwt-secret-key-32-chars-minimum-safe';
  process.env.REFRESH_TOKEN_SECRET = 'test-refresh-token-secret-key-safe-32';

  let uri;
  const localMongoAvailable = await isPortOpen(27017, '127.0.0.1');

  if (localMongoAvailable) {
    const dbName = `livelink_test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    uri = `mongodb://127.0.0.1:27017/${dbName}`;
  } else {
    // Fall back to MongoMemoryServer
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    mongoServer = await MongoMemoryServer.create();
    uri = mongoServer.getUri();
    isUsingMemoryServer = true;
  }

  process.env.MONGO_URI = uri;

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  await mongoose.connect(uri);
  return uri;
};

export const clearTestDb = async () => {
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  }
};

export const closeTestDb = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
  if (isUsingMemoryServer && mongoServer) {
    await mongoServer.stop();
  }
};
