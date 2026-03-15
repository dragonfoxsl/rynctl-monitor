import { Icon } from '../lib/icons';
import { modal } from '../lib/store';
import { api } from '../lib/api';
import { showToast } from './Toast';

export function UserModal({ user: editUser, onSaved }) {
  const isEdit = !!editUser;
  const title = isEdit ? 'Edit User' : 'Add User';

  const close = () => { modal.value = null; };

  const save = async () => {
    const payload = {
      username: document.getElementById('uf-username')?.value,
      role: document.getElementById('uf-role')?.value,
    };
    const pw = document.getElementById('uf-password')?.value;
    if (pw) payload.password = pw;

    try {
      if (isEdit) {
        await api('PUT', `/api/users/${editUser.id}`, payload);
        showToast('User updated');
      } else {
        await api('POST', '/api/users', payload);
        showToast('User created');
      }
      modal.value = null;
      onSaved();
    } catch (err) { showToast(err.message, 'error'); }
  };

  return (
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);z-index:1000;display:flex;align-items:center;justify-content:center;" onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <div style="background:#0F172A;border:1px solid #1E293B;border-radius:12px;width:100%;max-width:420px;animation:slideUp .25s ease;">
        <div style="padding:20px 24px;border-bottom:1px solid #1E293B;display:flex;justify-content:space-between;align-items:center;">
          <span style="font-family:'JetBrains Mono',monospace;font-size:16px;color:#F1F5F9;font-weight:600;">{title}</span>
          <button onClick={close} style="background:none;border:none;color:#64748B;cursor:pointer;"><Icon name="x" /></button>
        </div>
        <div style="padding:24px;">
          <div style="margin-bottom:16px;">
            <label style="display:block;font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;color:#94A3B8;margin-bottom:6px;letter-spacing:1px;">Username</label>
            <input id="uf-username" type="text" value={editUser?.username || ''} style="width:100%;padding:8px 12px;background:#020617;border:1px solid #1E293B;border-radius:6px;color:#F1F5F9;font-family:'JetBrains Mono',monospace;font-size:13px;outline:none;box-sizing:border-box;" />
          </div>
          <div style="margin-bottom:16px;">
            <label style="display:block;font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;color:#94A3B8;margin-bottom:6px;letter-spacing:1px;">Password{isEdit ? ' (leave blank to keep)' : ''}</label>
            <input id="uf-password" type="password" style="width:100%;padding:8px 12px;background:#020617;border:1px solid #1E293B;border-radius:6px;color:#F1F5F9;font-family:'JetBrains Mono',monospace;font-size:13px;outline:none;box-sizing:border-box;" />
          </div>
          <div>
            <label style="display:block;font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;color:#94A3B8;margin-bottom:6px;letter-spacing:1px;">Role</label>
            <select id="uf-role" style="width:100%;padding:8px 12px;background:#020617;border:1px solid #1E293B;border-radius:6px;color:#F1F5F9;font-family:'JetBrains Mono',monospace;font-size:13px;outline:none;box-sizing:border-box;">
              <option value="admin" selected={editUser?.role === 'admin'}>admin</option>
              <option value="rsync" selected={editUser?.role === 'rsync'}>rsync</option>
              <option value="readonly" selected={editUser?.role === 'readonly'}>readonly</option>
            </select>
          </div>
        </div>
        <div style="padding:16px 24px;border-top:1px solid #1E293B;display:flex;justify-content:flex-end;gap:10px;">
          <button onClick={close} style="padding:8px 16px;background:none;border:1px solid #334155;border-radius:8px;color:#94A3B8;font-family:'JetBrains Mono',monospace;font-size:12px;cursor:pointer;">Cancel</button>
          <button onClick={save} style="padding:8px 16px;background:#3B82F6;border:none;border-radius:8px;color:#fff;font-family:'JetBrains Mono',monospace;font-size:12px;cursor:pointer;">{isEdit ? 'Save' : 'Create User'}</button>
        </div>
      </div>
    </div>
  );
}
