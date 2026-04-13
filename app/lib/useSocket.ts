import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';

let socket: Socket | null = null;

export function useSocket(userId?: string) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!userId) return;

    if (!socketRef.current) {
      socket = io(SOCKET_SERVER_URL, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('Connected to WebSocket');
        socket!.emit('register-user', userId);
      });

      socket.on('disconnect', () => {
        console.log('Disconnected from WebSocket');
      });

      socket.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
        socket = null;
      }
    };
  }, [userId]);

  const on = useCallback(
    (event: string, callback: (data: any) => void) => {
      if (socketRef.current) {
        socketRef.current.on(event, callback);
      }
    },
    [],
  );

  const off = useCallback(
    (event: string, callback?: (data: any) => void) => {
      if (socketRef.current) {
        if (callback) {
          socketRef.current.off(event, callback);
        } else {
          socketRef.current.off(event);
        }
      }
    },
    [],
  );

  const emit = useCallback(
    (event: string, data?: any) => {
      if (socketRef.current) {
        socketRef.current.emit(event, data);
      }
    },
    [],
  );

  return { on, off, emit, socket: socketRef.current };
}
