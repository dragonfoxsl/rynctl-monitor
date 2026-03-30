export function StatusBadge({ status }) {
  const s = (status || 'unknown').toLowerCase();
  const styles = {
    success: { background: 'var(--success-light)', color: 'var(--success-text)', border: 'var(--success-border)' },
    completed: { background: 'var(--success-light)', color: 'var(--success-text)', border: 'var(--success-border)' },
    failed: { background: 'var(--error-light)', color: 'var(--error-text)', border: 'var(--error-border)' },
    running: { background: 'var(--purple-light)', color: 'var(--purple-text)', border: 'var(--purple-border)' },
    pending: { background: 'var(--accent-light)', color: 'var(--accent)', border: 'var(--accent-border)' },
  };
  const st = styles[s] || { background: 'var(--bg-tertiary)', color: 'var(--text-muted)', border: 'var(--border-primary)' };
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 'var(--radius-full)',
      fontSize: 12, fontFamily: 'var(--font-sans)', fontWeight: 500,
      background: st.background, color: st.color, border: `1px solid ${st.border}`,
    }}>{status || 'unknown'}</span>
  );
}

const dotColors = {
  success: 'var(--success)', completed: 'var(--success)', failed: 'var(--error)',
  running: 'var(--purple)', pending: 'var(--accent)',
};

export function StatusDot({ status }) {
  const s = (status || '').toLowerCase();
  const c = dotColors[s] || 'var(--text-muted)';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-secondary)' }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block' }} />
      {status || 'unknown'}
    </span>
  );
}
