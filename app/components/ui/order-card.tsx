'use client';

import React from 'react';
import clsx from 'clsx';
import { MapPin, Phone, Store, Truck, XCircle } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ProgressStepper } from '@/components/ProgressStepper';
import { StatusBadge } from '@/components/StatusBadge';
import type { Delivery } from '@/lib/store';

// ─── VendorOrder type ─────────────────────────────────────────────────────────
export type VendorOrder = {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'READY' | 'SENT' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  customerName: string;
  apartment: string;
  block?: string | null;
  description?: string;
  totalAmount?: number;
  paymentStatus?: 'PENDING' | 'PAID';
};

type VendorAdvanceStatus = 'ACCEPTED' | 'READY' | 'SENT';

// ─── Props — discriminated union ──────────────────────────────────────────────
type ResidentProps = {
  role: 'RESIDENT';
  delivery: Delivery;
  /** Card just appeared on screen via real-time socket */
  isFresh?: boolean;
  onCancel?: () => void;
  cancelling?: boolean;
};

type DeliveryPersonProps = {
  role: 'DELIVERY_PERSON';
  delivery: Delivery;
  isFresh?: boolean;
  /** true = this is the entregador's own active delivery (not in the available pool) */
  isActive?: boolean;
  onAccept?: () => void;
  onUpdateStatus?: () => void;
  accepting?: boolean;
  updating?: boolean;
};

type VendorProps = {
  role: 'VENDOR';
  order: VendorOrder;
  isFresh?: boolean;
  onAdvance?: (nextStatus: VendorAdvanceStatus) => void;
  working?: boolean;
};

export type OrderCardProps = ResidentProps | DeliveryPersonProps | VendorProps;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const DELIVERY_STEPS = [
  { key: 'REQUESTED', label: 'Recebido' },
  { key: 'ACCEPTED',  label: 'A caminho' },
  { key: 'PICKED_UP', label: 'Coletado' },
  { key: 'DELIVERED', label: 'Entregue!' },
];

const VENDOR_NEXT: Record<string, { status: VendorAdvanceStatus; label: string } | null> = {
  PENDING:  { status: 'ACCEPTED', label: 'Aceitar pedido' },
  ACCEPTED: { status: 'READY',    label: 'Pronto para coleta' },
  READY:    { status: 'SENT',     label: 'Enviar' },
};

const VENDOR_STATUS_META: Record<string, { bg: string; text: string; label: string }> = {
  PENDING:   { bg: 'bg-[rgba(255,213,58,0.2)] border-[rgba(243,183,27,0.35)]',   text: 'text-[var(--color-secondary)]',    label: 'Novo' },
  ACCEPTED:  { bg: 'bg-[rgba(26,166,75,0.1)] border-[rgba(26,166,75,0.18)]',     text: 'text-[var(--color-primary-dark)]', label: 'Em preparo' },
  READY:     { bg: 'bg-[rgba(31,41,51,0.06)] border-[rgba(31,41,51,0.12)]',      text: 'text-[var(--color-secondary)]',    label: 'Pronto' },
  SENT:      { bg: 'bg-[rgba(26,166,75,0.1)] border-[rgba(26,166,75,0.18)]',     text: 'text-[var(--color-primary-dark)]', label: 'Enviado' },
  COMPLETED: { bg: 'bg-[rgba(26,166,75,0.14)] border-[rgba(26,166,75,0.2)]',     text: 'text-[var(--color-primary-dark)]', label: 'Concluído' },
  CANCELLED: { bg: 'bg-red-50 border-red-200',                                    text: 'text-red-700',                     label: 'Cancelado' },
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)  return `${diff}s atrás`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min atrás`;
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ─── Sub-layouts ──────────────────────────────────────────────────────────────
function ResidentView({ delivery, isFresh, onCancel, cancelling }: Omit<ResidentProps, 'role'>) {
  const canCancel = delivery.status === 'REQUESTED';

  return (
    <>
      {isFresh && <FreshBadge />}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-base font-semibold text-[var(--color-secondary)]">
            <MapPin className="mr-1 inline h-4 w-4 shrink-0 text-[var(--color-primary-dark)]" />
            Apto {delivery.apartment}, Bloco {delivery.block}
          </p>
          {delivery.description && (
            <p className="text-sm text-[var(--color-foreground-soft)]">{delivery.description}</p>
          )}
          {delivery.deliveryPerson && (
            <p className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary-dark)]">
              <Truck className="h-3.5 w-3.5" />
              {delivery.deliveryPerson.name}
              {delivery.deliveryPerson.phone && (
                <a
                  href={`tel:${delivery.deliveryPerson.phone}`}
                  aria-label={`Ligar para ${delivery.deliveryPerson.name}`}
                  className="ml-1 rounded-full p-1 text-[var(--color-foreground-soft)] hover:bg-[var(--color-background-soft)] hover:text-[var(--color-primary-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                >
                  <Phone className="h-3.5 w-3.5" />
                </a>
              )}
            </p>
          )}
        </div>
        <span className="shrink-0 font-mono text-xs text-[var(--color-foreground-soft)]">
          #{delivery.id.slice(0, 8)}
        </span>
      </div>

      <ProgressStepper steps={DELIVERY_STEPS} currentKey={delivery.status} />

      {delivery.deliveryCode && ['ACCEPTED', 'PICKED_UP'].includes(delivery.status) && (
        <div className="mt-3 rounded-2xl border border-[rgba(26,166,75,0.18)] bg-[rgba(26,166,75,0.08)] px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary-dark)]">
            Código de recebimento
          </p>
          <p className="mt-1 text-2xl font-bold tracking-[0.2em] text-[var(--color-primary-dark)]">
            {delivery.deliveryCode}
          </p>
        </div>
      )}

      {canCancel && onCancel && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={cancelling}
            aria-label="Cancelar esta entrega"
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-50"
          >
            <XCircle className="h-4 w-4" />
            {cancelling ? 'Cancelando…' : 'Cancelar entrega'}
          </button>
        </div>
      )}
    </>
  );
}

function DeliveryPersonView({
  delivery,
  isFresh,
  isActive = false,
  onAccept,
  onUpdateStatus,
  accepting,
  updating,
}: Omit<DeliveryPersonProps, 'role'>) {
  const actionLabel = delivery.status === 'ACCEPTED' ? 'Confirmar coleta' : 'Finalizar entrega';

  return (
    <>
      {isFresh && (
        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary)] px-2.5 py-1 text-xs font-bold text-white">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/70" />
          NOVO
        </span>
      )}

      {isActive && (
        <div className="mb-3">
          <StatusBadge status={delivery.status} />
        </div>
      )}

      {/* Large location readout — optimised for at-a-glance reading while in motion */}
      <div className="space-y-1">
        {isActive && delivery.order?.id ? (
          <div className="flex items-center gap-2 text-sm text-[var(--color-foreground-soft)]">
            <Store className="h-3.5 w-3.5 shrink-0" />
            <span>Coleta na loja</span>
          </div>
        ) : null}
        <p className="text-[1.6rem] font-extrabold leading-none tracking-[-0.03em] text-[var(--color-secondary)]">
          Apto {delivery.apartment}
        </p>
        <p className="text-lg font-semibold text-[var(--color-foreground-soft)]">
          Bloco {delivery.block}
        </p>
      </div>

      {delivery.description && (
        <p className="mt-2 text-sm text-[var(--color-foreground-soft)]">{delivery.description}</p>
      )}

      <p className="mt-2 text-xs text-[var(--color-foreground-soft)]">
        {timeAgo(delivery.createdAt)}
      </p>

      {!isActive && onAccept && (
        <Button
          fullWidth
          size="lg"
          onClick={onAccept}
          loading={accepting}
          aria-label={`Aceitar corrida para Apto ${delivery.apartment} Bloco ${delivery.block}`}
          className="mt-4"
        >
          Aceitar Corrida
        </Button>
      )}

      {isActive && onUpdateStatus && (
        <Button
          fullWidth
          onClick={onUpdateStatus}
          loading={updating}
          aria-label={actionLabel}
          className="mt-4"
        >
          {actionLabel}
        </Button>
      )}
    </>
  );
}

function VendorView({ order, isFresh, onAdvance, working }: Omit<VendorProps, 'role'>) {
  const statusMeta = VENDOR_STATUS_META[order.status] ?? VENDOR_STATUS_META.PENDING;
  const next = VENDOR_NEXT[order.status] ?? null;
  const shortId = `#${order.id.slice(-4).toUpperCase()}`;

  return (
    <>
      {isFresh && (
        <div className="-mt-1 mb-2 flex items-center gap-1.5 rounded-xl bg-[rgba(255,213,58,0.35)] px-2.5 py-1 animate-[slide-in-card_0.28s_ease-out]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
          <span className="text-xs font-bold text-[var(--color-secondary)]">NOVO</span>
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        {/* Large order number */}
        <p className="text-[1.8rem] font-extrabold leading-none tracking-[-0.03em] text-[var(--color-secondary)]">
          {shortId}
        </p>
        <div className="flex flex-col items-end gap-1.5">
          <span
            className={clsx(
              'badge-status inline-flex items-center gap-1.5 px-2.5 py-1 text-xs',
              statusMeta.bg,
              statusMeta.text,
            )}
          >
            {statusMeta.label}
          </span>
          <p className="text-xs text-[var(--color-foreground-soft)]">{timeAgo(order.createdAt)}</p>
        </div>
      </div>

      <div className="mt-2 space-y-0.5">
        <p className="text-sm font-semibold text-[var(--color-secondary)]">{order.customerName}</p>
        <p className="flex items-center gap-1 text-sm text-[var(--color-foreground-soft)]">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          Apto {order.apartment}
          {order.block ? `, Bloco ${order.block}` : ''}
        </p>
      </div>

      {order.description && (
        <p className="mt-2 text-sm leading-6 text-[var(--color-foreground-soft)]">
          {order.description}
        </p>
      )}

      {order.totalAmount !== undefined && (
        <p className="mt-2 text-sm font-semibold text-[var(--color-secondary)]">
          R${' '}
          {order.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          {order.paymentStatus === 'PAID' && (
            <span className="ml-2 rounded-full bg-[rgba(26,166,75,0.1)] px-2 py-0.5 text-xs font-medium text-[var(--color-primary-dark)]">
              Pago
            </span>
          )}
        </p>
      )}

      {next && onAdvance && (
        <Button
          fullWidth
          variant={order.status === 'PENDING' ? 'primary' : 'secondary'}
          onClick={() => onAdvance(next.status)}
          loading={working}
          aria-label={`${next.label} — pedido ${shortId}`}
          className="mt-4"
        >
          {next.label}
        </Button>
      )}
    </>
  );
}

// ─── Fresh badge (shared between RESIDENT / minor use) ────────────────────────
function FreshBadge() {
  return (
    <div className="mb-3 flex items-center gap-1.5 rounded-xl bg-[rgba(255,213,58,0.35)] px-2.5 py-1 animate-[slide-in-card_0.28s_ease-out]">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
      <span className="text-xs font-bold text-[var(--color-secondary)]">NOVO</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function OrderCard(props: OrderCardProps) {
  const { isFresh = false } = props;

  const freshClass =
    props.role === 'DELIVERY_PERSON' && isFresh
      ? 'animate-[ring-new-delivery_1.2s_ease-out_2]'
      : isFresh
      ? 'animate-[slide-in-card_0.28s_ease-out]'
      : '';

  const borderClass =
    props.role === 'DELIVERY_PERSON' && (props.isActive ?? false)
      ? 'border-2 border-[rgba(26,166,75,0.2)]'
      : '';

  return (
    <Card className={clsx('rounded-[28px] p-5', freshClass, borderClass)}>
      {props.role === 'RESIDENT' && <ResidentView {...props} />}
      {props.role === 'DELIVERY_PERSON' && <DeliveryPersonView {...props} />}
      {props.role === 'VENDOR' && <VendorView {...props} />}
    </Card>
  );
}
