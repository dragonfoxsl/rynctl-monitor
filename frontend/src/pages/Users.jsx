import { useEffect } from 'preact/hooks';
import { api } from '../lib/api';
import { timeAgo } from '../lib/utils';
import { users, modal, confirmDialog, isAdmin } from '../lib/store';
import { Icon } from '../lib/icons';
import { UserModal } from '../components/UserModal';
import { showToast } from '../components/Toast';

export function Users() {
  const loadUsers = () => api('GET', '/api/users').then(u => { users.value = u || []; }).catch(e => showToast(e.message, 'error'));

  useEffect(() => { if (isAdmin()) loadUsers(); }, []);

  const deleteUser = (id) => {
    confirmDialog.value = {
      title: 'Delete User',
      message: 'Are you sure you want to delete this user? This cannot be undone.',
      onConfirm: async () => {
        try {
          await api('DELETE', `/api/users/${id}`);
          showToast('User deleted');
          loadUsers();
        } catch (err) { showToast(err.message, 'error'); }
      },
    };
  };

  const roleBadge = { admin: 'background:#1E3A5F;color:#60A5FA;', rsync: 'background:#065F46;color:#34D399;', readonly: 'background:#334155;color:#94A3B8;' };

  return (
    <>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
        <h1 style="font-family:'JetBrains Mono',monospace;font-weight:600;font-size:24px;margin:0;">
          <span style="color:#64748B;">~/</span><span style="color:#F1F5F9;">users</span>
        </h1>
        <button onClick={() => { modal.value = { type: 'user', data: null }; }} style="display:inline-flex;align-items:center;gap:6px;padding:8px 16px;background:#3B82F6;border:none;border-radius:8px;color:#fff;font-family:'JetBrains Mono',monospace;font-size:12px;cursor:pointer;">
          <Icon name="plus" /> Add User
        </button>
      </div>
      <div style="background:#1E293B;border-radius:10px;border:1px solid #334155;overflow:hidden;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:1px solid #334155;">
              {['Username', 'Role', 'Created', 'Last Login', 'Actions'].map(h => (
                <th key={h} style="padding:10px 16px;text-align:left;font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;color:#64748B;">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(users.value || []).map(u => (
              <tr key={u.id} style="border-bottom:1px solid #1E293B;">
                <td style="padding:10px 16px;font-family:'JetBrains Mono',monospace;font-size:13px;color:#F1F5F9;">{u.username}</td>
                <td style="padding:10px 16px;">
                  <span style={`display:inline-block;padding:2px 10px;border-radius:9999px;font-size:11px;font-family:'JetBrains Mono',monospace;${roleBadge[u.role] || roleBadge.readonly}`}>{u.role}</span>
                </td>
                <td style="padding:10px 16px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#94A3B8;">{timeAgo(u.created_at)}</td>
                <td style="padding:10px 16px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#94A3B8;">{timeAgo(u.last_login)}</td>
                <td style="padding:10px 16px;">
                  <button onClick={() => { modal.value = { type: 'user', data: u }; }} title="Edit" style="padding:4px 8px;background:none;border:1px solid #475569;border-radius:6px;color:#94A3B8;cursor:pointer;margin-right:4px;"><Icon name="edit" /></button>
                  <button onClick={() => deleteUser(u.id)} title="Delete" style="padding:4px 8px;background:none;border:1px solid #DC2626;border-radius:6px;color:#F87171;cursor:pointer;"><Icon name="delete" /></button>
                </td>
              </tr>
            ))}
            {(!users.value || users.value.length === 0) && (
              <tr><td colspan="5" style="padding:24px;text-align:center;color:#64748B;font-family:'JetBrains Mono',monospace;font-size:13px;">No users</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal.value?.type === 'user' && <UserModal user={modal.value.data} onSaved={loadUsers} />}
    </>
  );
}
