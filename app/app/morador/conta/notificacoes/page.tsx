import { redirect } from 'next/navigation';

/**
 * Notification preferences live in /configuracoes (device-scoped settings).
 * Redirect so the sidebar link still works correctly.
 */
export default function NotificacoesAccountPage() {
  redirect('/configuracoes');
}
