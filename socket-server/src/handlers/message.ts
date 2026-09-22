import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';

interface SendMessagePayload {
  conversationId?: string;
  recipientId?: string; // For new conversations
  content: string;
  tempId?: string; // Client-side temp ID for optimistic updates
}

interface MessageResponse {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    handle: string | null;
    avatarUrl: string | null;
  };
  tempId?: string;
}

interface CallbackResponse {
  success?: boolean;
  error?: string;
  message?: MessageResponse;
  conversationId?: string;
}

export function registerMessageHandlers(
  io: Server,
  socket: Socket,
  prisma: PrismaClient
): void {
  const userId = socket.data.userId as string;

  console.log(`[MSG] Registered dm:send handler for user: ${userId} on socket: ${socket.id}`);

  // Send a new message
  socket.on(
    'dm:send',
    async (payload: SendMessagePayload, callback: (response: CallbackResponse) => void) => {
      console.log(`[DM:SEND] Received from user: ${userId} | payload:`, JSON.stringify(payload));
      try {
        let conversationId = payload.conversationId;
        let recipientId = payload.recipientId;

        if (!payload.content?.trim()) {
          return callback({ error: 'Message content is required' });
        }

        // If no conversationId, find or create conversation
        if (!conversationId && recipientId) {
          // Check for blocked users
          const blocked = await prisma.userBlock.findFirst({
            where: {
              OR: [
                { blockerId: userId, blockedId: recipientId },
                { blockerId: recipientId, blockedId: userId },
              ],
            },
          });

          if (blocked) {
            return callback({ error: 'Cannot message this user' });
          }

          // Find or create conversation (order participants consistently)
          const [p1, p2] = [userId, recipientId].sort();

          let conversation = await prisma.directConversation.findUnique({
            where: {
              participant1Id_participant2Id: { participant1Id: p1, participant2Id: p2 },
            },
          });

          if (!conversation) {
            conversation = await prisma.directConversation.create({
              data: { participant1Id: p1, participant2Id: p2 },
            });
          }

          conversationId = conversation.id;
          recipientId = userId === p1 ? p2 : p1;
        }

        if (!conversationId) {
          return callback({ error: 'Conversation ID or recipient ID is required' });
        }

        // Get conversation and verify access
        const conversation = await prisma.directConversation.findUnique({
          where: { id: conversationId },
        });

        if (!conversation) {
          return callback({ error: 'Conversation not found' });
        }

        // Verify user is participant
        if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
          return callback({ error: 'Access denied' });
        }

        recipientId =
          conversation.participant1Id === userId
            ? conversation.participant2Id
            : conversation.participant1Id;

        // Create message
        const message = await prisma.directMessage.create({
          data: {
            conversationId,
            senderId: userId,
            content: payload.content.trim(),
          },
          include: {
            sender: {
              select: { id: true, handle: true, avatarUrl: true },
            },
          },
        });

        // Update conversation's lastMessage fields
        await prisma.directConversation.update({
          where: { id: conversationId },
          data: {
            lastMessageAt: message.createdAt,
            lastMessagePreview: payload.content.trim().substring(0, 100),
          },
        });

        const messageResponse: MessageResponse = {
          id: message.id,
          conversationId: message.conversationId,
          senderId: message.senderId,
          content: message.content,
          createdAt: message.createdAt.toISOString(),
          sender: message.sender,
          tempId: payload.tempId,
        };

        // Send to recipient's personal room (all their tabs/devices)
        const recipientRoom = io.sockets.adapter.rooms.get(`user:${recipientId}`);
        const senderRoom = io.sockets.adapter.rooms.get(`user:${userId}`);
        console.log(`[DM] Message from ${userId} to ${recipientId}`);
        console.log(`[DM]   Room user:${recipientId} has ${recipientRoom?.size ?? 0} socket(s)`);
        console.log(`[DM]   Room user:${userId} (sender) has ${senderRoom?.size ?? 0} socket(s)`);

        // Send to recipient if online
        io.to(`user:${recipientId}`).emit('dm:new', messageResponse);

        // Also send to sender's other tabs (excluding the socket that sent this message)
        socket.to(`user:${userId}`).emit('dm:new', messageResponse);

        // Acknowledge to sender
        callback({ success: true, message: messageResponse, conversationId });
      } catch (error) {
        console.error('Error sending message:', error);
        callback({ error: 'Failed to send message' });
      }
    }
  );

  // Join a per-user conversation room (isolated: only this user's sockets)
  socket.on('dm:join', async (conversationId: string) => {
    try {
      // Verify access
      const conversation = await prisma.directConversation.findUnique({
        where: { id: conversationId },
      });

      if (
        conversation &&
        (conversation.participant1Id === userId || conversation.participant2Id === userId)
      ) {
        // Use per-user room so participants are isolated from each other
        socket.join(`conversation:${conversationId}:user:${userId}`);
        console.log(`User ${userId} joined conversation ${conversationId} (isolated room)`);
      }
    } catch (error) {
      console.error('Error joining conversation:', error);
    }
  });

  // Leave conversation room
  socket.on('dm:leave', (conversationId: string) => {
    socket.leave(`conversation:${conversationId}:user:${userId}`);
    console.log(`User ${userId} left conversation ${conversationId}`);
  });
}
