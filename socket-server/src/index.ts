import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from './auth.js';
import { registerMessageHandlers } from './handlers/message.js';
import { registerTypingHandlers } from './handlers/typing.js';
import { registerPresenceHandlers } from './handlers/presence.js';
import { registerReadReceiptHandlers } from './handlers/read.js';

const prisma = new PrismaClient();
const httpServer = createServer();

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Authentication middleware
io.use((socket, next) => authMiddleware(socket, next, prisma));

// Connection handler
io.on('connection', async (socket: Socket) => {
  const userId = socket.data.userId as string;

  // Log all connected users for debugging
  const allRooms = [...io.sockets.adapter.rooms.keys()].filter((r) => r.startsWith('user:'));
  console.log(`[CONNECT] User: ${userId} | Socket: ${socket.id} | Transport: ${socket.conn.transport.name}`);
  console.log(`[CONNECT] Total connected user rooms: ${allRooms.length} → ${allRooms.join(', ')}`);

  // Join user's personal room for targeted events
  socket.join(`user:${userId}`);

  // Register event handlers
  registerMessageHandlers(io, socket, prisma);
  registerTypingHandlers(io, socket, prisma);
  registerPresenceHandlers(io, socket, prisma);
  registerReadReceiptHandlers(io, socket, prisma);

  // Handle disconnect
  socket.on('disconnect', async (reason) => {
    console.log(`[DISCONNECT] User: ${userId} | Socket: ${socket.id} | Reason: ${reason}`);

    try {
      // Check if user has other active sockets (e.g. multiple tabs)
      const userRoom = io.sockets.adapter.rooms.get(`user:${userId}`);
      if (userRoom && userRoom.size > 0) {
        console.log(`[DISCONNECT] User ${userId} still has ${userRoom.size} active socket(s), keeping ONLINE`);
        return;
      }

      await prisma.userPresence.upsert({
        where: { userId },
        update: { status: 'OFFLINE', lastSeenAt: new Date(), socketId: null },
        create: { userId, status: 'OFFLINE', lastSeenAt: new Date() },
      });

      // Notify subscribers of offline status
      io.to(`presence:${userId}`).emit('presence:update', {
        userId,
        status: 'OFFLINE',
        lastSeenAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating presence on disconnect:', error);
    }
  });
});

const PORT = process.env.SOCKET_PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
  console.log(`Accepting connections from: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  await prisma.$disconnect();
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
