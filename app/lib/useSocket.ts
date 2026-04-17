'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

type SocketLike = {
  connected: boolean;
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback?: (...args: any[]) => void) => void;
  emit: (event: string, data?: any) => void;
  disconnect: () => void;
  io: {
    on: (event: string, callback: (...args: any[]) => void) => void;
  };
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const inferredSocketUrl = apiUrl.replace(/\/api\/?$/, '');
const SOCKET_SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_URL || inferredSocketUrl;

let sharedSocket: SocketLike | null = null;
let activeSubscribers = 0;
let status: 'connected' | 'reconnecting' | 'disconnected' = 'disconnected';
let onlineDeliveryPeople = 0;

const statusSubscribers = new Set<(value: 'connected' | 'reconnecting' | 'disconnected') => void>();
const onlineSubscribers = new Set<(count: number) => void>();

function notifyStatus(next: 'connected' | 'reconnecting' | 'disconnected') {
  status = next;
  statusSubscribers.forEach((fn) => fn(next));
}

function notifyOnline(count: number) {
  onlineDeliveryPeople = count;
  onlineSubscribers.forEach((fn) => fn(count));
}

export function useSocket(userId?: string, role?: string) {
  const socketRef = useRef<SocketLike | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'reconnecting' | 'disconnected'
  >(status);
  const [onlineCount, setOnlineCount] = useState<number>(onlineDeliveryPeople);

  useEffect(() => {
    if (!userId) return;

    if (typeof window === 'undefined') {
      return;
    }

    let cancelled = false;
    let onConnect: (() => void) | null = null;
    let onStatus: ((next: 'connected' | 'reconnecting' | 'disconnected') => void) | null = null;
    let onOnline: ((count: number) => void) | null = null;

    activeSubscribers += 1;

    const initSocket = async () => {
      const { io } = await import('socket.io-client');
      if (cancelled) {
        return;
      }

      if (!sharedSocket) {
        sharedSocket = io(SOCKET_SERVER_URL, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: Infinity,
          auth: (cb) => {
            const token =
              typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
            cb(token ? { token } : {});
          },
        }) as SocketLike;

        sharedSocket.on('connect', () => {
          notifyStatus('connected');
        });

        sharedSocket.on('disconnect', () => {
          notifyStatus('disconnected');
        });

        sharedSocket.io.on('reconnect_attempt', () => {
          notifyStatus('reconnecting');
        });

        sharedSocket.on('delivery_people_online', (payload: { count: number }) => {
          notifyOnline(payload?.count ?? 0);
        });

        sharedSocket.on('error', (error) => {
          console.error('WebSocket error:', error);
        });

        sharedSocket.on('connect_error', (error) => {
          console.error('Socket.IO connect_error:', error);
        });
      }

      socketRef.current = sharedSocket;

      if (sharedSocket.connected) {
        sharedSocket.emit('register-user', { userId, role });
      }

      onConnect = () => {
        sharedSocket?.emit('register-user', { userId, role });
      };

      onStatus = (next: 'connected' | 'reconnecting' | 'disconnected') => {
        setConnectionStatus(next);
      };

      onOnline = (count: number) => {
        setOnlineCount(count);
      };

      sharedSocket.on('connect', onConnect);
      statusSubscribers.add(onStatus);
      onlineSubscribers.add(onOnline);
    };

    void initSocket();

    return () => {
      cancelled = true;

      if (sharedSocket) {
        if (onConnect) {
          sharedSocket.off('connect', onConnect);
        }
      }

      if (onStatus) {
        statusSubscribers.delete(onStatus);
      }

      if (onOnline) {
        onlineSubscribers.delete(onOnline);
      }

      activeSubscribers -= 1;
      if (activeSubscribers <= 0 && sharedSocket) {
        sharedSocket.disconnect();
        sharedSocket = null;
        notifyStatus('disconnected');
        notifyOnline(0);
      }

      socketRef.current = null;
    };
  }, [userId, role]);

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

  return {
    on,
    off,
    emit,
    socket: socketRef.current,
    connectionStatus,
    onlineDeliveryPeople: onlineCount,
  };
}
