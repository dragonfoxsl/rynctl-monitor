import { confirmDialog } from '../lib/store';
import { Icon } from '../lib/icons';

export function ConfirmDialog() {
  const d = confirmDialog.value;
  if (!d) return null;

  const close = () => { confirmDialog.value = null; };
  const confirm = () => { d.onConfirm(); close(); };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
      zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
        borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 420,
        animation: 'slideUp .2s ease', boxShadow: 'var(--shadow-lg)',
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-primary)' }}>
          <div style={{
            fontFamily: 'var(--font-sans)', fontSize: 16, color: 'var(--text-primary)',
            fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 'var(--radius-md)',
              background: 'var(--warning-light)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: 'var(--warning-text)',
            }}>
              <Icon name="warning" size={16} />
            </div>
            {d.title}
          </div>
        </div>
        <div style={{ padding: '20px 24px' }}>
          <p style={{
            fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-secondary)',
            margin: 0, lineHeight: 1.6,
          }}>{d.message}</p>
        </div>
        <div style={{
          padding: '16px 24px', borderTop: '1px solid var(--border-primary)',
          display: 'flex', justifyContent: 'flex-end', gap: 10,
        }}>
          <button onClick={close} style={{
            padding: '8px 18px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-input)',
            borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)',
            fontFamily: 'var(--font-sans)', fontSize: 13, cursor: 'pointer', fontWeight: 500,
          }}>Cancel</button>
          <button onClick={confirm} style={{
            padding: '8px 18px', background: 'var(--error)', border: 'none',
            borderRadius: 'var(--radius-md)', color: '#fff',
            fontFamily: 'var(--font-sans)', fontSize: 13, cursor: 'pointer', fontWeight: 600,
          }}>Confirm</button>
        </div>
      </div>
    </div>
  );
}
