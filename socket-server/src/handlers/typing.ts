import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';

export function registerTypingHandlers(io: Server, socket: Socket, prisma: PrismaClient): void {
  const userId = socket.data.userId as string;

  // Helper: get the other participant's ID for a conversation
  async function getRecipientId(conversationId: string): Promise<string | null> {
    try {
      const conversation = await prisma.directConversation.findUnique({
        where: { id: conversationId },
        select: { participant1Id: true, participant2Id: true },
      });
      if (!conversation) return null;
      if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) return null;
      return conversation.participant1Id === userId
        ? conversation.participant2Id
        : conversation.participant1Id;
    } catch {
      return null;
    }
  }

  // Start typing indicator — send only to the other participant
  socket.on('dm:typing:start', async (conversationId: string) => {
    const recipientId = await getRecipientId(conversationId);
    if (!recipientId) return;
    io.to(`user:${recipientId}`).emit('dm:typing', {
      conversationId,
      userId,
      isTyping: true,
    });
  });

  // Stop typing indicator
  socket.on('dm:typing:stop', async (conversationId: string) => {
    const recipientId = await getRecipientId(conversationId);
    if (!recipientId) return;
    io.to(`user:${recipientId}`).emit('dm:typing', {
      conversationId,
      userId,
      isTyping: false,
    });
  });
}
