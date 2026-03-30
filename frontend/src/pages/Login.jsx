import { useState } from 'preact/hooks';
import { api } from '../lib/api';
import { user, page } from '../lib/store';

export function Login() {
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-user')?.value;
    const password = document.getElementById('login-pass')?.value;
    try {
      const res = await api('POST', '/api/auth/login', { username, password });
      user.value = res.user || res;
      page.value = 'dashboard';
      window.location.hash = '#dashboard';
    } catch (err) {
      setError(err.message || 'Login failed');
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)',
    }}>
      <div style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
        borderRadius: 'var(--radius-xl)', padding: 40, width: '100%', maxWidth: 420,
        boxShadow: 'var(--shadow-lg)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 'var(--radius-lg)',
              background: 'var(--accent)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 22,
              fontFamily: 'var(--font-mono)',
            }}>R</div>
          </div>
          <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 22, color: 'var(--text-primary)', marginBottom: 4 }}>
            Rsync Monitor
          </div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)' }}>
            Sign in to manage your sync jobs
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block', fontFamily: 'var(--font-sans)', fontSize: 13,
              fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6,
            }}>Username</label>
            <input id="login-user" type="text" autocomplete="username" placeholder="Enter username" style={{
              width: '100%', padding: '11px 14px', background: 'var(--bg-input)',
              border: '1px solid var(--border-input)', borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', fontSize: 14,
              outline: 'none', boxSizing: 'border-box',
            }} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'block', fontFamily: 'var(--font-sans)', fontSize: 13,
              fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6,
            }}>Password</label>
            <input id="login-pass" type="password" autocomplete="current-password" placeholder="Enter password" style={{
              width: '100%', padding: '11px 14px', background: 'var(--bg-input)',
              border: '1px solid var(--border-input)', borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', fontSize: 14,
              outline: 'none', boxSizing: 'border-box',
            }} />
          </div>
          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 'var(--radius-md)',
              background: 'var(--error-light)', color: 'var(--error-text)',
              border: '1px solid var(--error-border)', fontSize: 13,
              fontFamily: 'var(--font-sans)', marginBottom: 16,
            }}>{error}</div>
          )}
          <button type="submit" style={{
            width: '100%', padding: 12, background: 'var(--accent)', border: 'none',
            borderRadius: 'var(--radius-md)', color: '#fff', fontFamily: 'var(--font-sans)',
            fontSize: 14, cursor: 'pointer', fontWeight: 600, boxShadow: 'var(--shadow-sm)',
          }}>Sign In</button>
        </form>
        <div style={{
          textAlign: 'center', marginTop: 20, fontSize: 12,
          color: 'var(--text-muted)', fontFamily: 'var(--font-sans)',
        }}>Default credentials: admin / admin</div>
      </div>
    </div>
  );
}
