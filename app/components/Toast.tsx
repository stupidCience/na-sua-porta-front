'use client';

import React, { useEffect, useState } from 'react';
import { create } from 'zustand';
import type { LucideIcon } from 'lucide-react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

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
  success: 'border-[rgba(26,166,75,0.18)] bg-white text-[var(--color-primary-dark)] shadow-[0_22px_40px_rgba(26,166,75,0.14)]',
  error: 'border-red-200 bg-white text-red-900 shadow-[0_22px_40px_rgba(185,28,28,0.12)]',
  info: 'border-[var(--color-line)] bg-white text-[var(--color-secondary)] shadow-[0_22px_40px_rgba(28,25,23,0.08)]',
  warning: 'border-[rgba(243,183,27,0.35)] bg-white text-[var(--color-secondary)] shadow-[0_22px_40px_rgba(243,183,27,0.14)]',
};

const typeIcons: Record<ToastType, LucideIcon> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

function ToastItem({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  const [visible, setVisible] = useState(false);
  const Icon = typeIcons[toast.type];

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3'
      } ${typeStyles[toast.type]}`}
    >
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-background-soft)] text-current">
        <Icon className="h-4.5 w-4.5" />
      </span>
      <p className="flex-1 text-sm font-medium leading-6">{toast.message}</p>
      <button onClick={onClose} className="rounded-full p-1 text-current/55 transition hover:bg-black/5 hover:text-current">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-4 top-4 z-50 flex w-auto flex-col gap-2 left-4 sm:left-auto sm:max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}
