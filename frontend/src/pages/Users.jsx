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
        try { await api('DELETE', `/api/users/${id}`); showToast('User deleted'); loadUsers(); }
        catch (err) { showToast(err.message, 'error'); }
      },
    };
  };

  const roleBadge = {
    admin: { bg: 'var(--accent-light)', color: 'var(--accent)', border: 'var(--accent-border)' },
    rsync: { bg: 'var(--success-light)', color: 'var(--success-text)', border: 'var(--success-border)' },
    readonly: { bg: 'var(--bg-tertiary)', color: 'var(--text-muted)', border: 'var(--border-primary)' },
  };

  const avatarColors = ['#3B82F6', '#8B5CF6', '#22C55E', '#F59E0B', '#EF4444', '#06B6D4'];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 26, margin: 0, color: 'var(--text-primary)' }}>
            User Management
          </h1>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Manage administrative access and role-based permissions.
          </p>
        </div>
        <button onClick={() => { modal.value = { type: 'user', data: null }; }} style={{
          padding: '10px 20px', background: 'var(--accent)', border: 'none',
          borderRadius: 'var(--radius-md)', color: '#fff', fontFamily: 'var(--font-sans)',
          fontSize: 14, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center',
          gap: 6, boxShadow: 'var(--shadow-sm)',
        }}>
          <Icon name="plus" size={14} /> Add New User
        </button>
      </div>

      <div style={{
        background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-primary)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-primary)' }}>
              {['User Profile', 'Role', 'Last Activity', 'Actions'].map(h => (
                <th key={h} style={{
                  padding: '12px 16px', textAlign: 'left', fontFamily: 'var(--font-sans)',
                  fontSize: 12, textTransform: 'uppercase', color: 'var(--text-muted)',
                  fontWeight: 600, letterSpacing: '0.5px',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(users.value || []).map((u, i) => {
              const rb = roleBadge[u.role] || roleBadge.readonly;
              const color = avatarColors[i % avatarColors.length];
              return (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border-secondary)', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', background: color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 14,
                      }}>{u.username.charAt(0).toUpperCase()}</div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>{u.username}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>
                          Created {timeAgo(u.created_at)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      display: 'inline-block', padding: '3px 12px', borderRadius: 'var(--radius-full)',
                      fontSize: 12, fontFamily: 'var(--font-sans)', fontWeight: 500,
                      background: rb.bg, color: rb.color, border: `1px solid ${rb.border}`,
                      textTransform: 'capitalize',
                    }}>{u.role}</span>
                  </td>
                  <td style={{ padding: '14px 16px', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-secondary)' }}>
                    {timeAgo(u.last_login) || '—'}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => { modal.value = { type: 'user', data: u }; }} title="Edit" style={{
                        padding: '6px 8px', background: 'none', border: '1px solid var(--border-input)',
                        borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', cursor: 'pointer',
                      }}><Icon name="edit" size={14} /></button>
                      <button onClick={() => deleteUser(u.id)} title="Delete" style={{
                        padding: '6px 8px', background: 'none', border: '1px solid var(--error-border)',
                        borderRadius: 'var(--radius-sm)', color: 'var(--error-text)', cursor: 'pointer',
                      }}><Icon name="delete" size={14} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {(!users.value || users.value.length === 0) && (
              <tr><td colSpan="4" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, fontFamily: 'var(--font-sans)' }}>
                No users
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Security tip */}
      <div style={{
        marginTop: 20, padding: 20, background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)',
        boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'flex-start', gap: 12,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 'var(--radius-md)', flexShrink: 0,
          background: 'var(--accent-light)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: 'var(--accent)',
        }}>
          <Icon name="shield" size={16} />
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
            Security Best Practice
          </div>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            Review user access monthly. Remove inactive accounts and ensure each team member has the minimum required permissions. Principle of Least Privilege.
          </p>
        </div>
      </div>

      {modal.value?.type === 'user' && <UserModal user={modal.value.data} onSaved={loadUsers} />}
    </>
  );
}
