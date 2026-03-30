import { Icon } from '../lib/icons';

export function SearchInput({ value, onInput, placeholder }) {
  return (
    <div style={{ position: 'relative', width: 260 }}>
      <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
        <Icon name="search" />
      </span>
      <input type="text" value={value} onInput={e => onInput(e.target.value)} placeholder={placeholder}
        style={{
          width: '100%', padding: '9px 14px 9px 34px', background: 'var(--bg-input)',
          border: '1px solid var(--border-input)', borderRadius: 'var(--radius-md)',
          color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', fontSize: 13,
          outline: 'none', boxSizing: 'border-box',
        }} />
    </div>
  );
}
