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
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#020617;">
      <div style="background:#0F172A;border:1px solid #1E293B;border-radius:12px;padding:40px;width:100%;max-width:400px;">
        <div style="text-align:center;margin-bottom:32px;">
          <div style="font-family:'JetBrains Mono',monospace;font-weight:700;font-size:28px;margin-bottom:8px;">
            <span style="color:#3B82F6;">R~</span><span style="color:#F1F5F9;">RYNCTL</span><span style="color:#64748B;">MONITOR</span>
          </div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:13px;">
            <span style="color:#3B82F6;">$</span> <span style="color:#64748B;">authenticate to manage rsync jobs</span>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <div style="margin-bottom:16px;">
            <label style="display:block;font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;color:#94A3B8;margin-bottom:6px;letter-spacing:1px;">Username</label>
            <input id="login-user" type="text" autocomplete="username" style="width:100%;padding:10px 14px;background:#020617;border:1px solid #1E293B;border-radius:8px;color:#F1F5F9;font-family:'JetBrains Mono',monospace;font-size:14px;outline:none;box-sizing:border-box;" />
          </div>
          <div style="margin-bottom:24px;">
            <label style="display:block;font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;color:#94A3B8;margin-bottom:6px;letter-spacing:1px;">Password</label>
            <input id="login-pass" type="password" autocomplete="current-password" style="width:100%;padding:10px 14px;background:#020617;border:1px solid #1E293B;border-radius:8px;color:#F1F5F9;font-family:'JetBrains Mono',monospace;font-size:14px;outline:none;box-sizing:border-box;" />
          </div>
          {error && <div style="color:#F87171;font-size:12px;font-family:'JetBrains Mono',monospace;margin-bottom:12px;">{error}</div>}
          <button type="submit" style="width:100%;padding:12px;background:#3B82F6;border:none;border-radius:8px;color:#fff;font-family:'JetBrains Mono',monospace;font-size:13px;text-transform:uppercase;cursor:pointer;font-weight:600;letter-spacing:1px;">Login</button>
        </form>
        <div style="text-align:center;margin-top:20px;font-size:11px;color:#475569;font-family:'JetBrains Mono',monospace;">Default: admin / admin</div>
      </div>
    </div>
  );
}
