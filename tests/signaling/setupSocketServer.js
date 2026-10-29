import { createServer } from 'node:http';
import express from 'express';
import { io as ClientIO } from 'socket.io-client';
import { connectToSocket } from '../../backend/src/controllers/socketManager.js';

export const startSignalingTestServer = async () => {
  process.env.NODE_ENV = 'test';
  process.env.CLIENT_URLS = 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:*';

  const app = express();
  const server = createServer(app);
  const io = connectToSocket(server);

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve();
    });
  });

  const port = server.address().port;
  const serverUrl = `http://127.0.0.1:${port}`;

  const activeClients = [];

  const createClient = (options = {}) => {
    return new Promise((resolve, reject) => {
      const client = ClientIO(serverUrl, {
        transports: ['websocket'],
        forceNew: true,
        reconnection: false,
        timeout: 3000,
        ...options
      });

      client.on('connect', () => {
        activeClients.push(client);
        resolve(client);
      });

      client.on('connect_error', (err) => {
        reject(err);
      });
    });
  };

  const waitForEvent = (socket, eventName, timeout = 2500) => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for socket event: "${eventName}" after ${timeout}ms`));
      }, timeout);

      socket.once(eventName, (...args) => {
        clearTimeout(timer);
        resolve(args.length === 1 ? args[0] : args);
      });
    });
  };

  const teardown = async () => {
    for (const c of activeClients) {
      if (c.connected) {
        c.disconnect();
      }
    }
    io.close();
    await new Promise((resolve) => server.close(resolve));
  };

  return {
    server,
    io,
    port,
    serverUrl,
    createClient,
    waitForEvent,
    teardown
  };
};
