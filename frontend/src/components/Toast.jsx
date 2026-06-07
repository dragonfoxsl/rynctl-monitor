import { signal } from '@preact/signals';
import { Icon } from '../lib/icons';

const toasts = signal([]);
let counter = 0;

export function dismissToast(id) {
  toasts.value = toasts.value.filter(t => t.id !== id);
}

export function showToast(message, type = 'success') {
  const id = ++counter;
  toasts.value = [...toasts.value, { id, message, type }];
  // Success messages auto-dismiss; errors persist until dismissed so they
  // can't be missed.
  if (type !== 'error') {
    setTimeout(() => dismissToast(id), 3500);
  }
}

export function ToastContainer() {
  if (toasts.value.length === 0) return null;
  return (
    <div role="status" aria-live="polite" style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.value.map(t => (
        <div key={t.id} style={{
          padding: '12px 16px 12px 20px', borderRadius: 'var(--radius-md)',
          fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500,
          color: '#fff', minWidth: 240, maxWidth: 420, animation: 'slideInRight .3s ease',
          background: t.type === 'error' ? 'var(--error)' : 'var(--success)',
          boxShadow: 'var(--shadow-lg)', display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ flex: 1 }}>{t.message}</span>
          <button onClick={() => dismissToast(t.id)} aria-label="Dismiss" style={{
            background: 'none', border: 'none', color: '#fff', cursor: 'pointer',
            opacity: 0.85, display: 'flex', alignItems: 'center', padding: 2,
          }}>
            <Icon name="x" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
