/* ============================================================
   RYNCTL Monitor — Vanilla JS SPA
   No frameworks. No build step. Pure DOM manipulation.
   ============================================================ */

// --------------- State ---------------
const state = {
  user: null,
  page: 'login',
  jobs: [],
  stats: {},
  runs: [],
  crontabEntries: [],
  users: [],
  toasts: [],
  modal: null,
  expandedLog: null,   // { runId, content }
  confirmDialog: null, // { title, message, onConfirm }
  jobSearch: '',       // search filter for jobs table
  runSearch: '',       // search filter for runs table
};

// --------------- SVG Icons ---------------
const icons = {
  dashboard: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
  jobs: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
  history: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  terminal: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>',
  users: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  play: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
  edit: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  delete: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  eye: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
  plus: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  x: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  logout: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
  refresh: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>',
  clone: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  search: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  flag: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>',
};

// --------------- Utilities ---------------

async function api(method, url, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (!res.ok) {
    let msg = res.statusText;
    try { const j = await res.json(); msg = j.error || j.message || msg; } catch (_) {}
    throw new Error(msg);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function formatBytes(bytes) {
  if (bytes == null || isNaN(bytes)) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let v = Number(bytes);
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return (i === 0 ? v : v.toFixed(1)) + ' ' + units[i];
}

function formatNumber(n) {
  if (n == null) return '0';
  return Number(n).toLocaleString('en-US');
}

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  if (diff < 2592000) return Math.floor(diff / 86400) + 'd ago';
  return new Date(dateStr).toLocaleDateString();
}

function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function buildRsyncCommand(fd) {
  const parts = ['rsync'];
  if (fd.flags) parts.push(fd.flags.trim());
  if (fd.customFlags) parts.push(fd.customFlags.trim());
  if (fd.exclude) {
    fd.exclude.split(',').map(e => e.trim()).filter(Boolean).forEach(e => parts.push(`--exclude='${e}'`));
  }
  if (fd.bwlimit) parts.push(`--bwlimit=${fd.bwlimit}`);
  if (fd.remoteHost) {
    const port = fd.sshPort || '22';
    const keyPart = fd.sshKey ? ` -i ${fd.sshKey}` : '';
    parts.push(`-e 'ssh -p ${port}${keyPart}'`);
    parts.push(fd.source || '/source/');
    parts.push(`${fd.remoteHost}:${fd.dest || '/dest/'}`);
  } else {
    parts.push(fd.source || '/source/');
    parts.push(fd.dest || '/dest/');
  }
  return parts.join(' ');
}

function isAdmin() { return state.user && state.user.role === 'admin'; }
function isReadonly() { return state.user && state.user.role === 'readonly'; }

// --------------- Toast ---------------

let toastCounter = 0;
function showToast(message, type = 'success') {
  const id = ++toastCounter;
  state.toasts.push({ id, message, type });
  renderToasts();
  setTimeout(() => {
    state.toasts = state.toasts.filter(t => t.id !== id);
    renderToasts();
  }, 3500);
}

function renderToasts() {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
    document.body.appendChild(container);
  }
  container.innerHTML = state.toasts.map(t => `
    <div class="toast toast-${t.type}" style="
      padding:12px 20px;border-radius:8px;font-family:'JetBrains Mono',monospace;font-size:13px;
      color:#fff;min-width:240px;animation:slideInRight .3s ease;
      background:${t.type === 'error' ? '#DC2626' : '#16A34A'};
    ">${escapeHtml(t.message)}</div>
  `).join('');
}

// --------------- Confirm Dialog ---------------

function showConfirm(title, message, onConfirm) {
  state.confirmDialog = { title, message, onConfirm };
  renderConfirmDialog();
}

function renderConfirmDialog() {
  let el = document.getElementById('confirm-dialog-overlay');
  if (!state.confirmDialog) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement('div');
    el.id = 'confirm-dialog-overlay';
    document.body.appendChild(el);
  }
  const d = state.confirmDialog;
  el.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);z-index:2000;display:flex;align-items:center;justify-content:center;">
      <div style="background:#0F172A;border:1px solid #1E293B;border-radius:12px;width:100%;max-width:400px;animation:slideUp .2s ease;">
        <div style="padding:20px 24px;border-bottom:1px solid #1E293B;">
          <div style="font-family:'JetBrains Mono',monospace;font-size:16px;color:#F1F5F9;font-weight:600;display:flex;align-items:center;gap:10px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EAB308" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            ${escapeHtml(d.title)}
          </div>
        </div>
        <div style="padding:20px 24px;">
          <p style="font-family:'IBM Plex Sans',-apple-system,sans-serif;font-size:14px;color:#94A3B8;margin:0;line-height:1.6;">${escapeHtml(d.message)}</p>
        </div>
        <div style="padding:16px 24px;border-top:1px solid #1E293B;display:flex;justify-content:flex-end;gap:10px;">
          <button data-action="confirm-cancel" style="padding:8px 16px;background:none;border:1px solid #334155;border-radius:8px;color:#94A3B8;font-family:'JetBrains Mono',monospace;font-size:12px;cursor:pointer;">Cancel</button>
          <button data-action="confirm-ok" style="padding:8px 16px;background:#DC2626;border:none;border-radius:8px;color:#fff;font-family:'JetBrains Mono',monospace;font-size:12px;cursor:pointer;">Confirm</button>
        </div>
      </div>
    </div>
  `;
}

// --------------- Search Input Helper ---------------

function searchInput(id, placeholder, value) {
  return `
    <div style="position:relative;width:260px;">
      <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#64748B;">${icons.search}</span>
      <input id="${id}" type="text" value="${escapeHtml(value || '')}" placeholder="${placeholder}" style="width:100%;padding:8px 12px 8px 32px;background:#0F172A;border:1px solid #334155;border-radius:8px;color:#F1F5F9;font-family:'JetBrains Mono',monospace;font-size:12px;outline:none;box-sizing:border-box;" />
    </div>
  `;
}

// --------------- Navigation ---------------

function navigate(page) {
  state.page = page;
  window.location.hash = '#' + page;
  renderPage();
  loadPageData(page);
}

async function loadPageData(page) {
  try {
    switch (page) {
      case 'dashboard':
        const [stats, recentRuns] = await Promise.all([api('GET', '/api/stats'), api('GET', '/api/runs/recent')]);
        state.stats = stats || {};
        state.runs = recentRuns || [];
        renderPage();
        break;
      case 'jobs':
        state.jobs = await api('GET', '/api/jobs') || [];
        renderPage();
        break;
      case 'runs':
        state.runs = await api('GET', '/api/runs/recent') || [];
        state.expandedLog = null;
        renderPage();
        break;
      case 'crontab':
        const crontabData = await api('GET', '/api/crontab') || {};
        state.crontabEntries = crontabData.entries || [];
        renderPage();
        break;
      case 'users':
        if (isAdmin()) {
          state.users = await api('GET', '/api/users') || [];
          renderPage();
        }
        break;
    }
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// --------------- Rendering ---------------

function statusBadge(status) {
  const colors = {
    success: 'background:#065F46;color:#34D399;',
    completed: 'background:#065F46;color:#34D399;',
    failed: 'background:#7F1D1D;color:#F87171;',
    running: 'background:#4C1D95;color:#A78BFA;',
    pending: 'background:#1E3A5F;color:#60A5FA;',
  };
  const s = (status || 'unknown').toLowerCase();
  const style = colors[s] || 'background:#334155;color:#94A3B8;';
  return `<span style="display:inline-block;padding:2px 10px;border-radius:9999px;font-size:11px;font-family:'JetBrains Mono',monospace;${style}">${escapeHtml(status || 'unknown')}</span>`;
}

function statusDot(status) {
  const colors = { success: '#34D399', completed: '#34D399', failed: '#F87171', running: '#A78BFA', pending: '#60A5FA' };
  const c = colors[(status || '').toLowerCase()] || '#94A3B8';
  return `<span style="display:inline-flex;align-items:center;gap:6px;"><span style="width:8px;height:8px;border-radius:50%;background:${c};display:inline-block;"></span>${escapeHtml(status || 'unknown')}</span>`;
}

function renderSidebar() {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: icons.dashboard },
    { id: 'jobs', label: 'Jobs', icon: icons.jobs },
    { id: 'runs', label: 'Run History', icon: icons.history },
    { id: 'flags', label: 'Flags Reference', icon: icons.flag },
    { id: 'crontab', label: 'Crontab', icon: icons.terminal },
  ];
  if (isAdmin()) {
    navItems.push({ id: 'users', label: 'Users', icon: icons.users });
  }
  const initial = state.user ? state.user.username.charAt(0).toUpperCase() : '?';
  return `
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
        ${navItems.map(item => {
          const active = state.page === item.id;
          return `<a href="#${item.id}" data-nav="${item.id}" style="
            display:flex;align-items:center;gap:12px;padding:10px 24px;cursor:pointer;text-decoration:none;
            font-family:'JetBrains Mono',monospace;font-size:13px;transition:all .15s;
            ${active
              ? 'border-left:2px solid #3B82F6;background:rgba(59,130,246,0.08);color:#3B82F6;padding-left:22px;'
              : 'border-left:2px solid transparent;color:#94A3B8;padding-left:22px;'}
          ">${item.icon} ${item.label}</a>`;
        }).join('')}
      </nav>
      <div style="padding:16px 24px;border-top:1px solid #1E293B;display:flex;align-items:center;gap:12px;">
        <div style="width:36px;height:36px;border-radius:50%;background:#3B82F6;display:flex;align-items:center;justify-content:center;color:#fff;font-family:'JetBrains Mono',monospace;font-weight:700;font-size:14px;">${initial}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;color:#F1F5F9;font-family:'JetBrains Mono',monospace;">${escapeHtml(state.user?.username)}</div>
          <div style="font-size:11px;color:#64748B;font-family:'JetBrains Mono',monospace;">${escapeHtml(state.user?.role)}</div>
        </div>
        <button data-action="logout" title="Logout" style="background:none;border:none;color:#64748B;cursor:pointer;padding:4px;">${icons.logout}</button>
      </div>
    </aside>
  `;
}

function renderLogin() {
  return `
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
        <form id="login-form">
          <div style="margin-bottom:16px;">
            <label style="display:block;font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;color:#94A3B8;margin-bottom:6px;letter-spacing:1px;">Username</label>
            <input id="login-user" type="text" autocomplete="username" style="width:100%;padding:10px 14px;background:#020617;border:1px solid #1E293B;border-radius:8px;color:#F1F5F9;font-family:'JetBrains Mono',monospace;font-size:14px;outline:none;box-sizing:border-box;" />
          </div>
          <div style="margin-bottom:24px;">
            <label style="display:block;font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;color:#94A3B8;margin-bottom:6px;letter-spacing:1px;">Password</label>
            <input id="login-pass" type="password" autocomplete="current-password" style="width:100%;padding:10px 14px;background:#020617;border:1px solid #1E293B;border-radius:8px;color:#F1F5F9;font-family:'JetBrains Mono',monospace;font-size:14px;outline:none;box-sizing:border-box;" />
          </div>
          <div id="login-error" style="color:#F87171;font-size:12px;font-family:'JetBrains Mono',monospace;margin-bottom:12px;display:none;"></div>
          <button type="submit" style="width:100%;padding:12px;background:#3B82F6;border:none;border-radius:8px;color:#fff;font-family:'JetBrains Mono',monospace;font-size:13px;text-transform:uppercase;cursor:pointer;font-weight:600;letter-spacing:1px;">Login</button>
        </form>
        <div style="text-align:center;margin-top:20px;font-size:11px;color:#475569;font-family:'JetBrains Mono',monospace;">Default: admin / admin</div>
      </div>
    </div>
  `;
}

function renderDashboard() {
  const s = state.stats;
  const cards = [
    { label: 'Total Jobs', value: formatNumber(s.totalJobs), color: '#3B82F6' },
    { label: 'Scheduled', value: formatNumber(s.scheduledJobs), color: '#F1F5F9' },
    { label: 'Total Runs', value: formatNumber(s.totalRuns), color: '#F1F5F9' },
    { label: 'Successful', value: formatNumber(s.successfulRuns), color: '#34D399' },
    { label: 'Failed', value: formatNumber(s.failedRuns), color: '#F87171' },
    { label: 'Running', value: formatNumber(s.runningJobs), color: '#A78BFA' },
    { label: 'Data Transferred', value: formatBytes(s.totalBytes), color: '#F1F5F9' },
    { label: 'Files Synced', value: formatNumber(s.totalFiles), color: '#F1F5F9' },
  ];
  return `
    <div style="margin-bottom:32px;">
      <h1 style="font-family:'JetBrains Mono',monospace;font-weight:600;font-size:24px;margin:0;">
        <span style="color:#64748B;">~/</span><span style="color:#F1F5F9;">dashboard</span>
      </h1>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:32px;">
      ${cards.map(c => `
        <div style="background:#1E293B;border-radius:10px;padding:20px;border:1px solid #334155;">
          <div style="font-size:12px;color:#94A3B8;font-family:'JetBrains Mono',monospace;text-transform:uppercase;margin-bottom:8px;">${c.label}</div>
          <div style="font-size:28px;font-weight:700;color:${c.color};font-family:'JetBrains Mono',monospace;">${c.value}</div>
        </div>
      `).join('')}
    </div>
    <div style="background:#1E293B;border-radius:10px;border:1px solid #334155;overflow:hidden;">
      <div style="padding:16px 20px;border-bottom:1px solid #334155;">
        <span style="font-family:'JetBrains Mono',monospace;font-size:14px;color:#F1F5F9;font-weight:600;">Recent Activity</span>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:1px solid #334155;">
            ${['Job','Status','Started','Data','Files'].map(h => `<th style="padding:10px 16px;text-align:left;font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;color:#64748B;">${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${(state.runs || []).slice(0, 10).map(r => `
            <tr style="border-bottom:1px solid #1E293B;">
              <td style="padding:10px 16px;font-family:'JetBrains Mono',monospace;font-size:13px;color:#F1F5F9;">${escapeHtml(r.jobName || r.job_name || '—')}</td>
              <td style="padding:10px 16px;">${statusBadge(r.status)}</td>
              <td style="padding:10px 16px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#94A3B8;">${timeAgo(r.startedAt || r.started_at)}</td>
              <td style="padding:10px 16px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#94A3B8;">${formatBytes(r.bytesTransferred || r.bytes_transferred)}</td>
              <td style="padding:10px 16px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#94A3B8;">${formatNumber(r.filesTransferred || r.files_transferred)}</td>
            </tr>
          `).join('') || '<tr><td colspan="5" style="padding:24px;text-align:center;color:#64748B;font-family:\'JetBrains Mono\',monospace;font-size:13px;">No recent activity</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

function renderJobs() {
  const q = (state.jobSearch || '').toLowerCase();
  const filtered = (state.jobs || []).filter(j => {
    if (!q) return true;
    return (j.name || '').toLowerCase().includes(q)
      || (j.source || '').toLowerCase().includes(q)
      || (j.destination || j.dest || '').toLowerCase().includes(q);
  });
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
      <h1 style="font-family:'JetBrains Mono',monospace;font-weight:600;font-size:24px;margin:0;">
        <span style="color:#64748B;">~/</span><span style="color:#F1F5F9;">jobs</span>
      </h1>
      <div style="display:flex;align-items:center;gap:12px;">
        ${searchInput('job-search', 'Filter jobs...', state.jobSearch)}
        ${!isReadonly() ? `<button data-action="new-job" style="display:inline-flex;align-items:center;gap:6px;padding:8px 16px;background:#3B82F6;border:none;border-radius:8px;color:#fff;font-family:'JetBrains Mono',monospace;font-size:12px;cursor:pointer;">${icons.plus} New Job</button>` : ''}
      </div>
    </div>
    <div style="background:#1E293B;border-radius:10px;border:1px solid #334155;overflow:hidden;">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:1px solid #334155;">
            ${['Name','Source / Dest','Schedule','Last Run','Status','Total Data','Actions'].map(h => `<th style="padding:10px 16px;text-align:left;font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;color:#64748B;">${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${filtered.map(j => {
            const isRunning = (j.status || '').toLowerCase() === 'running';
            const sched = j.schedule || j.cron;
            const schedBadge = sched
              ? `<span style="background:#065F46;color:#34D399;padding:2px 8px;border-radius:9999px;font-size:11px;font-family:'JetBrains Mono',monospace;">${escapeHtml(sched)}</span>`
              : `<span style="background:#334155;color:#94A3B8;padding:2px 8px;border-radius:9999px;font-size:11px;font-family:'JetBrains Mono',monospace;">manual</span>`;
            let actions = '';
            if (isReadonly()) {
              actions = `<button data-action="view-job" data-id="${j.id}" title="View" style="padding:4px 8px;background:none;border:1px solid #475569;border-radius:6px;color:#94A3B8;cursor:pointer;">${icons.eye}</button>`;
            } else {
              if (isRunning) {
                actions += `<button data-action="view-job" data-id="${j.id}" title="View" style="padding:4px 8px;background:none;border:1px solid #475569;border-radius:6px;color:#94A3B8;cursor:pointer;margin-right:4px;">${icons.eye}</button>`;
                actions += `<button disabled title="Running..." style="padding:4px 8px;background:none;border:1px solid #334155;border-radius:6px;color:#475569;cursor:not-allowed;margin-right:4px;">${icons.play}</button>`;
              } else {
                actions += `<button data-action="run-job" data-id="${j.id}" title="Run" style="padding:4px 8px;background:none;border:1px solid #16A34A;border-radius:6px;color:#34D399;cursor:pointer;margin-right:4px;">${icons.play}</button>`;
              }
              actions += `<button data-action="edit-job" data-id="${j.id}" title="Edit" style="padding:4px 8px;background:none;border:1px solid #475569;border-radius:6px;color:#94A3B8;cursor:pointer;margin-right:4px;">${icons.edit}</button>`;
              actions += `<button data-action="clone-job" data-id="${j.id}" title="Clone" style="padding:4px 8px;background:none;border:1px solid #475569;border-radius:6px;color:#94A3B8;cursor:pointer;margin-right:4px;">${icons.clone}</button>`;
              actions += `<button data-action="delete-job" data-id="${j.id}" title="Delete" style="padding:4px 8px;background:none;border:1px solid #DC2626;border-radius:6px;color:#F87171;cursor:pointer;">${icons.delete}</button>`;
            }
            return `<tr style="border-bottom:1px solid #1E293B;">
              <td style="padding:10px 16px;font-family:'JetBrains Mono',monospace;font-size:13px;color:#F1F5F9;">${escapeHtml(j.name)}</td>
              <td style="padding:10px 16px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#94A3B8;">${escapeHtml(j.source || '')} <span style="color:#3B82F6;">&rarr;</span> ${escapeHtml(j.dest || j.destination || '')}</td>
              <td style="padding:10px 16px;">${schedBadge}</td>
              <td style="padding:10px 16px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#94A3B8;">${timeAgo(j.lastRun || j.last_run)}</td>
              <td style="padding:10px 16px;">${statusDot(j.status)}</td>
              <td style="padding:10px 16px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#94A3B8;">${formatBytes(j.totalBytes || j.total_bytes)}</td>
              <td style="padding:10px 16px;">${actions}</td>
            </tr>`;
          }).join('') || '<tr><td colspan="7" style="padding:24px;text-align:center;color:#64748B;font-family:\'JetBrains Mono\',monospace;font-size:13px;">No jobs configured</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

function renderRuns() {
  let logSection = '';
  if (state.expandedLog) {
    logSection = `
      <div style="margin-top:16px;background:#1E293B;border-radius:10px;border:1px solid #334155;overflow:hidden;">
        <div style="padding:12px 20px;border-bottom:1px solid #334155;display:flex;justify-content:space-between;align-items:center;">
          <span style="font-family:'JetBrains Mono',monospace;font-size:13px;color:#F1F5F9;">Log &mdash; Run #${escapeHtml(String(state.expandedLog.runId))}</span>
          <button data-action="close-log" style="background:none;border:none;color:#64748B;cursor:pointer;">${icons.x}</button>
        </div>
        <pre style="margin:0;padding:16px 20px;background:#020617;font-family:'JetBrains Mono',monospace;font-size:12px;color:#94A3B8;max-height:400px;overflow:auto;white-space:pre-wrap;">${escapeHtml(state.expandedLog.content || 'No log content available.')}</pre>
      </div>
    `;
  }
  const rq = (state.runSearch || '').toLowerCase();
  const filteredRuns = (state.runs || []).filter(r => {
    if (!rq) return true;
    return (r.jobName || r.job_name || '').toLowerCase().includes(rq)
      || (r.status || '').toLowerCase().includes(rq);
  });
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:12px;">
      <h1 style="font-family:'JetBrains Mono',monospace;font-weight:600;font-size:24px;margin:0;">
        <span style="color:#64748B;">~/</span><span style="color:#F1F5F9;">run-history</span>
      </h1>
      <div style="display:flex;align-items:center;gap:12px;">
        ${searchInput('run-search', 'Filter runs...', state.runSearch)}
        <button data-action="refresh-runs" style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:#1E293B;border:1px solid #334155;border-radius:8px;color:#94A3B8;font-family:'JetBrains Mono',monospace;font-size:12px;cursor:pointer;">${icons.refresh} Refresh</button>
      </div>
    </div>
    <p style="color:#64748B;font-family:'JetBrains Mono',monospace;font-size:12px;margin-bottom:20px;">View all rsync job run history and logs.</p>
    <div style="background:#1E293B;border-radius:10px;border:1px solid #334155;overflow:hidden;">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:1px solid #334155;">
            ${['Job','Run ID','Status','Started','Data','Files','Log'].map(h => `<th style="padding:10px 16px;text-align:left;font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;color:#64748B;">${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${filteredRuns.map(r => `
            <tr style="border-bottom:1px solid #1E293B;">
              <td style="padding:10px 16px;font-family:'JetBrains Mono',monospace;font-size:13px;color:#F1F5F9;">${escapeHtml(r.jobName || r.job_name || '—')}</td>
              <td style="padding:10px 16px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#94A3B8;">#${r.id}</td>
              <td style="padding:10px 16px;">${statusBadge(r.status)}</td>
              <td style="padding:10px 16px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#94A3B8;">${timeAgo(r.startedAt || r.started_at)}</td>
              <td style="padding:10px 16px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#94A3B8;">${formatBytes(r.bytesTransferred || r.bytes_transferred)}</td>
              <td style="padding:10px 16px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#94A3B8;">${formatNumber(r.filesTransferred || r.files_transferred)}</td>
              <td style="padding:10px 16px;">
                <button data-action="view-log" data-id="${r.id}" title="View Log" style="padding:4px 8px;background:none;border:1px solid #475569;border-radius:6px;color:#94A3B8;cursor:pointer;">${icons.eye}</button>
              </td>
            </tr>
          `).join('') || '<tr><td colspan="7" style="padding:24px;text-align:center;color:#64748B;font-family:\'JetBrains Mono\',monospace;font-size:13px;">No runs recorded</td></tr>'}
        </tbody>
      </table>
    </div>
    ${logSection}
  `;
}

function renderCrontab() {
  const entries = state.crontabEntries || [];
  let content;
  if (entries.length === 0) {
    content = `<div style="padding:32px;text-align:center;color:#64748B;font-family:'JetBrains Mono',monospace;font-size:13px;">No rsync entries found in system crontab</div>`;
  } else {
    content = entries.map(e => `
      <div style="background:#0F172A;border-radius:8px;padding:14px 18px;margin:12px 16px;">
        <span style="font-family:'JetBrains Mono',monospace;font-size:13px;color:#34D399;">${escapeHtml(e.schedule || e.cron || '')}</span>
        <div style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#94A3B8;margin-top:6px;">${escapeHtml(e.command || e.cmd || '')}</div>
      </div>
    `).join('');
  }
  return `
    <div style="margin-bottom:24px;">
      <h1 style="font-family:'JetBrains Mono',monospace;font-weight:600;font-size:24px;margin:0;">
        <span style="color:#64748B;">~/</span><span style="color:#F1F5F9;">crontab</span>
      </h1>
    </div>
    <div style="background:#1E293B;border-radius:10px;border:1px solid #334155;overflow:hidden;">
      ${content}
    </div>
  `;
}

function renderUsers() {
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
      <h1 style="font-family:'JetBrains Mono',monospace;font-weight:600;font-size:24px;margin:0;">
        <span style="color:#64748B;">~/</span><span style="color:#F1F5F9;">users</span>
      </h1>
      <button data-action="new-user" style="display:inline-flex;align-items:center;gap:6px;padding:8px 16px;background:#3B82F6;border:none;border-radius:8px;color:#fff;font-family:'JetBrains Mono',monospace;font-size:12px;cursor:pointer;">${icons.plus} Add User</button>
    </div>
    <div style="background:#1E293B;border-radius:10px;border:1px solid #334155;overflow:hidden;">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:1px solid #334155;">
            ${['Username','Role','Created','Last Login','Actions'].map(h => `<th style="padding:10px 16px;text-align:left;font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;color:#64748B;">${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${(state.users || []).map(u => {
            const roleBadge = { admin: 'background:#1E3A5F;color:#60A5FA;', rsync: 'background:#065F46;color:#34D399;', readonly: 'background:#334155;color:#94A3B8;' };
            const rs = roleBadge[u.role] || roleBadge.readonly;
            return `<tr style="border-bottom:1px solid #1E293B;">
              <td style="padding:10px 16px;font-family:'JetBrains Mono',monospace;font-size:13px;color:#F1F5F9;">${escapeHtml(u.username)}</td>
              <td style="padding:10px 16px;"><span style="display:inline-block;padding:2px 10px;border-radius:9999px;font-size:11px;font-family:'JetBrains Mono',monospace;${rs}">${escapeHtml(u.role)}</span></td>
              <td style="padding:10px 16px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#94A3B8;">${timeAgo(u.createdAt || u.created_at)}</td>
              <td style="padding:10px 16px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#94A3B8;">${timeAgo(u.lastLogin || u.last_login)}</td>
              <td style="padding:10px 16px;">
                <button data-action="edit-user" data-id="${u.id}" title="Edit" style="padding:4px 8px;background:none;border:1px solid #475569;border-radius:6px;color:#94A3B8;cursor:pointer;margin-right:4px;">${icons.edit}</button>
                <button data-action="delete-user" data-id="${u.id}" title="Delete" style="padding:4px 8px;background:none;border:1px solid #DC2626;border-radius:6px;color:#F87171;cursor:pointer;">${icons.delete}</button>
              </td>
            </tr>`;
          }).join('') || '<tr><td colspan="5" style="padding:24px;text-align:center;color:#64748B;font-family:\'JetBrains Mono\',monospace;font-size:13px;">No users</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

// --------------- Flags Reference Page ---------------

function renderFlagsReference() {
  return `
    <div style="margin-bottom:24px;">
      <h1 style="font-family:'JetBrains Mono',monospace;font-weight:600;font-size:24px;margin:0 0 8px;">
        <span style="color:#64748B;">~/</span><span style="color:#F1F5F9;">flags-reference</span>
      </h1>
      <p style="font-family:'IBM Plex Sans',-apple-system,sans-serif;font-size:14px;color:#94A3B8;margin:0;">
        Detailed descriptions of all rsync flags available when configuring jobs.
      </p>
    </div>
    <div style="display:flex;flex-direction:column;gap:12px;">
      ${ALL_FLAGS.map(f => `
        <div style="background:#1E293B;border:1px solid #334155;border-radius:12px;padding:20px;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
            <span style="display:inline-block;padding:4px 14px;border-radius:9999px;font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:600;background:rgba(59,130,246,0.12);border:1px solid #3B82F6;color:#60A5FA;">${f.flag}</span>
            <span style="font-family:'JetBrains Mono',monospace;font-size:14px;color:#F1F5F9;font-weight:500;">${f.label}</span>
          </div>
          <p style="font-family:'IBM Plex Sans',-apple-system,sans-serif;font-size:13px;color:#94A3B8;line-height:1.7;margin:0;">${f.desc}</p>
          <div style="margin-top:12px;">
            <code style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#22C55E;background:#020617;padding:6px 12px;border-radius:6px;display:inline-block;">rsync ${f.flag} /source/ /dest/</code>
          </div>
        </div>
      `).join('')}
    </div>

    <div style="margin-top:32px;margin-bottom:24px;">
      <h2 style="font-family:'JetBrains Mono',monospace;font-weight:600;font-size:18px;margin:0 0 8px;">
        <span style="color:#64748B;">~/</span><span style="color:#F1F5F9;">advanced-options</span>
      </h2>
      <p style="font-family:'IBM Plex Sans',-apple-system,sans-serif;font-size:14px;color:#94A3B8;margin:0;">
        Additional job configuration options beyond flag toggles.
      </p>
    </div>
    <div style="display:flex;flex-direction:column;gap:12px;">

      <div style="background:#1E293B;border:1px solid #334155;border-radius:12px;padding:20px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
          <span style="display:inline-block;padding:4px 14px;border-radius:9999px;font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:600;background:rgba(234,179,8,0.12);border:1px solid #EAB308;color:#FACC15;">--exclude</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:14px;color:#F1F5F9;font-weight:500;">Exclude Patterns</span>
        </div>
        <p style="font-family:'IBM Plex Sans',-apple-system,sans-serif;font-size:13px;color:#94A3B8;line-height:1.7;margin:0 0 8px;">
          Exclude files or directories matching the given patterns. Patterns are matched against the relative path from the source directory.
          Each pattern goes on its own line in the text area. Supports wildcards: <code style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#60A5FA;background:#020617;padding:2px 6px;border-radius:4px;">*</code> matches any non-slash characters,
          <code style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#60A5FA;background:#020617;padding:2px 6px;border-radius:4px;">**</code> matches everything including slashes,
          <code style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#60A5FA;background:#020617;padding:2px 6px;border-radius:4px;">?</code> matches any single character.
        </p>
        <div style="display:flex;flex-direction:column;gap:6px;margin-top:12px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <code style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#22C55E;background:#020617;padding:6px 12px;border-radius:6px;min-width:280px;">--exclude '*.log'</code>
            <span style="font-family:'IBM Plex Sans',sans-serif;font-size:13px;color:#94A3B8;">Skip all log files</span>
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            <code style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#22C55E;background:#020617;padding:6px 12px;border-radius:6px;min-width:280px;">--exclude 'node_modules/'</code>
            <span style="font-family:'IBM Plex Sans',sans-serif;font-size:13px;color:#94A3B8;">Skip node_modules directories</span>
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            <code style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#22C55E;background:#020617;padding:6px 12px;border-radius:6px;min-width:280px;">--exclude '.git/' --exclude '*.tmp'</code>
            <span style="font-family:'IBM Plex Sans',sans-serif;font-size:13px;color:#94A3B8;">Multiple patterns (one per line in the UI)</span>
          </div>
        </div>
      </div>

      <div style="background:#1E293B;border:1px solid #334155;border-radius:12px;padding:20px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
          <span style="display:inline-block;padding:4px 14px;border-radius:9999px;font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:600;background:rgba(234,179,8,0.12);border:1px solid #EAB308;color:#FACC15;">--bwlimit</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:14px;color:#F1F5F9;font-weight:500;">Bandwidth Limit</span>
        </div>
        <p style="font-family:'IBM Plex Sans',-apple-system,sans-serif;font-size:13px;color:#94A3B8;line-height:1.7;margin:0 0 8px;">
          Limits the transfer rate to the specified value in kilobytes per second. Prevents rsync from saturating the network link, which is critical for
          production servers where other services share the same bandwidth. Set to <code style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#60A5FA;background:#020617;padding:2px 6px;border-radius:4px;">0</code> for unlimited.
          You can also use suffixes: <code style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#60A5FA;background:#020617;padding:2px 6px;border-radius:4px;">m</code> for MBps,
          <code style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#60A5FA;background:#020617;padding:2px 6px;border-radius:4px;">g</code> for GBps.
        </p>
        <div style="display:flex;flex-direction:column;gap:6px;margin-top:12px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <code style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#22C55E;background:#020617;padding:6px 12px;border-radius:6px;min-width:280px;">--bwlimit=5000</code>
            <span style="font-family:'IBM Plex Sans',sans-serif;font-size:13px;color:#94A3B8;">Limit to 5,000 KB/s (~5 MB/s)</span>
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            <code style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#22C55E;background:#020617;padding:6px 12px;border-radius:6px;min-width:280px;">--bwlimit=10m</code>
            <span style="font-family:'IBM Plex Sans',sans-serif;font-size:13px;color:#94A3B8;">Limit to 10 MB/s</span>
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            <code style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#22C55E;background:#020617;padding:6px 12px;border-radius:6px;min-width:280px;">--bwlimit=0</code>
            <span style="font-family:'IBM Plex Sans',sans-serif;font-size:13px;color:#94A3B8;">No limit (default)</span>
          </div>
        </div>
      </div>

      <div style="background:#1E293B;border:1px solid #334155;border-radius:12px;padding:20px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
          <span style="display:inline-block;padding:4px 14px;border-radius:9999px;font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:600;background:rgba(234,179,8,0.12);border:1px solid #EAB308;color:#FACC15;">custom</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:14px;color:#F1F5F9;font-weight:500;">Custom Flags</span>
        </div>
        <p style="font-family:'IBM Plex Sans',-apple-system,sans-serif;font-size:13px;color:#94A3B8;line-height:1.7;margin:0 0 8px;">
          Append any additional rsync flags not covered by the toggle chips above. Entered as a raw space-separated string and appended to the command verbatim.
          Useful for one-off options like <code style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#60A5FA;background:#020617;padding:2px 6px;border-radius:4px;">--max-size</code>,
          <code style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#60A5FA;background:#020617;padding:2px 6px;border-radius:4px;">--min-size</code>,
          <code style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#60A5FA;background:#020617;padding:2px 6px;border-radius:4px;">--include</code>,
          or <code style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#60A5FA;background:#020617;padding:2px 6px;border-radius:4px;">--backup-dir</code>.
        </p>
        <div style="display:flex;flex-direction:column;gap:6px;margin-top:12px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <code style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#22C55E;background:#020617;padding:6px 12px;border-radius:6px;min-width:280px;">--max-size=100m --timeout=300</code>
            <span style="font-family:'IBM Plex Sans',sans-serif;font-size:13px;color:#94A3B8;">Skip files over 100MB, timeout after 5 min</span>
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            <code style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#22C55E;background:#020617;padding:6px 12px;border-radius:6px;min-width:280px;">--backup --backup-dir=/backups/old</code>
            <span style="font-family:'IBM Plex Sans',sans-serif;font-size:13px;color:#94A3B8;">Keep overwritten files in a backup directory</span>
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            <code style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#22C55E;background:#020617;padding:6px 12px;border-radius:6px;min-width:280px;">--chmod=Du=rwx,Dg=rx,Fu=rw,Fg=r</code>
            <span style="font-family:'IBM Plex Sans',sans-serif;font-size:13px;color:#94A3B8;">Override permissions on destination</span>
          </div>
        </div>
      </div>

    </div>

    <div style="margin-top:24px;padding:20px;background:#1E293B;border:1px solid #334155;border-radius:12px;">
      <h2 style="font-family:'JetBrains Mono',monospace;font-size:14px;color:#F1F5F9;margin:0 0 12px;">Common Combinations</h2>
      <div style="display:flex;flex-direction:column;gap:8px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <code style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#22C55E;background:#020617;padding:6px 12px;border-radius:6px;min-width:200px;">rsync -avh</code>
          <span style="font-family:'IBM Plex Sans',sans-serif;font-size:13px;color:#94A3B8;">Standard backup — archive mode, verbose, human-readable</span>
        </div>
        <div style="display:flex;align-items:center;gap:12px;">
          <code style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#22C55E;background:#020617;padding:6px 12px;border-radius:6px;min-width:200px;">rsync -avhz --delete</code>
          <span style="font-family:'IBM Plex Sans',sans-serif;font-size:13px;color:#94A3B8;">Mirror sync — compressed, removes deleted files from destination</span>
        </div>
        <div style="display:flex;align-items:center;gap:12px;">
          <code style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#22C55E;background:#020617;padding:6px 12px;border-radius:6px;min-width:200px;">rsync -avhP</code>
          <span style="font-family:'IBM Plex Sans',sans-serif;font-size:13px;color:#94A3B8;">Resumable backup — shows progress, keeps partial files</span>
        </div>
        <div style="display:flex;align-items:center;gap:12px;">
          <code style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#22C55E;background:#020617;padding:6px 12px;border-radius:6px;min-width:200px;">rsync -avhn --delete</code>
          <span style="font-family:'IBM Plex Sans',sans-serif;font-size:13px;color:#94A3B8;">Dry-run mirror — preview what would be deleted before committing</span>
        </div>
      </div>
    </div>
  `;
}

// --------------- Modals ---------------

const ALL_FLAGS = [
  { flag: '-a', label: 'archive', desc: 'Equivalent to -rlptgoD. Preserves permissions, timestamps, symbolic links, owner, group, and device files. The most commonly used flag for backups.' },
  { flag: '-v', label: 'verbose', desc: 'Increases verbosity. Shows files being transferred and gives a summary at the end. Use -vv or -vvv for more detail.' },
  { flag: '-h', label: 'human', desc: 'Outputs numbers (file sizes, transfer rates) in a human-readable format (e.g., 1.2G instead of 1234567890).' },
  { flag: '-z', label: 'compress', desc: 'Compresses data during transfer using zlib. Reduces bandwidth usage but adds CPU overhead. Most beneficial for slow network links.' },
  { flag: '-P', label: 'progress', desc: 'Combines --progress and --partial. Shows per-file transfer progress and keeps partially transferred files so interrupted transfers can resume.' },
  { flag: '--delete', label: 'delete', desc: 'Deletes files on the destination that no longer exist on the source. Makes destination an exact mirror. Use with caution — data on destination can be permanently removed.' },
  { flag: '-n', label: 'dry-run', desc: 'Performs a trial run without making any changes. Shows what would be transferred or deleted. Always recommended before running --delete for the first time.' },
  { flag: '--partial', label: 'partial', desc: 'Keeps partially transferred files instead of deleting them. Allows interrupted transfers to be resumed without starting over.' },
  { flag: '-r', label: 'recursive', desc: 'Copies directories recursively. Already included when using -a (archive mode), so only needed when not using -a.' },
  { flag: '-u', label: 'update', desc: 'Skips files that are newer on the destination than on the source. Prevents overwriting newer changes on the destination.' },
  { flag: '-c', label: 'checksum', desc: 'Uses checksum (MD5/MD4) instead of modification time and size to determine if files have changed. Slower but more accurate.' },
  { flag: '-H', label: 'hardlinks', desc: 'Preserves hard links between files. Without this flag, hard-linked files are transferred as separate copies.' },
  { flag: '-A', label: 'acls', desc: 'Preserves Access Control Lists (ACLs). Required when source filesystem uses ACLs for fine-grained permissions beyond standard Unix permissions.' },
  { flag: '-X', label: 'xattrs', desc: 'Preserves extended attributes (xattrs). Used for SELinux contexts, capabilities, and other metadata stored in extended attributes.' },
  { flag: '--stats', label: 'stats', desc: 'Prints a detailed summary of the transfer including bytes sent/received, speedup ratio, and file counts. Automatically appended by RynctlMonitor for metric tracking.' },
];
const DEFAULT_FLAGS = ['-a', '-v', '-h'];

function getJobFormData() {
  const g = id => { const el = document.getElementById(id); return el ? el.value : ''; };
  const selectedFlags = [];
  document.querySelectorAll('.flag-chip.selected').forEach(chip => {
    selectedFlags.push(chip.dataset.flag);
  });
  return {
    name: g('jf-name'),
    source: g('jf-source'),
    dest: g('jf-dest'),
    remoteHost: g('jf-remote-host'),
    sshPort: g('jf-ssh-port'),
    sshKey: g('jf-ssh-key'),
    flags: selectedFlags.join(' '),
    exclude: g('jf-exclude'),
    bwlimit: g('jf-bwlimit'),
    customFlags: g('jf-custom-flags'),
    schedule: g('jf-schedule'),
    scheduleEnabled: document.getElementById('jf-schedule-enabled')?.checked || false,
  };
}

function updateCommandPreview() {
  const preview = document.getElementById('jf-cmd-preview');
  if (!preview) return;
  const fd = getJobFormData();
  const cmd = buildRsyncCommand(fd);
  preview.innerHTML = `<span style="color:#64748B;">$ </span><span style="color:#34D399;">${escapeHtml(cmd)}</span>`;
}

function renderJobModal(job) {
  const isEdit = !!job;
  const title = isEdit ? 'Edit rsync Job' : 'New rsync Job';
  const selectedFlags = isEdit && job.flags
    ? job.flags.split(/\s+/).filter(Boolean)
    : [...DEFAULT_FLAGS];

  const inp = (id, label, value, placeholder, colStyle, required) => `
    <div style="${colStyle || ''}">
      <label style="display:block;font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;color:#94A3B8;margin-bottom:6px;letter-spacing:1px;">${label}${required ? ' <span style="color:#EF4444;">*</span>' : ''}</label>
      <input id="${id}" type="text" value="${escapeHtml(value || '')}" placeholder="${placeholder || ''}" ${required ? 'required' : ''} style="width:100%;padding:8px 12px;background:#020617;border:1px solid #1E293B;border-radius:6px;color:#F1F5F9;font-family:'JetBrains Mono',monospace;font-size:13px;outline:none;box-sizing:border-box;" />
    </div>
  `;

  return `
    <div id="modal-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);z-index:1000;display:flex;align-items:center;justify-content:center;">
      <div style="background:#0F172A;border:1px solid #1E293B;border-radius:12px;width:100%;max-width:720px;max-height:90vh;overflow-y:auto;animation:slideUp .25s ease;" id="job-modal">
        <div style="padding:20px 24px;border-bottom:1px solid #1E293B;display:flex;justify-content:space-between;align-items:center;">
          <span style="font-family:'JetBrains Mono',monospace;font-size:16px;color:#F1F5F9;font-weight:600;">${title}</span>
          <button data-action="close-modal" style="background:none;border:none;color:#64748B;cursor:pointer;">${icons.x}</button>
        </div>
        <div style="padding:24px;" id="job-form-body">
          ${inp('jf-name', 'Job Name', job?.name, 'my-backup-job', '', true)}
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;">
            <div>
              ${inp('jf-source', 'Source Path', job?.source, '/path/to/source/', '', true)}
              <div style="font-size:10px;color:#EAB308;font-family:'JetBrains Mono',monospace;margin-top:4px;display:flex;align-items:center;gap:4px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#EAB308" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Trailing / syncs contents only &mdash; without / syncs the folder itself
              </div>
            </div>
            ${inp('jf-dest', 'Destination Path', job?.dest || job?.destination, '/path/to/dest/', '', true)}
          </div>
          <div style="display:grid;grid-template-columns:5fr 2fr 5fr;gap:16px;margin-top:16px;">
            ${inp('jf-remote-host', 'Remote Host', job?.remoteHost || job?.remote_host, 'user@host', '')}
            ${inp('jf-ssh-port', 'SSH Port', job?.sshPort || job?.ssh_port || '22', '22', '')}
            ${inp('jf-ssh-key', 'SSH Key Path', job?.sshKey || job?.ssh_key, '~/.ssh/id_rsa', '')}
          </div>
          <div style="margin-top:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <label style="font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;color:#94A3B8;letter-spacing:1px;">Flags</label>
              <a href="#flags" data-action="close-modal" style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#60A5FA;text-decoration:none;cursor:pointer;" onclick="state.modal=null;navigate('flags');">View all flag details &rarr;</a>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;">
              ${ALL_FLAGS.map(f => {
                const sel = selectedFlags.includes(f.flag);
                return `<span class="flag-chip${sel ? ' selected' : ''}" data-flag="${f.flag}" style="
                  padding:4px 12px;border-radius:9999px;font-family:'JetBrains Mono',monospace;font-size:12px;cursor:pointer;
                  border:1px solid ${sel ? '#3B82F6' : '#334155'};
                  background:${sel ? 'rgba(59,130,246,0.15)' : 'transparent'};
                  color:${sel ? '#60A5FA' : '#94A3B8'};
                  transition:all .15s;user-select:none;
                ">${f.flag}&nbsp; <span style="color:${sel ? '#93C5FD' : '#64748B'};">${f.label}</span></span>`;
              }).join('')}
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;">
            ${inp('jf-exclude', 'Exclude Patterns', job?.exclude, '.git,node_modules', '')}
            ${inp('jf-bwlimit', 'Bandwidth Limit', job?.bwlimit, '0 (unlimited)', '')}
          </div>
          ${inp('jf-custom-flags', 'Custom Flags', job?.customFlags || job?.custom_flags, '--timeout=300', 'margin-top:16px;')}
          <div style="display:grid;grid-template-columns:1fr auto;gap:16px;margin-top:16px;align-items:end;">
            ${inp('jf-schedule', 'Cron Schedule', job?.schedule || job?.cron, '0 */6 * * *', '')}
            <div>
              <label style="display:block;font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;color:#94A3B8;margin-bottom:6px;letter-spacing:1px;">Enabled</label>
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:8px 0;">
                <input id="jf-schedule-enabled" type="checkbox" ${job?.scheduleEnabled || job?.schedule_enabled ? 'checked' : ''} style="width:18px;height:18px;accent-color:#3B82F6;" />
                <span style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#94A3B8;">Active</span>
              </label>
            </div>
          </div>
          <div style="margin-top:16px;">
            <label style="display:block;font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;color:#94A3B8;margin-bottom:6px;letter-spacing:1px;">Command Preview</label>
            <div id="jf-cmd-preview" style="padding:12px 16px;background:#020617;border-radius:8px;font-family:'JetBrains Mono',monospace;font-size:12px;overflow-x:auto;">
              <span style="color:#64748B;">$ </span><span style="color:#34D399;">rsync -avh /source/ /dest/</span>
            </div>
          </div>
        </div>
        <div style="padding:16px 24px;border-top:1px solid #1E293B;display:flex;justify-content:flex-end;gap:10px;">
          <button data-action="preview-cmd" style="padding:8px 14px;background:none;border:none;color:#94A3B8;font-family:'JetBrains Mono',monospace;font-size:12px;cursor:pointer;">Preview Command</button>
          <button data-action="close-modal" style="padding:8px 16px;background:none;border:1px solid #334155;border-radius:8px;color:#94A3B8;font-family:'JetBrains Mono',monospace;font-size:12px;cursor:pointer;">Cancel</button>
          <button data-action="save-job" data-id="${job?.id || ''}" style="padding:8px 16px;background:#3B82F6;border:none;border-radius:8px;color:#fff;font-family:'JetBrains Mono',monospace;font-size:12px;cursor:pointer;">${isEdit ? 'Save Job' : 'Create Job'}</button>
        </div>
      </div>
    </div>
  `;
}

function renderUserModal(user) {
  const isEdit = !!user;
  const title = isEdit ? 'Edit User' : 'Add User';
  return `
    <div id="modal-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);z-index:1000;display:flex;align-items:center;justify-content:center;">
      <div style="background:#0F172A;border:1px solid #1E293B;border-radius:12px;width:100%;max-width:420px;animation:slideUp .25s ease;">
        <div style="padding:20px 24px;border-bottom:1px solid #1E293B;display:flex;justify-content:space-between;align-items:center;">
          <span style="font-family:'JetBrains Mono',monospace;font-size:16px;color:#F1F5F9;font-weight:600;">${title}</span>
          <button data-action="close-modal" style="background:none;border:none;color:#64748B;cursor:pointer;">${icons.x}</button>
        </div>
        <div style="padding:24px;">
          <div style="margin-bottom:16px;">
            <label style="display:block;font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;color:#94A3B8;margin-bottom:6px;letter-spacing:1px;">Username</label>
            <input id="uf-username" type="text" value="${escapeHtml(user?.username || '')}" style="width:100%;padding:8px 12px;background:#020617;border:1px solid #1E293B;border-radius:6px;color:#F1F5F9;font-family:'JetBrains Mono',monospace;font-size:13px;outline:none;box-sizing:border-box;" />
          </div>
          <div style="margin-bottom:16px;">
            <label style="display:block;font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;color:#94A3B8;margin-bottom:6px;letter-spacing:1px;">Password${isEdit ? ' (leave blank to keep)' : ''}</label>
            <input id="uf-password" type="password" style="width:100%;padding:8px 12px;background:#020617;border:1px solid #1E293B;border-radius:6px;color:#F1F5F9;font-family:'JetBrains Mono',monospace;font-size:13px;outline:none;box-sizing:border-box;" />
          </div>
          <div>
            <label style="display:block;font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;color:#94A3B8;margin-bottom:6px;letter-spacing:1px;">Role</label>
            <select id="uf-role" style="width:100%;padding:8px 12px;background:#020617;border:1px solid #1E293B;border-radius:6px;color:#F1F5F9;font-family:'JetBrains Mono',monospace;font-size:13px;outline:none;box-sizing:border-box;">
              <option value="admin" ${user?.role === 'admin' ? 'selected' : ''}>admin</option>
              <option value="rsync" ${user?.role === 'rsync' ? 'selected' : ''}>rsync</option>
              <option value="readonly" ${user?.role === 'readonly' ? 'selected' : ''}>readonly</option>
            </select>
          </div>
        </div>
        <div style="padding:16px 24px;border-top:1px solid #1E293B;display:flex;justify-content:flex-end;gap:10px;">
          <button data-action="close-modal" style="padding:8px 16px;background:none;border:1px solid #334155;border-radius:8px;color:#94A3B8;font-family:'JetBrains Mono',monospace;font-size:12px;cursor:pointer;">Cancel</button>
          <button data-action="save-user" data-id="${user?.id || ''}" style="padding:8px 16px;background:#3B82F6;border:none;border-radius:8px;color:#fff;font-family:'JetBrains Mono',monospace;font-size:12px;cursor:pointer;">${isEdit ? 'Save' : 'Create User'}</button>
        </div>
      </div>
    </div>
  `;
}

// --------------- Main Render ---------------

function renderPage() {
  const app = document.getElementById('app');
  if (!app) return;

  if (state.page === 'login' || !state.user) {
    app.innerHTML = renderLogin();
    return;
  }

  let pageContent = '';
  switch (state.page) {
    case 'dashboard': pageContent = renderDashboard(); break;
    case 'jobs': pageContent = renderJobs(); break;
    case 'runs': pageContent = renderRuns(); break;
    case 'flags': pageContent = renderFlagsReference(); break;
    case 'crontab': pageContent = renderCrontab(); break;
    case 'users': pageContent = isAdmin() ? renderUsers() : renderDashboard(); break;
    default: pageContent = renderDashboard();
  }

  let modalHtml = '';
  if (state.modal) {
    if (state.modal.type === 'job') modalHtml = renderJobModal(state.modal.data);
    if (state.modal.type === 'user') modalHtml = renderUserModal(state.modal.data);
  }

  app.innerHTML = `
    ${renderSidebar()}
    <main style="margin-left:240px;padding:28px 36px;min-height:100vh;">
      ${pageContent}
    </main>
    ${modalHtml}
  `;

  // If job modal is open, attach input listeners for live preview
  if (state.modal?.type === 'job') {
    setTimeout(() => {
      updateCommandPreview();
      const formBody = document.getElementById('job-form-body');
      if (formBody) {
        formBody.addEventListener('input', updateCommandPreview);
      }
    }, 0);
  }
}

// --------------- Event Delegation ---------------

document.addEventListener('click', async (e) => {
  const target = e.target.closest('[data-action]') || e.target.closest('[data-nav]');
  if (!target) {
    // Close modal if clicking overlay background
    if (e.target.id === 'modal-overlay') {
      state.modal = null;
      renderPage();
    }
    // Handle flag chip toggle
    const chip = e.target.closest('.flag-chip');
    if (chip) {
      chip.classList.toggle('selected');
      const sel = chip.classList.contains('selected');
      chip.style.border = `1px solid ${sel ? '#3B82F6' : '#334155'}`;
      chip.style.background = sel ? 'rgba(59,130,246,0.15)' : 'transparent';
      chip.style.color = sel ? '#60A5FA' : '#94A3B8';
      updateCommandPreview();
    }
    return;
  }

  const action = target.dataset.action;
  const nav = target.dataset.nav;
  const id = target.dataset.id;

  if (nav) {
    e.preventDefault();
    navigate(nav);
    return;
  }

  switch (action) {
    case 'logout':
      try { await api('POST', '/api/auth/logout'); } catch (_) {}
      state.user = null;
      state.page = 'login';
      renderPage();
      break;

    case 'new-job':
      state.modal = { type: 'job', data: null };
      renderPage();
      break;

    case 'edit-job':
    case 'view-job': {
      const job = state.jobs.find(j => String(j.id) === String(id));
      state.modal = { type: 'job', data: job || null };
      renderPage();
      break;
    }

    case 'save-job': {
      const fd = getJobFormData();
      if (!fd.name || !fd.name.trim()) { showToast('Job name is required', 'error'); document.getElementById('jf-name')?.focus(); break; }
      if (!fd.source || !fd.source.trim()) { showToast('Source path is required', 'error'); document.getElementById('jf-source')?.focus(); break; }
      if (!fd.destination || !fd.destination.trim()) { showToast('Destination path is required', 'error'); document.getElementById('jf-dest')?.focus(); break; }
      try {
        if (id) {
          await api('PUT', `/api/jobs/${id}`, fd);
          showToast('Job updated');
        } else {
          await api('POST', '/api/jobs', fd);
          showToast('Job created');
        }
        state.modal = null;
        state.jobs = await api('GET', '/api/jobs') || [];
        renderPage();
      } catch (err) { showToast(err.message, 'error'); }
      break;
    }

    case 'run-job':
      try {
        await api('POST', `/api/jobs/${id}/run`);
        showToast('Job started');
        state.jobs = await api('GET', '/api/jobs') || [];
        renderPage();
      } catch (err) { showToast(err.message, 'error'); }
      break;

    case 'clone-job': {
      const srcJob = state.jobs.find(j => String(j.id) === String(id));
      if (srcJob) {
        const clone = { ...srcJob, id: undefined, name: srcJob.name + ' (copy)' };
        state.modal = { type: 'job', data: clone };
        renderPage();
      }
      break;
    }

    case 'delete-job':
      showConfirm('Delete Job', 'Are you sure you want to delete this job? All run history for this job will also be removed. This cannot be undone.', async () => {
        try {
          await api('DELETE', `/api/jobs/${id}`);
          showToast('Job deleted');
          state.jobs = await api('GET', '/api/jobs') || [];
          renderPage();
        } catch (err) { showToast(err.message, 'error'); }
      });
      break;

    case 'preview-cmd':
      updateCommandPreview();
      break;

    case 'close-modal':
      state.modal = null;
      renderPage();
      break;

    case 'view-log':
      try {
        const log = await api('GET', `/api/runs/${id}/log`);
        state.expandedLog = { runId: id, content: typeof log === 'string' ? log : (log?.content || log?.log || JSON.stringify(log)) };
        renderPage();
      } catch (err) { showToast(err.message, 'error'); }
      break;

    case 'close-log':
      state.expandedLog = null;
      renderPage();
      break;

    case 'refresh-runs':
      loadPageData('runs');
      break;

    case 'new-user':
      state.modal = { type: 'user', data: null };
      renderPage();
      break;

    case 'edit-user': {
      const user = state.users.find(u => String(u.id) === String(id));
      state.modal = { type: 'user', data: user || null };
      renderPage();
      break;
    }

    case 'save-user': {
      const payload = {
        username: document.getElementById('uf-username')?.value,
        role: document.getElementById('uf-role')?.value,
      };
      const pw = document.getElementById('uf-password')?.value;
      if (pw) payload.password = pw;
      try {
        if (id) {
          await api('PUT', `/api/users/${id}`, payload);
          showToast('User updated');
        } else {
          await api('POST', '/api/users', payload);
          showToast('User created');
        }
        state.modal = null;
        state.users = await api('GET', '/api/users') || [];
        renderPage();
      } catch (err) { showToast(err.message, 'error'); }
      break;
    }

    case 'delete-user':
      if (!confirm('Delete this user? This cannot be undone.')) return;
      try {
        await api('DELETE', `/api/users/${id}`);
        showToast('User deleted');
        state.users = await api('GET', '/api/users') || [];
        renderPage();
      } catch (err) { showToast(err.message, 'error'); }
      break;
  }
});

// Login form submit
document.addEventListener('submit', async (e) => {
  if (e.target.id !== 'login-form') return;
  e.preventDefault();
  const username = document.getElementById('login-user')?.value;
  const password = document.getElementById('login-pass')?.value;
  const errEl = document.getElementById('login-error');
  try {
    const res = await api('POST', '/api/auth/login', { username, password });
    state.user = res.user || res;
    navigate('dashboard');
  } catch (err) {
    if (errEl) {
      errEl.textContent = err.message || 'Login failed';
      errEl.style.display = 'block';
    }
  }
});

// Hash routing
window.addEventListener('hashchange', () => {
  const hash = window.location.hash.replace('#', '') || 'dashboard';
  if (state.user && hash !== state.page) {
    state.page = hash;
    renderPage();
    loadPageData(hash);
  }
});

// --------------- CSS Animations ---------------
const style = document.createElement('style');
style.textContent = `
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes slideInRight {
    from { opacity: 0; transform: translateX(40px); }
    to { opacity: 1; transform: translateX(0); }
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: #020617; color: #F1F5F9; }
  table { font-size: 13px; }
  input:focus, select:focus { border-color: #3B82F6 !important; }
  button:hover { opacity: 0.9; }
  a:hover { opacity: 0.9; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: #0F172A; }
  ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
`;
document.head.appendChild(style);

// --------------- Boot ---------------
(async function boot() {
  try {
    const me = await api('GET', '/api/auth/me');
    state.user = me.user || me;
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    navigate(hash);
  } catch (_) {
    state.page = 'login';
    renderPage();
  }
})();
