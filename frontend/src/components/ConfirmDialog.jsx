import { confirmDialog } from '../lib/store';
import { Icon } from '../lib/icons';

export function ConfirmDialog() {
  const d = confirmDialog.value;
  if (!d) return null;

  const close = () => { confirmDialog.value = null; };
  const confirm = () => { d.onConfirm(); close(); };

  return (
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);z-index:2000;display:flex;align-items:center;justify-content:center;">
      <div style="background:#0F172A;border:1px solid #1E293B;border-radius:12px;width:100%;max-width:400px;animation:slideUp .2s ease;">
        <div style="padding:20px 24px;border-bottom:1px solid #1E293B;">
          <div style="font-family:'JetBrains Mono',monospace;font-size:16px;color:#F1F5F9;font-weight:600;display:flex;align-items:center;gap:10px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EAB308" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            {d.title}
          </div>
        </div>
        <div style="padding:20px 24px;">
          <p style="font-family:'IBM Plex Sans',-apple-system,sans-serif;font-size:14px;color:#94A3B8;margin:0;line-height:1.6;">{d.message}</p>
        </div>
        <div style="padding:16px 24px;border-top:1px solid #1E293B;display:flex;justify-content:flex-end;gap:10px;">
          <button onClick={close} style="padding:8px 16px;background:none;border:1px solid #334155;border-radius:8px;color:#94A3B8;font-family:'JetBrains Mono',monospace;font-size:12px;cursor:pointer;">Cancel</button>
          <button onClick={confirm} style="padding:8px 16px;background:#DC2626;border:none;border-radius:8px;color:#fff;font-family:'JetBrains Mono',monospace;font-size:12px;cursor:pointer;">Confirm</button>
        </div>
      </div>
    </div>
  );
}
