import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';

interface ReadPayload {
  conversationId: string;
  messageId: string;
}

export function registerReadReceiptHandlers(
  io: Server,
  socket: Socket,
  prisma: PrismaClient
): void {
  const userId = socket.data.userId as string;

  socket.on('dm:read', async (payload: ReadPayload) => {
    try {
      if (!payload.conversationId || !payload.messageId) {
        return;
      }

      // Verify user is participant
      const conversation = await prisma.directConversation.findUnique({
        where: { id: payload.conversationId },
      });

      if (!conversation) {
        return;
      }

      if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
        return;
      }

      // Update read receipt
      await prisma.directMessageReadReceipt.upsert({
        where: {
          conversationId_userId: {
            conversationId: payload.conversationId,
            userId,
          },
        },
        update: {
          lastReadAt: new Date(),
          lastReadMessageId: payload.messageId,
        },
        create: {
          conversationId: payload.conversationId,
          userId,
          lastReadAt: new Date(),
          lastReadMessageId: payload.messageId,
        },
      });

      // Get the other participant
      const recipientId =
        conversation.participant1Id === userId
          ? conversation.participant2Id
          : conversation.participant1Id;

      // Notify other participant of read receipt
      io.to(`user:${recipientId}`).emit('dm:read:receipt', {
        conversationId: payload.conversationId,
        readerId: userId,
        messageId: payload.messageId,
        readAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating read receipt:', error);
    }
  });
}
