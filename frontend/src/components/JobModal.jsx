import { useState, useEffect, useCallback } from 'preact/hooks';
import { Icon } from '../lib/icons';
import { ALL_FLAGS, DEFAULT_FLAGS } from '../lib/flags';
import { buildRsyncCommand, describeCron } from '../lib/utils';
import { modal } from '../lib/store';
import { api } from '../lib/api';
import { showToast } from './Toast';

function FormField({ id, label, value, placeholder, required, style: wrapStyle, children }) {
  return (
    <div style={wrapStyle || ''}>
      <label style="display:block;font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;color:#94A3B8;margin-bottom:6px;letter-spacing:1px;">
        {label}{required && <span style="color:#EF4444;"> *</span>}
      </label>
      {children || (
        <input id={id} type="text" value={value || ''} placeholder={placeholder || ''}
          style="width:100%;padding:8px 12px;background:#020617;border:1px solid #1E293B;border-radius:6px;color:#F1F5F9;font-family:'JetBrains Mono',monospace;font-size:13px;outline:none;box-sizing:border-box;" />
      )}
    </div>
  );
}

/**
 * FileBrowser — overlay modal that lists directory contents.
 * Supports both local (server-side) and remote (via SSH) browsing
 * by calling POST /api/browse. Click directories to navigate,
 * click "Select This" to pick the current directory path.
 */
function FileBrowser({ initialPath, host, port, sshKey, onSelect, onClose }) {
  const [path, setPath] = useState(initialPath || '/');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const browse = useCallback(async (p) => {
    setLoading(true);
    setError('');
    try {
      const body = { path: p };
      if (host) { body.host = host; body.port = port || '22'; body.key = sshKey || ''; }
      const res = await api('POST', '/api/browse', body);
      if (res.ok === false) { setError(res.message); setEntries([]); }
      else { setEntries(res.entries || []); setPath(res.path || p); }
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, [host, port, sshKey]);

  useEffect(() => { browse(path); }, []);

  const navigate = (entry) => {
    if (entry.is_dir) browse(entry.path);
  };

  const selectCurrent = () => { onSelect(path); onClose(); };

  return (
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1100;display:flex;align-items:center;justify-content:center;" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style="background:#0F172A;border:1px solid #1E293B;border-radius:12px;width:100%;max-width:520px;max-height:70vh;display:flex;flex-direction:column;">
        <div style="padding:16px 20px;border-bottom:1px solid #1E293B;display:flex;justify-content:space-between;align-items:center;">
          <span style="font-family:'JetBrains Mono',monospace;font-size:14px;color:#F1F5F9;font-weight:600;">
            <Icon name="folder-open" /> Browse {host ? `${host}:` : 'Local '}Files
          </span>
          <button onClick={onClose} style="background:none;border:none;color:#64748B;cursor:pointer;"><Icon name="x" /></button>
        </div>

        {/* Current path bar */}
        <div style="padding:10px 20px;background:#020617;display:flex;align-items:center;gap:8px;">
          <span style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#60A5FA;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{path}</span>
          <button onClick={selectCurrent} style="padding:4px 12px;background:#3B82F6;border:none;border-radius:6px;color:#fff;font-family:'JetBrains Mono',monospace;font-size:11px;cursor:pointer;white-space:nowrap;">
            Select This
          </button>
        </div>

        {/* Entries */}
        <div style="flex:1;overflow-y:auto;padding:8px 0;">
          {loading && <div style="padding:20px;text-align:center;color:#64748B;font-family:'JetBrains Mono',monospace;font-size:12px;">Loading...</div>}
          {error && <div style="padding:12px 20px;color:#EF4444;font-family:'JetBrains Mono',monospace;font-size:12px;">{error}</div>}
          {!loading && entries.map(e => (
            <div key={e.path}
              onClick={() => e.is_dir ? navigate(e) : onSelect(e.path) || onClose()}
              style="padding:6px 20px;display:flex;align-items:center;gap:10px;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:12px;color:#CBD5E1;transition:background .1s;"
              onMouseEnter={ev => ev.currentTarget.style.background = '#1E293B'}
              onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
              <span style={{ color: e.is_dir ? '#60A5FA' : '#64748B' }}>
                <Icon name={e.is_dir ? 'folder' : 'file'} />
              </span>
              <span style={{ color: e.is_dir ? '#93C5FD' : '#94A3B8' }}>{e.name}{e.is_dir && '/'}</span>
            </div>
          ))}
          {!loading && !error && entries.length === 0 && (
            <div style="padding:20px;text-align:center;color:#64748B;font-family:'JetBrains Mono',monospace;font-size:12px;">Empty directory</div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * SshTestButton — inline button that tests SSH connectivity to the
 * configured remote host. Calls POST /api/ssh/test and displays
 * a success/failure indicator with the server's response message.
 */
function SshTestButton({ getFormData }) {
  const [status, setStatus] = useState(null); // null | 'testing' | 'ok' | 'fail'
  const [message, setMessage] = useState('');

  const test = async () => {
    const fd = getFormData();
    if (!fd.remoteHost) { showToast('Enter a remote host first', 'error'); return; }
    setStatus('testing');
    setMessage('');
    try {
      const res = await api('POST', '/api/ssh/test', {
        host: fd.remoteHost, port: fd.sshPort || '22', key: fd.sshKey || '',
      });
      setStatus(res.ok ? 'ok' : 'fail');
      setMessage(res.message);
    } catch (e) { setStatus('fail'); setMessage(e.message); }
  };

  const colors = { testing: '#EAB308', ok: '#22C55E', fail: '#EF4444' };

  return (
    <div style="margin-top:8px;display:flex;align-items:center;gap:10px;">
      <button onClick={test} disabled={status === 'testing'} style={{
        padding: '6px 14px', background: 'transparent', border: '1px solid #334155',
        borderRadius: 6, color: '#60A5FA', fontFamily: "'JetBrains Mono',monospace",
        fontSize: 11, cursor: status === 'testing' ? 'wait' : 'pointer',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <Icon name="wifi" />
        {status === 'testing' ? 'Testing...' : 'Test SSH Connection'}
      </button>
      {status && status !== 'testing' && (
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: colors[status] }}>
          <Icon name={status === 'ok' ? 'check' : 'alert'} /> {message}
        </span>
      )}
    </div>
  );
}

/**
 * PathInput — text input with a folder-browse button that opens
 * the FileBrowser modal. When a path is selected, it programmatically
 * updates the input value and fires an input event so the command
 * preview refreshes automatically.
 */
function PathInput({ id, label, value, placeholder, required, host, port, sshKey }) {
  const [browserOpen, setBrowserOpen] = useState(false);

  const setInputValue = (val) => {
    const el = document.getElementById(id);
    if (el) {
      // Trigger Preact's input event for preview update
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeInputValueSetter.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  return (
    <div>
      <label style="display:block;font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;color:#94A3B8;margin-bottom:6px;letter-spacing:1px;">
        {label}{required && <span style="color:#EF4444;"> *</span>}
      </label>
      <div style="display:flex;gap:4px;">
        <input id={id} type="text" value={value || ''} placeholder={placeholder || ''}
          style="flex:1;padding:8px 12px;background:#020617;border:1px solid #1E293B;border-radius:6px;color:#F1F5F9;font-family:'JetBrains Mono',monospace;font-size:13px;outline:none;box-sizing:border-box;" />
        <button onClick={() => setBrowserOpen(true)} title="Browse files" style={{
          padding: '8px 10px', background: '#1E293B', border: '1px solid #334155',
          borderRadius: 6, color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center',
        }}>
          <Icon name="folder" />
        </button>
      </div>
      {browserOpen && (
        <FileBrowser
          initialPath={document.getElementById(id)?.value || '/'}
          host={host} port={port} sshKey={sshKey}
          onSelect={setInputValue}
          onClose={() => setBrowserOpen(false)}
        />
      )}
    </div>
  );
}


export function JobModal({ job, onSaved }) {
  const isEdit = !!job?.id;
  const title = isEdit ? 'Edit rsync Job' : 'New rsync Job';

  const initialFlags = isEdit && job.flags
    ? job.flags.split(/\s+/).filter(Boolean)
    : [...DEFAULT_FLAGS];

  const [selectedFlags, setSelectedFlags] = useState(initialFlags);
  const [preview, setPreview] = useState('rsync -avh /source/ /dest/');
  const [cronDesc, setCronDesc] = useState('');

  const getFormData = useCallback(() => {
    const g = id => document.getElementById(id)?.value || '';
    return {
      name: g('jf-name'), source: g('jf-source'), dest: g('jf-dest'),
      remoteHost: g('jf-remote-host'), sshPort: g('jf-ssh-port'), sshKey: g('jf-ssh-key'),
      flags: selectedFlags.join(' '), exclude: g('jf-exclude'), bwlimit: g('jf-bwlimit'),
      customFlags: g('jf-custom-flags'), tags: g('jf-tags'),
      retryMax: g('jf-retry-max'), retryDelay: g('jf-retry-delay'),
      schedule: g('jf-schedule'),
      scheduleEnabled: document.getElementById('jf-schedule-enabled')?.checked || false,
    };
  }, [selectedFlags]);

  const updatePreview = useCallback(() => {
    const fd = getFormData();
    setPreview(buildRsyncCommand(fd));
    setCronDesc(describeCron(fd.schedule));
  }, [getFormData]);

  useEffect(() => { updatePreview(); }, [selectedFlags]);

  const toggleFlag = (flag) => {
    setSelectedFlags(prev =>
      prev.includes(flag) ? prev.filter(f => f !== flag) : [...prev, flag]
    );
  };

  const close = () => { modal.value = null; };

  const save = async () => {
    const fd = getFormData();
    if (!fd.name?.trim()) { showToast('Job name is required', 'error'); return; }
    if (!fd.source?.trim()) { showToast('Source path is required', 'error'); return; }
    if (!fd.dest?.trim()) { showToast('Destination path is required', 'error'); return; }

    const payload = {
      name: fd.name, source: fd.source, destination: fd.dest,
      remote_host: fd.remoteHost, ssh_port: fd.sshPort, ssh_key: fd.sshKey,
      flags: fd.flags, exclude_patterns: fd.exclude, bandwidth_limit: fd.bwlimit,
      custom_flags: fd.customFlags, tags: fd.tags,
      retry_max: parseInt(fd.retryMax) || 0, retry_delay: parseInt(fd.retryDelay) || 30,
      schedule_cron: fd.schedule, schedule_enabled: fd.scheduleEnabled ? 1 : 0,
    };

    try {
      if (isEdit) {
        await api('PUT', `/api/jobs/${job.id}`, payload);
        showToast('Job updated');
      } else {
        await api('POST', '/api/jobs', payload);
        showToast('Job created');
      }
      modal.value = null;
      onSaved();
    } catch (err) { showToast(err.message, 'error'); }
  };

  return (
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);z-index:1000;display:flex;align-items:center;justify-content:center;" onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <div style="background:#0F172A;border:1px solid #1E293B;border-radius:12px;width:100%;max-width:720px;max-height:90vh;overflow-y:auto;animation:slideUp .25s ease;">
        {/* Header */}
        <div style="padding:20px 24px;border-bottom:1px solid #1E293B;display:flex;justify-content:space-between;align-items:center;">
          <span style="font-family:'JetBrains Mono',monospace;font-size:16px;color:#F1F5F9;font-weight:600;">{title}</span>
          <button onClick={close} style="background:none;border:none;color:#64748B;cursor:pointer;"><Icon name="x" /></button>
        </div>

        {/* Body */}
        <div style="padding:24px;" onInput={updatePreview}>
          <FormField id="jf-name" label="Job Name" value={job?.name} placeholder="my-backup-job" required />

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;">
            <div>
              <PathInput id="jf-source" label="Source Path" value={job?.source} placeholder="/path/to/source/" required
                host="" port="" sshKey="" />
              <div style="font-size:10px;color:#EAB308;font-family:'JetBrains Mono',monospace;margin-top:4px;display:flex;align-items:center;gap:4px;">
                <Icon name="warning" />
                Trailing / syncs contents only — without / syncs the folder itself
              </div>
            </div>
            <PathInput id="jf-dest" label="Destination Path" value={job?.dest || job?.destination} placeholder="/path/to/dest/" required
              host={document.getElementById('jf-remote-host')?.value || job?.remote_host || job?.remoteHost || ''}
              port={document.getElementById('jf-ssh-port')?.value || job?.ssh_port || job?.sshPort || '22'}
              sshKey={document.getElementById('jf-ssh-key')?.value || job?.ssh_key || job?.sshKey || ''} />
          </div>

          <div style="display:grid;grid-template-columns:5fr 2fr 5fr;gap:16px;margin-top:16px;">
            <FormField id="jf-remote-host" label="Remote Host" value={job?.remoteHost || job?.remote_host} placeholder="user@host" />
            <FormField id="jf-ssh-port" label="SSH Port" value={job?.sshPort || job?.ssh_port || '22'} placeholder="22" />
            <FormField id="jf-ssh-key" label="SSH Key Path" value={job?.sshKey || job?.ssh_key} placeholder="~/.ssh/id_rsa" />
          </div>

          {/* SSH Test Button */}
          <SshTestButton getFormData={getFormData} />

          {/* Flags */}
          <div style="margin-top:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <label style="font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;color:#94A3B8;letter-spacing:1px;">Flags</label>
              <a href="#flags" onClick={() => { modal.value = null; }} style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#60A5FA;text-decoration:none;cursor:pointer;">View all flag details →</a>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;">
              {ALL_FLAGS.map(f => {
                const sel = selectedFlags.includes(f.flag);
                return (
                  <span key={f.flag} onClick={() => toggleFlag(f.flag)} style={{
                    padding: '4px 12px', borderRadius: 9999, fontFamily: "'JetBrains Mono',monospace", fontSize: 12,
                    cursor: 'pointer', border: `1px solid ${sel ? '#3B82F6' : '#334155'}`,
                    background: sel ? 'rgba(59,130,246,0.15)' : 'transparent',
                    color: sel ? '#60A5FA' : '#94A3B8', transition: 'all .15s', userSelect: 'none',
                  }}>
                    {f.flag}&nbsp; <span style={{ color: sel ? '#93C5FD' : '#64748B' }}>{f.label}</span>
                  </span>
                );
              })}
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;">
            <FormField id="jf-exclude" label="Exclude Patterns" value={job?.exclude || job?.exclude_patterns} placeholder=".git,node_modules" />
            <FormField id="jf-bwlimit" label="Bandwidth Limit" value={job?.bwlimit || job?.bandwidth_limit} placeholder="0 (unlimited)" />
          </div>

          <FormField id="jf-custom-flags" label="Custom Flags" value={job?.customFlags || job?.custom_flags} placeholder="--timeout=300" style="margin-top:16px;" />

          <FormField id="jf-tags" label="Tags" value={job?.tags} placeholder="backup, production, daily" style="margin-top:16px;" />

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;">
            <FormField id="jf-retry-max" label="Retry on Failure (0 = disabled)" value={job?.retry_max || job?.retryMax || '0'} placeholder="0" />
            <FormField id="jf-retry-delay" label="Retry Delay (seconds)" value={job?.retry_delay || job?.retryDelay || '30'} placeholder="30" />
          </div>

          <div style="display:grid;grid-template-columns:1fr auto;gap:16px;margin-top:16px;align-items:end;">
            <div>
              <FormField id="jf-schedule" label="Cron Schedule" value={job?.schedule || job?.schedule_cron} placeholder="0 */6 * * *" />
              {cronDesc && (
                <div style="margin-top:4px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#34D399;display:flex;align-items:center;gap:4px;">
                  <Icon name="chevron-right" /> {cronDesc}
                </div>
              )}
            </div>
            <div>
              <label style="display:block;font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;color:#94A3B8;margin-bottom:6px;letter-spacing:1px;">Enabled</label>
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:8px 0;">
                <input id="jf-schedule-enabled" type="checkbox" checked={job?.scheduleEnabled || job?.schedule_enabled} style="width:18px;height:18px;accent-color:#3B82F6;" />
                <span style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#94A3B8;">Active</span>
              </label>
            </div>
          </div>

          {/* Command Preview */}
          <div style="margin-top:16px;">
            <label style="display:block;font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;color:#94A3B8;margin-bottom:6px;letter-spacing:1px;">Command Preview</label>
            <div style="padding:12px 16px;background:#020617;border-radius:8px;font-family:'JetBrains Mono',monospace;font-size:12px;overflow-x:auto;">
              <span style="color:#64748B;">$ </span><span style="color:#34D399;">{preview}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style="padding:16px 24px;border-top:1px solid #1E293B;display:flex;justify-content:flex-end;gap:10px;">
          <button onClick={close} style="padding:8px 16px;background:none;border:1px solid #334155;border-radius:8px;color:#94A3B8;font-family:'JetBrains Mono',monospace;font-size:12px;cursor:pointer;">Cancel</button>
          <button onClick={save} style="padding:8px 16px;background:#3B82F6;border:none;border-radius:8px;color:#fff;font-family:'JetBrains Mono',monospace;font-size:12px;cursor:pointer;">{isEdit ? 'Save Job' : 'Create Job'}</button>
        </div>
      </div>
    </div>
  );
}
