import { Icon } from '../lib/icons';
import { user, page, isAdmin } from '../lib/store';
import { api } from '../lib/api';

export function Sidebar({ onNavigate }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'jobs', label: 'Jobs', icon: 'jobs' },
    { id: 'runs', label: 'Run History', icon: 'history' },
    { id: 'flags', label: 'Flags Reference', icon: 'flag' },
    { id: 'crontab', label: 'Crontab', icon: 'terminal' },
  ];
  if (isAdmin()) {
    navItems.push({ id: 'users', label: 'Users', icon: 'users' });
    navItems.push({ id: 'settings', label: 'Settings', icon: 'settings' });
  }

  const u = user.value;
  const initial = u ? u.username.charAt(0).toUpperCase() : '?';

  const handleLogout = async () => {
    try { await api('POST', '/api/auth/logout'); } catch (_) {}
    user.value = null;
    page.value = 'login';
    window.location.hash = '';
  };

  return (
    <aside style="width:240px;min-height:100vh;background:#1E293B;border-right:1px solid #334155;display:flex;flex-direction:column;padding:24px 0;position:fixed;top:0;left:0;z-index:100;">
      <div style="padding:0 24px 24px;">
        <div style="font-family:'JetBrains Mono',monospace;font-weight:700;font-size:20px;">
          <span style="color:#3B82F6;">R~</span><span style="color:#F1F5F9;">RYNCTL</span><span style="color:#64748B;">MONITOR</span>
        </div>
        <div style="font-size:12px;color:#64748B;margin-top:4px;font-family:'JetBrains Mono',monospace;">rsync job manager</div>
      </div>
      <div style="padding:0 24px;margin-bottom:12px;">
        <span style="font-size:10px;text-transform:uppercase;color:#475569;letter-spacing:1.5px;font-family:'JetBrains Mono',monospace;">Navigation</span>
      </div>
      <nav style="flex:1;">
        {navItems.map(item => {
          const active = page.value === item.id;
          return (
            <a key={item.id} href={`#${item.id}`} onClick={(e) => { e.preventDefault(); onNavigate(item.id); }} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 24px', cursor: 'pointer', textDecoration: 'none',
              fontFamily: "'JetBrains Mono',monospace", fontSize: 13, transition: 'all .15s',
              borderLeft: `2px solid ${active ? '#3B82F6' : 'transparent'}`,
              background: active ? 'rgba(59,130,246,0.08)' : 'transparent',
              color: active ? '#3B82F6' : '#94A3B8', paddingLeft: 22,
            }}>
              <Icon name={item.icon} /> {item.label}
            </a>
          );
        })}
      </nav>
      <div style="padding:16px 24px;border-top:1px solid #1E293B;display:flex;align-items:center;gap:12px;">
        <div style="width:36px;height:36px;border-radius:50%;background:#3B82F6;display:flex;align-items:center;justify-content:center;color:#fff;font-family:'JetBrains Mono',monospace;font-weight:700;font-size:14px;">{initial}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;color:#F1F5F9;font-family:'JetBrains Mono',monospace;">{u?.username}</div>
          <div style="font-size:11px;color:#64748B;font-family:'JetBrains Mono',monospace;">{u?.role}</div>
        </div>
        <button onClick={handleLogout} title="Logout" style="background:none;border:none;color:#64748B;cursor:pointer;padding:4px;">
          <Icon name="logout" />
        </button>
      </div>
    </aside>
  );
}
