import { signal } from '@preact/signals';

const toasts = signal([]);
let counter = 0;

export function showToast(message, type = 'success') {
  const id = ++counter;
  toasts.value = [...toasts.value, { id, message, type }];
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id);
  }, 3500);
}

export function ToastContainer() {
  if (toasts.value.length === 0) return null;
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.value.map(t => (
        <div key={t.id} style={{
          padding: '12px 20px', borderRadius: 'var(--radius-md)',
          fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500,
          color: '#fff', minWidth: 240, animation: 'slideInRight .3s ease',
          background: t.type === 'error' ? 'var(--error)' : 'var(--success)',
          boxShadow: 'var(--shadow-lg)',
        }}>{t.message}</div>
      ))}
    </div>
  );
}
