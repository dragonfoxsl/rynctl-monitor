const badgeColors = {
  success: 'background:#065F46;color:#34D399;',
  completed: 'background:#065F46;color:#34D399;',
  failed: 'background:#7F1D1D;color:#F87171;',
  running: 'background:#4C1D95;color:#A78BFA;',
  pending: 'background:#1E3A5F;color:#60A5FA;',
};

const dotColors = {
  success: '#34D399', completed: '#34D399', failed: '#F87171',
  running: '#A78BFA', pending: '#60A5FA',
};

export function StatusBadge({ status }) {
  const s = (status || 'unknown').toLowerCase();
  const style = badgeColors[s] || 'background:#334155;color:#94A3B8;';
  return <span style={`display:inline-block;padding:2px 10px;border-radius:9999px;font-size:11px;font-family:'JetBrains Mono',monospace;${style}`}>{status || 'unknown'}</span>;
}

export function StatusDot({ status }) {
  const s = (status || '').toLowerCase();
  const c = dotColors[s] || '#94A3B8';
  return (
    <span style="display:inline-flex;align-items:center;gap:6px;">
      <span style={`width:8px;height:8px;border-radius:50%;background:${c};display:inline-block;`} />
      {status || 'unknown'}
    </span>
  );
}
