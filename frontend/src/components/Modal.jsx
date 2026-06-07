import { useEffect, useRef } from 'preact/hooks';
import { Icon } from '../lib/icons';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Accessible modal dialog: role=dialog + aria-modal, Escape and backdrop
 * dismissal, focus-on-open, focus-return on close, and a Tab focus trap.
 */
export function Modal({ title, onClose, children, footer, maxWidth = 440, zIndex = 1000 }) {
  const panelRef = useRef(null);
  const restoreRef = useRef(null);

  useEffect(() => {
    restoreRef.current = document.activeElement;
    const panel = panelRef.current;
    panel?.querySelector(FOCUSABLE)?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab' || !panel) return;
      const items = Array.from(panel.querySelectorAll(FOCUSABLE)).filter(n => n.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (restoreRef.current && restoreRef.current.focus) restoreRef.current.focus();
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
        zIndex, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div ref={panelRef} style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
        borderRadius: 'var(--radius-lg)', width: '100%', maxWidth,
        maxHeight: '90vh', overflowY: 'auto', animation: 'slideUp .25s ease', boxShadow: 'var(--shadow-lg)',
      }}>
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--border-primary)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 16, color: 'var(--text-primary)', fontWeight: 600 }}>{title}</span>
          <button onClick={onClose} aria-label="Close dialog" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <Icon name="x" />
          </button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
        {footer && (
          <div style={{
            padding: '16px 24px', borderTop: '1px solid var(--border-primary)',
            display: 'flex', justifyContent: 'flex-end', gap: 10,
          }}>{footer}</div>
        )}
      </div>
    </div>
  );
}
