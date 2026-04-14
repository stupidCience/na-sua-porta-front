'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { create } from 'zustand';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastStore {
  toasts: ToastItem[];
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

let toastIdCounter = 0;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (message, type = 'info') => {
    const id = `toast-${++toastIdCounter}`;
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 4000);
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

const typeStyles: Record<ToastType, string> = {
  success: 'bg-emerald-50 border-emerald-500 text-emerald-900',
  error: 'bg-red-50 border-red-500 text-red-900',
  info: 'bg-black border-black text-amber-300',
  warning: 'bg-amber-50 border-amber-500 text-amber-900',
};

const typeIcons: Record<ToastType, string> = {
  success: '✅',
  error: '❌',
  info: 'ℹ️',
  warning: '⚠️',
};

function ToastItem({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 shadow-xl transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3'
      } ${typeStyles[toast.type]}`}
    >
      <span className="text-lg">{typeIcons[toast.type]}</span>
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button onClick={onClose} className="text-current/60 hover:text-current text-lg leading-none">
        &times;
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}
