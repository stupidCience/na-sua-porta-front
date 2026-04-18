'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

type SocketEventCallback = (...args: unknown[]) => void;

type SocketErrorDetails = {
  message?: string;
  description?: string;
  type?: string;
  context?: unknown;
};

type SocketLike = {
  connected: boolean;
  on: (event: string, callback: SocketEventCallback) => void;
  off: (event: string, callback?: SocketEventCallback) => void;
  emit: (event: string, data?: unknown) => void;
  disconnect: () => void;
  io: {
    on: (event: string, callback: SocketEventCallback) => void;
  };
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const inferredSocketUrl = apiUrl.replace(/\/api\/?$/, '');
const SOCKET_SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_URL || inferredSocketUrl;
const SOCKET_PATH = process.env.NEXT_PUBLIC_SOCKET_PATH || '/socket.io';

let sharedSocket: SocketLike | null = null;
let activeSubscribers = 0;
let status: 'connected' | 'reconnecting' | 'disconnected' = 'disconnected';
let onlineDeliveryPeople = 0;
const eventSubscribers = new Map<string, Set<SocketEventCallback>>();

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

function attachEventSubscribers(socket: SocketLike) {
  eventSubscribers.forEach((callbacks, event) => {
    callbacks.forEach((callback) => {
      socket.on(event, callback);
    });
  });
}

export function useSocket(userId?: string, role?: string, condominiumId?: string) {
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
        console.info('[Socket.IO] Connecting to', SOCKET_SERVER_URL, '| path:', SOCKET_PATH);

        sharedSocket = io(SOCKET_SERVER_URL, {
          path: SOCKET_PATH,
          transports: ['polling', 'websocket'],
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
          console.info('[Socket.IO] Connected successfully to', SOCKET_SERVER_URL);
          notifyStatus('connected');
        });

        sharedSocket.on('disconnect', () => {
          notifyStatus('disconnected');
        });

        sharedSocket.io.on('reconnect_attempt', () => {
          notifyStatus('reconnecting');
        });

        sharedSocket.on('delivery_people_online', (payload) => {
          const nextCount =
            typeof payload === 'object' &&
            payload !== null &&
            'count' in payload &&
            typeof payload.count === 'number'
              ? payload.count
              : 0;

          notifyOnline(nextCount);
        });

        sharedSocket.on('error', (error) => {
          console.error('[Socket.IO] WebSocket error:', error);
        });

        sharedSocket.on('connect_error', (error: unknown) => {
          const socketError =
            typeof error === 'object' && error !== null ? (error as SocketErrorDetails) : {};

          console.error(
            '[Socket.IO] connect_error\n',
            '  url:', SOCKET_SERVER_URL,
            '\n  path:', SOCKET_PATH,
            '\n  message:', socketError.message,
            '\n  description:', socketError.description,
            '\n  type:', socketError.type,
            '\n  context:', socketError.context,
          );
        });

        attachEventSubscribers(sharedSocket);
      }

      socketRef.current = sharedSocket;

      if (sharedSocket.connected) {
        sharedSocket.emit('register-user', { userId, role, condominiumId });
      }

      onConnect = () => {
        sharedSocket?.emit('register-user', { userId, role, condominiumId });
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
  }, [userId, role, condominiumId]);

  const on = useCallback(
    <T = unknown>(event: string, callback: (data: T) => void) => {
      const handler = callback as unknown as SocketEventCallback;
      const callbacks = eventSubscribers.get(event) ?? new Set<SocketEventCallback>();
      callbacks.add(handler);
      eventSubscribers.set(event, callbacks);

      if (socketRef.current) {
        socketRef.current.on(event, handler);
      }
    },
    [],
  );

  const off = useCallback(
    <T = unknown>(event: string, callback?: (data: T) => void) => {
      if (callback) {
        const handler = callback as unknown as SocketEventCallback;
        const callbacks = eventSubscribers.get(event);
        callbacks?.delete(handler);
        if (callbacks && callbacks.size === 0) {
          eventSubscribers.delete(event);
        }
      } else {
        eventSubscribers.delete(event);
      }

      if (socketRef.current) {
        if (callback) {
          socketRef.current.off(event, callback as unknown as SocketEventCallback);
        } else {
          socketRef.current.off(event);
        }
      }
    },
    [],
  );

  const emit = useCallback(
    (event: string, data?: unknown) => {
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
