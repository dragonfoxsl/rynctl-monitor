import { Icon } from '../lib/icons';

export function SearchInput({ value, onInput, placeholder }) {
  return (
    <div style="position:relative;width:260px;">
      <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#64748B;"><Icon name="search" /></span>
      <input type="text" value={value} onInput={e => onInput(e.target.value)} placeholder={placeholder}
        style="width:100%;padding:8px 12px 8px 32px;background:#0F172A;border:1px solid #334155;border-radius:8px;color:#F1F5F9;font-family:'JetBrains Mono',monospace;font-size:12px;outline:none;box-sizing:border-box;" />
    </div>
  );
}
