import { useState, useEffect } from 'preact/hooks';
import { Icon } from '../lib/icons';
import { api } from '../lib/api';
import { showToast } from '../components/Toast';
import { confirmDialog } from '../lib/store';
import { timeAgo } from '../lib/utils';

const mono = "font-family:'JetBrains Mono',monospace;";
const card = "background:#1E293B;border-radius:10px;border:1px solid #334155;padding:20px;margin-bottom:20px;";
const label = `display:block;${mono}font-size:11px;text-transform:uppercase;color:#94A3B8;margin-bottom:6px;letter-spacing:1px;`;
const input = `width:100%;padding:8px 12px;background:#020617;border:1px solid #1E293B;border-radius:6px;color:#F1F5F9;${mono}font-size:13px;outline:none;box-sizing:border-box;`;
const btn = (bg, color) => `display:inline-flex;align-items:center;gap:6px;padding:8px 16px;background:${bg};border:none;border-radius:8px;color:${color};${mono}font-size:12px;cursor:pointer;`;

function Section({ title, icon, children }) {
  return (
    <div style={card}>
      <div style={`display:flex;align-items:center;gap:10px;margin-bottom:16px;`}>
        <Icon name={icon} />
        <span style={`${mono}font-size:14px;color:#F1F5F9;font-weight:600;`}>{title}</span>
      </div>
      {children}
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
    setTesting(true);
    setResult(null);
    try {
      const r = await api('POST', '/api/ssh/test', { host, port, key });
      setResult(r);
    } catch (err) { setResult({ ok: false, message: err.message }); }
    setTesting(false);
  };

  return (
    <Section title="SSH Connection Test" icon="terminal">
      <div style="display:grid;grid-template-columns:3fr 1fr 3fr;gap:12px;margin-bottom:12px;">
        <div>
          <label style={label}>Host (user@hostname)</label>
          <input type="text" value={host} onInput={e => setHost(e.target.value)} placeholder="user@192.168.1.100" style={input} />
        </div>
        <div>
          <label style={label}>Port</label>
          <input type="text" value={port} onInput={e => setPort(e.target.value)} placeholder="22" style={input} />
        </div>
        <div>
          <label style={label}>SSH Key Path</label>
          <input type="text" value={key} onInput={e => setKey(e.target.value)} placeholder="~/.ssh/id_rsa" style={input} />
        </div>
      </div>
      <button onClick={test} disabled={testing} style={btn('#3B82F6', '#fff')}>
        {testing ? 'Testing...' : 'Test Connection'}
      </button>
      {result && (
        <div style={`margin-top:12px;padding:10px 14px;border-radius:8px;${mono}font-size:12px;display:flex;align-items:center;gap:8px;${result.ok ? 'background:rgba(34,197,94,0.1);color:#34D399;border:1px solid #166534;' : 'background:rgba(239,68,68,0.1);color:#F87171;border:1px solid #991B1B;'}`}>
          <Icon name={result.ok ? 'check' : 'alert'} />
          {result.message}
        </div>
      )}
    </Section>
  );
}

function ImportExport() {
  const exportJobs = async () => {
    try {
      const data = await api('GET', '/api/jobs/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'rynctl_jobs_export.json';
      a.click();
      URL.revokeObjectURL(url);
      showToast('Jobs exported');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const importJobs = async () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
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
    <Section title="Import / Export Jobs" icon="database">
      <p style={`${mono}font-size:12px;color:#94A3B8;margin:0 0 12px;`}>
        Export all job configurations as JSON, or import from a previous export.
      </p>
      <div style="display:flex;gap:10px;">
        <button onClick={exportJobs} style={btn('#3B82F6', '#fff')}>
          <Icon name="download" size={14} /> Export Jobs
        </button>
        <button onClick={importJobs} style={btn('transparent', '#94A3B8') + 'border:1px solid #334155;'}>
          <Icon name="upload" size={14} /> Import Jobs
        </button>
      </div>
    </Section>
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
      a.href = url;
      a.download = `rynctl_backup_${new Date().toISOString().slice(0, 10)}.db`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Backup downloaded');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const restoreBackup = () => {
    confirmDialog.value = {
      title: 'Restore Database',
      message: 'This will replace the current database with the uploaded backup. A safety backup will be created first. The server will need to be restarted after restore. Continue?',
      onConfirm: () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.db';
        fileInput.onchange = async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const formData = new FormData();
          formData.append('file', file);
          try {
            const res = await fetch('/api/backup/restore', {
              method: 'POST', body: formData, credentials: 'same-origin',
            });
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
    <Section title="Database Backup & Restore" icon="database">
      <p style={`${mono}font-size:12px;color:#94A3B8;margin:0 0 12px;`}>
        Download a snapshot of the SQLite database or restore from a previous backup.
      </p>
      <div style="display:flex;gap:10px;">
        <button onClick={downloadBackup} style={btn('#3B82F6', '#fff')}>
          <Icon name="download" size={14} /> Download Backup
        </button>
        <button onClick={restoreBackup} style={btn('transparent', '#F87171') + 'border:1px solid #991B1B;'}>
          <Icon name="upload" size={14} /> Restore Backup
        </button>
      </div>
    </Section>
  );
}

function HealthCheck() {
  const [health, setHealth] = useState(null);

  const check = async () => {
    try {
      const h = await api('GET', '/api/health');
      setHealth(h);
    } catch (err) { showToast(err.message, 'error'); }
  };

  useEffect(() => { check(); }, []);

  return (
    <Section title="System Health" icon="shield">
      <div style="display:flex;gap:10px;align-items:center;margin-bottom:12px;">
        <button onClick={check} style={btn('#3B82F6', '#fff')}>
          <Icon name="refresh" size={14} /> Refresh
        </button>
        {health && (
          <span style={`${mono}font-size:13px;font-weight:600;color:${health.status === 'healthy' ? '#34D399' : '#EAB308'};`}>
            {health.status?.toUpperCase()}
          </span>
        )}
      </div>
      {health?.checks && (
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
          {Object.entries(health.checks).map(([k, v]) => (
            <div key={k} style={`padding:10px 14px;border-radius:8px;background:#020617;border:1px solid #1E293B;`}>
              <div style={`${mono}font-size:11px;color:#64748B;text-transform:uppercase;margin-bottom:4px;`}>{k}</div>
              <div style={`${mono}font-size:13px;color:${v === 'ok' || v === true ? '#34D399' : '#F87171'};`}>{String(v)}</div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api('GET', '/api/audit');
      setLogs(data || []);
    } catch (err) { showToast(err.message, 'error'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <Section title="Audit Log" icon="list">
      <div style="max-height:400px;overflow-y:auto;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:1px solid #334155;">
              {['Time', 'User', 'Action', 'Details'].map(h => (
                <th key={h} style={`padding:8px 12px;text-align:left;${mono}font-size:11px;text-transform:uppercase;color:#64748B;`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map(l => (
              <tr key={l.id} style="border-bottom:1px solid #1E293B;">
                <td style={`padding:8px 12px;${mono}font-size:12px;color:#94A3B8;white-space:nowrap;`}>{timeAgo(l.created_at)}</td>
                <td style={`padding:8px 12px;${mono}font-size:12px;color:#F1F5F9;`}>{l.username || '—'}</td>
                <td style={`padding:8px 12px;`}>
                  <span style={`padding:2px 8px;border-radius:9999px;${mono}font-size:11px;background:#334155;color:#94A3B8;`}>{l.action}</span>
                </td>
                <td style={`padding:8px 12px;${mono}font-size:12px;color:#94A3B8;`}>{l.details || '—'}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colspan="4" style={`padding:24px;text-align:center;color:#64748B;${mono}font-size:13px;`}>
                {loading ? 'Loading...' : 'No audit entries'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

export function Settings() {
  return (
    <>
      <div style="margin-bottom:32px;">
        <h1 style={`${mono}font-weight:600;font-size:24px;margin:0;`}>
          <span style="color:#64748B;">~/</span><span style="color:#F1F5F9;">settings</span>
        </h1>
      </div>
      <HealthCheck />
      <SshTest />
      <ImportExport />
      <BackupRestore />
      <AuditLog />
    </>
  );
}
