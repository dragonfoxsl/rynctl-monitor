import { Icon } from '../lib/icons';
import { user, page, isAdmin, theme, toggleTheme } from '../lib/store';
import { api, clearCsrfToken } from '../lib/api';

export function Sidebar({ onNavigate }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'create-job', label: 'Create Job', icon: 'plus' },
    { id: 'jobs', label: 'Task Management', icon: 'jobs' },
    { id: 'runs', label: 'Run History', icon: 'history' },
    { id: 'flags', label: 'Logs', icon: 'list' },
  ];
  if (isAdmin()) {
    navItems.push({ id: 'settings', label: 'Settings', icon: 'settings' });
    navItems.push({ id: 'users', label: 'Users', icon: 'users' });
  }

  const u = user.value;
  const initial = u ? u.username.charAt(0).toUpperCase() : '?';
  const isDark = theme.value === 'dark';

  const handleLogout = async () => {
    try { await api('POST', '/api/auth/logout'); } catch (_) {}
    clearCsrfToken();
    user.value = null;
    page.value = 'login';
    window.location.hash = '';
  };

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      minHeight: '100vh',
      background: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border-primary)',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 100,
      boxShadow: 'var(--shadow-sm)',
    }}>
      {/* Brand */}
      <div style={{ padding: '24px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 'var(--radius-md)',
            background: 'var(--accent)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16,
            fontFamily: 'var(--font-mono)',
          }}>R</div>
          <div>
            <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
              Rsync Monitor
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              System Control
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '0 12px' }}>
        {navItems.map(item => {
          const active = page.value === item.id;
          return (
            <a key={item.id} href={`#${item.id}`} onClick={(e) => { e.preventDefault(); onNavigate(item.id); }} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              cursor: 'pointer', textDecoration: 'none', borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-sans)', fontSize: 14, transition: 'all .15s',
              marginBottom: 2,
              background: active ? 'var(--accent-light)' : 'transparent',
              color: active ? 'var(--accent)' : 'var(--text-secondary)',
              fontWeight: active ? 600 : 400,
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
            >
              <Icon name={item.icon} size={18} /> {item.label}
            </a>
          );
        })}
      </nav>

      {/* Theme toggle */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-primary)' }}>
        <button onClick={toggleTheme} style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          padding: '8px 0', background: 'none', border: 'none',
          color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)',
          fontSize: 13, cursor: 'pointer', textAlign: 'left',
        }}>
          <span style={{ fontSize: 16 }}>{isDark ? '☀️' : '🌙'}</span>
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </button>
      </div>

      {/* User section */}
      <div style={{
        padding: '16px 20px', borderTop: '1px solid var(--border-primary)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', background: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 14,
        }}>{initial}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>{u?.username}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', textTransform: 'capitalize' }}>{u?.role}</div>
        </div>
        <button onClick={handleLogout} title="Logout" style={{
          background: 'none', border: 'none', color: 'var(--text-muted)',
          cursor: 'pointer', padding: 4,
        }}>
          <Icon name="logout" />
        </button>
      </div>
    </aside>
  );
}
