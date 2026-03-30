import { useState, useEffect } from 'preact/hooks';
import { Icon } from '../lib/icons';
import { api, csrfHeaders } from '../lib/api';
import { showToast } from '../components/Toast';
import { confirmDialog } from '../lib/store';
import { timeAgo } from '../lib/utils';

const sectionStyle = {
  background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--border-primary)', padding: 24, marginBottom: 20,
  boxShadow: 'var(--shadow-sm)',
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

const btnPrimary = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px',
  background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius-md)',
  color: '#fff', fontFamily: 'var(--font-sans)', fontSize: 13,
  cursor: 'pointer', fontWeight: 600,
};

const btnSecondary = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px',
  background: 'var(--bg-tertiary)', border: '1px solid var(--border-input)',
  borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)',
  fontFamily: 'var(--font-sans)', fontSize: 13, cursor: 'pointer', fontWeight: 500,
};

function SectionHeader({ icon, title, iconBg, iconColor }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
      <div style={{
        width: 32, height: 32, borderRadius: 'var(--radius-md)',
        background: iconBg || 'var(--accent-light)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: iconColor || 'var(--accent)',
      }}>
        <Icon name={icon} size={16} />
      </div>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</span>
    </div>
  );
}

function SshTest() {
  const [host, setHost] = useState('');
  const [port, setPort] = useState('22');
  const [key, setKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);

  const test = async () => {
    if (!host.trim()) { showToast('Host is required', 'error'); return; }
    setTesting(true); setResult(null);
    try {
      const r = await api('POST', '/api/ssh/test', { host, port, key });
      setResult(r);
    } catch (err) { setResult({ ok: false, message: err.message }); }
    setTesting(false);
  };

  return (
    <div style={sectionStyle}>
      <SectionHeader icon="terminal" title="SSH Connection Test" />
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 3fr', gap: 12, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Host (user@hostname)</label>
          <input type="text" value={host} onInput={e => setHost(e.target.value)} placeholder="user@192.168.1.100" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Port</label>
          <input type="text" value={port} onInput={e => setPort(e.target.value)} placeholder="22" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>SSH Key Path</label>
          <input type="text" value={key} onInput={e => setKey(e.target.value)} placeholder="~/.ssh/id_rsa" style={inputStyle} />
        </div>
      </div>
      <button onClick={test} disabled={testing} style={btnPrimary}>
        {testing ? 'Testing...' : 'Test Connection'}
      </button>
      {result && (
        <div style={{
          marginTop: 12, padding: '10px 14px', borderRadius: 'var(--radius-md)',
          fontFamily: 'var(--font-sans)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
          background: result.ok ? 'var(--success-light)' : 'var(--error-light)',
          color: result.ok ? 'var(--success-text)' : 'var(--error-text)',
          border: `1px solid ${result.ok ? 'var(--success-border)' : 'var(--error-border)'}`,
        }}>
          <Icon name={result.ok ? 'check' : 'alert'} size={16} />
          {result.message}
        </div>
      )}
    </div>
  );
}

function ImportExport() {
  const exportJobs = async () => {
    try {
      const data = await api('GET', '/api/jobs/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'rynctl_jobs_export.json'; a.click();
      URL.revokeObjectURL(url);
      showToast('Jobs exported');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const importJobs = async () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file'; fileInput.accept = '.json';
    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const r = await api('POST', '/api/jobs/import', data);
        showToast(`Imported ${r.created} jobs, skipped ${r.skipped}`);
      } catch (err) { showToast(err.message, 'error'); }
    };
    fileInput.click();
  };

  return (
    <div style={sectionStyle}>
      <SectionHeader icon="database" title="Import / Export Jobs" />
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px' }}>
        Export all job configurations as JSON, or import from a previous export.
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={exportJobs} style={btnPrimary}>
          <Icon name="download" size={14} /> Export Jobs
        </button>
        <button onClick={importJobs} style={btnSecondary}>
          <Icon name="upload" size={14} /> Import Jobs
        </button>
      </div>
    </div>
  );
}

function BackupRestore() {
  const downloadBackup = async () => {
    try {
      const res = await fetch('/api/backup/download', { credentials: 'same-origin' });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `rynctl_backup_${new Date().toISOString().slice(0, 10)}.db`; a.click();
      URL.revokeObjectURL(url);
      showToast('Backup downloaded');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const restoreBackup = () => {
    confirmDialog.value = {
      title: 'Restore Database',
      message: 'This will replace the current database with the uploaded backup. A safety backup will be created first. Continue?',
      onConfirm: () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file'; fileInput.accept = '.db';
        fileInput.onchange = async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const formData = new FormData();
          formData.append('file', file);
          try {
            const headers = await csrfHeaders();
            const res = await fetch('/api/backup/restore', { method: 'POST', body: formData, credentials: 'same-origin', headers });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Restore failed');
            showToast(data.message);
          } catch (err) { showToast(err.message, 'error'); }
        };
        fileInput.click();
      },
    };
  };

  return (
    <div style={sectionStyle}>
      <SectionHeader icon="database" title="Database Backup & Restore" />
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px' }}>
        Download a snapshot of the SQLite database or restore from a previous backup.
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={downloadBackup} style={btnPrimary}>
          <Icon name="download" size={14} /> Download Backup
        </button>
        <button onClick={restoreBackup} style={{ ...btnSecondary, color: 'var(--error-text)', borderColor: 'var(--error-border)' }}>
          <Icon name="upload" size={14} /> Restore Backup
        </button>
      </div>
    </div>
  );
}

function HealthCheck() {
  const [health, setHealth] = useState(null);

  const check = async () => {
    try { const h = await api('GET', '/api/health'); setHealth(h); }
    catch (err) { showToast(err.message, 'error'); }
  };

  useEffect(() => { check(); }, []);

  return (
    <div style={sectionStyle}>
      <SectionHeader icon="shield" title="System Health" />
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
        <button onClick={check} style={btnPrimary}>
          <Icon name="refresh" size={14} /> Refresh
        </button>
        {health && (
          <span style={{
            padding: '4px 14px', borderRadius: 'var(--radius-full)', fontSize: 13,
            fontWeight: 600, fontFamily: 'var(--font-sans)',
            background: health.status === 'healthy' ? 'var(--success-light)' : 'var(--warning-light)',
            color: health.status === 'healthy' ? 'var(--success-text)' : 'var(--warning-text)',
            border: `1px solid ${health.status === 'healthy' ? 'var(--success-border)' : 'var(--warning-border)'}`,
          }}>
            {health.status?.toUpperCase()}
          </span>
        )}
      </div>
      {health?.checks && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {Object.entries(health.checks).map(([k, v]) => (
            <div key={k} style={{
              padding: '12px 16px', borderRadius: 'var(--radius-md)',
              background: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)',
            }}>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4, fontWeight: 500 }}>{k}</div>
              <div style={{
                fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600,
                color: (v === 'ok' || v === true) ? 'var(--success-text)' : 'var(--error-text)',
              }}>{String(v)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api('GET', '/api/audit').then(data => setLogs(data || [])).catch(e => showToast(e.message, 'error')).finally(() => setLoading(false));
  }, []);

  return (
    <div style={sectionStyle}>
      <SectionHeader icon="list" title="Audit Log" />
      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-primary)' }}>
              {['Time', 'User', 'Action', 'Details'].map(h => (
                <th key={h} style={{
                  padding: '10px 14px', textAlign: 'left', fontFamily: 'var(--font-sans)',
                  fontSize: 12, textTransform: 'uppercase', color: 'var(--text-muted)',
                  fontWeight: 600, letterSpacing: '0.5px',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map(l => (
              <tr key={l.id} style={{ borderBottom: '1px solid var(--border-secondary)' }}>
                <td style={{ padding: '10px 14px', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{timeAgo(l.created_at)}</td>
                <td style={{ padding: '10px 14px', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{l.username || '—'}</td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{
                    padding: '2px 10px', borderRadius: 'var(--radius-full)',
                    fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500,
                    background: 'var(--bg-tertiary)', color: 'var(--text-secondary)',
                  }}>{l.action}</span>
                </td>
                <td style={{ padding: '10px 14px', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-secondary)' }}>{l.details || '—'}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan="4" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, fontFamily: 'var(--font-sans)' }}>
                {loading ? 'Loading...' : 'No audit entries'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function Settings() {
  return (
    <>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 26, margin: 0, color: 'var(--text-primary)' }}>
          System Settings
        </h1>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)', margin: '4px 0 0' }}>
          Manage global rsync defaults, authentication, and notification channels.
        </p>
      </div>
      <HealthCheck />
      <SshTest />
      <ImportExport />
      <BackupRestore />
      <AuditLog />
    </>
  );
}
