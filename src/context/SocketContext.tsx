'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
  useState,
  useMemo,
  ReactNode,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/context/AuthContext';
import type { SocketConnectionState } from '@/types/dm';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

interface SocketContextValue {
  connectionState: SocketConnectionState;
  isConnected: boolean;
  /** Increments each time the socket (re)connects. Use in effect deps to re-register listeners. */
  connectCount: number;
  emit: (event: string, ...args: unknown[]) => boolean;
  on: (event: string, handler: (...args: unknown[]) => void) => () => void;
  off: (event: string, handler?: (...args: unknown[]) => void) => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const [connectionState, setConnectionState] = useState<SocketConnectionState>('disconnected');
  const [connectCount, setConnectCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const { isAuthenticated, user } = useAuth();
  const userId = user?.id ?? '';

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      if (socketRef.current) {
        console.log('[Socket] Auth lost, disconnecting');
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setConnectionState('disconnected');
      return;
    }

    // If we already have a live socket, skip
    if (socketRef.current && (socketRef.current.connected || socketRef.current.active)) {
      return;
    }

    // Clean up dead socket if any
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    console.log('[Socket] Creating connection for user:', userId);
    setConnectionState('connecting');

    const socket = io(SOCKET_URL, {
      auth: { userId },
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      timeout: 20000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id, '| user:', userId);
      setConnectionState('connected');
      setConnectCount((c) => c + 1);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setConnectionState('disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
      setConnectionState('error');
    });

    // Note: Socket.IO fires 'connect' on both initial connect AND reconnect,
    // so we don't need a separate 'reconnect' handler (which caused double
    // connectCount increments and 2x listener accumulation per reconnect).

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('[Socket] Reconnection attempt:', attemptNumber);
      setConnectionState('connecting');
    });

    return () => {
      console.log('[Socket] Cleanup for user:', userId);
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, userId]);

  /**
   * Emit an event. Returns true if sent, false if socket not connected.
   * Supports any number of args: emit('event', data) or emit('event', data, callback)
   */
  const emit = useCallback((event: string, ...args: unknown[]): boolean => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) {
      console.error(
        `[Socket] EMIT FAILED for "${event}" — connected: ${socket?.connected ?? 'no socket'}, id: ${socket?.id ?? 'none'}`
      );
      return false;
    }
    socket.emit(event, ...args);
    return true;
  }, []);

  /**
   * Register a listener. Returns unsubscribe function.
   * Reads socketRef at call time — call this from effects that depend on connectCount or isConnected.
   */
  const on = useCallback((event: string, handler: (...args: unknown[]) => void): (() => void) => {
    const socket = socketRef.current;
    if (!socket) {
      console.warn(`[Socket] Cannot register "${event}" — no socket`);
      return () => {};
    }
    // Defensively remove this exact handler first to prevent accumulation
    // in case a previous cleanup was missed (e.g. during reconnect races).
    socket.off(event, handler);
    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
  }, []);

  const off = useCallback((event: string, handler?: (...args: unknown[]) => void) => {
    const socket = socketRef.current;
    if (!socket) return;
    if (handler) {
      socket.off(event, handler);
    } else {
      socket.off(event);
    }
  }, []);

  const isConnected = connectionState === 'connected';

  const value = useMemo(
    () => ({
      connectionState,
      isConnected,
      connectCount,
      emit,
      on,
      off,
    }),
    [connectionState, isConnected, connectCount, emit, on, off]
  );

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

const DISCONNECTED_DEFAULT: SocketContextValue = {
  connectionState: 'disconnected',
  isConnected: false,
  connectCount: 0,
  emit: () => false,
  on: () => () => {},
  off: () => {},
};

export function useSocket(): SocketContextValue {
  const context = useContext(SocketContext);
  // Return a safe disconnected default when used outside SocketProvider
  // (e.g. pages that don't load the lazy SocketProvider yet).
  return context ?? DISCONNECTED_DEFAULT;
}
