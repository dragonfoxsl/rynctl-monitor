import { modal } from '../lib/store';
import { api } from '../lib/api';
import { showToast } from './Toast';
import { Modal } from './Modal';

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

  const labelStyle = {
    display: 'block', fontFamily: 'var(--font-sans)', fontSize: 13,
    fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6,
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px', background: 'var(--bg-input)',
    border: '1px solid var(--border-input)', borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', fontSize: 14,
    outline: 'none', boxSizing: 'border-box',
  };

  const footer = (
    <>
      <button onClick={close} style={{
        padding: '8px 18px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-input)',
        borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)',
        fontFamily: 'var(--font-sans)', fontSize: 13, cursor: 'pointer', fontWeight: 500,
      }}>Cancel</button>
      <button onClick={save} style={{
        padding: '8px 18px', background: 'var(--accent)', border: 'none',
        borderRadius: 'var(--radius-md)', color: '#fff',
        fontFamily: 'var(--font-sans)', fontSize: 13, cursor: 'pointer', fontWeight: 600,
      }}>{isEdit ? 'Save' : 'Create User'}</button>
    </>
  );

  return (
    <Modal title={title} onClose={close} footer={footer}>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle} for="uf-username">Username</label>
        <input id="uf-username" type="text" value={editUser?.username || ''} style={inputStyle} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle} for="uf-password">Password{isEdit ? ' (leave blank to keep)' : ''}</label>
        <input id="uf-password" type="password" style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle} for="uf-role">Role</label>
        <select id="uf-role" style={inputStyle}>
          <option value="admin" selected={editUser?.role === 'admin'}>Admin</option>
          <option value="rsync" selected={editUser?.role === 'rsync'}>Rsync</option>
          <option value="readonly" selected={editUser?.role === 'readonly'}>Read Only</option>
        </select>
      </div>
    </Modal>
  );
}
