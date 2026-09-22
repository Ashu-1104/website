'use client';

// Re-export useSocket from the SocketProvider context
// This ensures a single shared socket instance across all components
export { useSocket } from '@/context/SocketContext';
