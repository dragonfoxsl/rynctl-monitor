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
    <div style="position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;">
      {toasts.value.map(t => (
        <div key={t.id} style={{
          padding: '12px 20px', borderRadius: 8,
          fontFamily: "'JetBrains Mono',monospace", fontSize: 13,
          color: '#fff', minWidth: 240, animation: 'slideInRight .3s ease',
          background: t.type === 'error' ? '#DC2626' : '#16A34A',
        }}>{t.message}</div>
      ))}
    </div>
  );
}
