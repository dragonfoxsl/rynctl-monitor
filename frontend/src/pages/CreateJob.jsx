import { useState, useEffect, useCallback } from 'preact/hooks';
import { Icon } from '../lib/icons';
import { ALL_FLAGS, DEFAULT_FLAGS } from '../lib/flags';
import { buildRsyncCommand, describeCron } from '../lib/utils';
import { page, modal } from '../lib/store';
import { api } from '../lib/api';
import { showToast } from '../components/Toast';

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
  outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s, box-shadow 0.15s',
};

function SectionHeader({ icon, title, subtitle }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
      <div style={{
        width: 32, height: 32, borderRadius: 'var(--radius-md)',
        background: 'var(--accent-light)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: 'var(--accent)',
      }}>
        <Icon name={icon} size={16} />
      </div>
      <div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</div>
        {subtitle && <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-muted)' }}>{subtitle}</div>}
      </div>
    </div>
  );
}

function FormField({ id, label, value, placeholder, required, type, style: wrapStyle, children, hint }) {
  return (
    <div style={wrapStyle || {}}>
      <label htmlFor={id} style={labelStyle}>
        {label}{required && <span style={{ color: 'var(--error)' }}> *</span>}
      </label>
      {children || (
        <input id={id} type={type || 'text'} value={value || ''} placeholder={placeholder || ''} style={inputStyle} />
      )}
      {hint && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'var(--font-sans)' }}>{hint}</div>}
    </div>
  );
}

function FileBrowser({ initialPath, host, port, sshKey, onSelect, onClose }) {
  const [path, setPath] = useState(initialPath || '/');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const browse = useCallback(async (p) => {
    setLoading(true); setError('');
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

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
      zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
        borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 520,
        maxHeight: '70vh', display: 'flex', flexDirection: 'column',
        boxShadow: 'var(--shadow-lg)',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
            <Icon name="folder-open" /> Browse {host ? `${host}:` : 'Local '}Files
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><Icon name="x" /></button>
        </div>
        <div style={{ padding: '10px 20px', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{path}</span>
          <button onClick={() => { onSelect(path); onClose(); }} style={{
            padding: '6px 14px', background: 'var(--accent)', border: 'none',
            borderRadius: 'var(--radius-sm)', color: '#fff', fontFamily: 'var(--font-sans)',
            fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 500,
          }}>Select This</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {loading && <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading...</div>}
          {error && <div style={{ padding: '12px 20px', color: 'var(--error)', fontSize: 13 }}>{error}</div>}
          {!loading && entries.map(e => (
            <div key={e.path}
              onClick={() => e.is_dir ? browse(e.path) : onSelect(e.path) || onClose()}
              style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)', transition: 'background .1s' }}
              onMouseEnter={ev => ev.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
              <span style={{ color: e.is_dir ? 'var(--accent)' : 'var(--text-muted)' }}>
                <Icon name={e.is_dir ? 'folder' : 'file'} />
              </span>
              <span style={{ color: e.is_dir ? 'var(--accent)' : 'var(--text-secondary)' }}>{e.name}{e.is_dir && '/'}</span>
            </div>
          ))}
          {!loading && !error && entries.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Empty directory</div>
          )}
        </div>
      </div>
    </div>
  );
}

function PathInput({ id, label, value, placeholder, required, host, port, sshKey }) {
  const [browserOpen, setBrowserOpen] = useState(false);

  const setInputValue = (val) => {
    const el = document.getElementById(id);
    if (el) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeInputValueSetter.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  return (
    <div>
      <label htmlFor={id} style={labelStyle}>{label}{required && <span style={{ color: 'var(--error)' }}> *</span>}</label>
      <div style={{ display: 'flex', gap: 4 }}>
        <input id={id} type="text" value={value || ''} placeholder={placeholder || ''} style={{ ...inputStyle, flex: 1 }} />
        <button onClick={() => setBrowserOpen(true)} title="Browse files" style={{
          padding: '8px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-input)',
          borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', cursor: 'pointer',
          display: 'flex', alignItems: 'center',
        }}>
          <Icon name="folder" />
        </button>
      </div>
      {browserOpen && (
        <FileBrowser initialPath={document.getElementById(id)?.value || '/'} host={host} port={port} sshKey={sshKey}
          onSelect={setInputValue} onClose={() => setBrowserOpen(false)} />
      )}
    </div>
  );
}

function FlagPill({ flag, label, selected, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 16px', borderRadius: 'var(--radius-full)',
      fontFamily: 'var(--font-sans)', fontSize: 13, cursor: 'pointer',
      border: `1px solid ${selected ? 'var(--accent)' : 'var(--border-input)'}`,
      background: selected ? 'var(--accent-light)' : 'var(--bg-input)',
      color: selected ? 'var(--accent)' : 'var(--text-secondary)',
      fontWeight: selected ? 600 : 400, transition: 'all .15s', userSelect: 'none',
      display: 'inline-flex', alignItems: 'center', gap: 6,
    }}>
      {selected && <Icon name="check" size={14} />}
      {label}
    </button>
  );
}

export function CreateJob({ job, onSaved }) {
  const isEdit = !!job?.id;

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
      retryMax: g('jf-retry-max'), retryDelay: g('jf-retry-delay'), maxRuntime: g('jf-max-runtime'),
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
      max_runtime: parseInt(fd.maxRuntime) || 0,
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
      if (onSaved) onSaved();
      else { page.value = 'jobs'; window.location.hash = '#jobs'; }
    } catch (err) { showToast(err.message, 'error'); }
  };

  const discard = () => {
    if (onSaved) { modal.value = null; }
    else { page.value = 'jobs'; window.location.hash = '#jobs'; }
  };

  // Flag categories for the design
  const flagCategories = [
    { label: 'Archive', flag: '-a' },
    { label: 'Compress', flag: '-z' },
    { label: 'Delete', flag: '--delete' },
    { label: 'Verbose', flag: '-v' },
    { label: 'Update', flag: '-u' },
    { label: 'Dry Run', flag: '-n' },
  ];

  return (
    <div onInput={updatePreview}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 26, margin: 0, color: 'var(--text-primary)' }}>
            {isEdit ? 'Edit Sync Mission' : 'New Sync Mission'}
          </h1>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)', margin: '6px 0 0' }}>
            Configure your rsync job parameters with precision.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={discard} style={{
            padding: '10px 20px', background: 'var(--bg-secondary)', border: '1px solid var(--border-input)',
            borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)',
            fontFamily: 'var(--font-sans)', fontSize: 14, cursor: 'pointer', fontWeight: 500,
          }}>Discard</button>
          <button onClick={save} style={{
            padding: '10px 24px', background: 'var(--accent)', border: 'none',
            borderRadius: 'var(--radius-md)', color: '#fff',
            fontFamily: 'var(--font-sans)', fontSize: 14, cursor: 'pointer', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 6, boxShadow: 'var(--shadow-sm)',
          }}>
            <Icon name="play" size={14} /> {isEdit ? 'Save Job' : 'Deploy Job'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>
        {/* Left Column */}
        <div>
          {/* Path Configuration */}
          <div style={sectionStyle}>
            <SectionHeader icon="folder" title="Path Configuration" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <PathInput id="jf-source" label="Source Directory" value={job?.source} placeholder="/home/user/data/" required host="" port="" sshKey="" />
              <PathInput id="jf-dest" label="Destination Directory" value={job?.dest || job?.destination} placeholder="/backup/data/" required
                host={document.getElementById('jf-remote-host')?.value || job?.remote_host || ''}
                port={document.getElementById('jf-ssh-port')?.value || job?.ssh_port || '22'}
                sshKey={document.getElementById('jf-ssh-key')?.value || job?.ssh_key || ''} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr', gap: 16, marginTop: 16 }}>
              <FormField id="jf-remote-host" label="Remote Host" value={job?.remoteHost || job?.remote_host} placeholder="user@host" />
              <FormField id="jf-ssh-port" label="SSH Port" value={job?.sshPort || job?.ssh_port || '22'} placeholder="22" />
              <FormField id="jf-ssh-key" label="SSH Key Path" value={job?.sshKey || job?.ssh_key} placeholder="~/.ssh/id_rsa" />
            </div>
          </div>

          {/* Execution Flags */}
          <div style={sectionStyle}>
            <SectionHeader icon="flag" title="Execution Flags" />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {flagCategories.map(f => (
                <FlagPill key={f.flag} flag={f.flag} label={f.label}
                  selected={selectedFlags.includes(f.flag)} onClick={() => toggleFlag(f.flag)} />
              ))}
            </div>
            <div style={{ marginTop: 12 }}>
              <details style={{ cursor: 'pointer' }}>
                <summary style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-muted)', padding: '6px 0' }}>
                  All flags ({ALL_FLAGS.length})
                </summary>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {ALL_FLAGS.filter(f => !flagCategories.some(fc => fc.flag === f.flag)).map(f => (
                    <FlagPill key={f.flag} flag={f.flag} label={f.label}
                      selected={selectedFlags.includes(f.flag)} onClick={() => toggleFlag(f.flag)} />
                  ))}
                </div>
              </details>
            </div>
          </div>

          {/* Command Preview */}
          <div style={{
            ...sectionStyle,
            background: 'var(--bg-code)', border: '1px solid var(--border-primary)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#F59E0B' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22C55E' }} />
              </div>
              <button onClick={() => { navigator.clipboard?.writeText(preview); showToast('Copied!'); }}
                style={{
                  padding: '4px 12px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 'var(--radius-sm)', color: '#94A3B8', fontSize: 12,
                  fontFamily: 'var(--font-sans)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                }}>
                <Icon name="clone" size={12} /> Copy Command
              </button>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#E2E8F0', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              <span style={{ color: '#64748B' }}>$ </span>
              <span style={{ color: '#34D399' }}>{preview}</span>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div>
          {/* Job Identity */}
          <div style={sectionStyle}>
            <SectionHeader icon="tag" title="Job Identity" />
            <FormField id="jf-name" label="Job Name" value={job?.name} placeholder="Daily Production Backup" required />
            <div style={{ marginTop: 12 }}>
              <FormField id="jf-tags" label="Tags" value={job?.tags} placeholder="backup, production, daily"
                hint="Comma-separated tags for organization" />
            </div>
          </div>

          {/* Scheduling (Automation) */}
          <div style={sectionStyle}>
            <SectionHeader icon="history" title="Automation" subtitle="Schedule recurring syncs" />
            <FormField id="jf-schedule" label="Cron Expression" value={job?.schedule || job?.schedule_cron} placeholder="0 */6 * * *" />
            {cronDesc && (
              <div style={{
                marginTop: 8, padding: '8px 12px', background: 'var(--success-light)',
                borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-sans)',
                fontSize: 12, color: 'var(--success-text)', border: '1px solid var(--success-border)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <Icon name="check" size={14} /> {cronDesc}
              </div>
            )}
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-secondary)' }}>
                Schedule Active
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input id="jf-schedule-enabled" type="checkbox" checked={job?.scheduleEnabled || job?.schedule_enabled}
                  style={{ width: 18, height: 18, accentColor: 'var(--accent)' }} />
              </label>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>
              ↳ Custom cron expression
            </div>
          </div>

          {/* Settings (Security) */}
          <div style={sectionStyle}>
            <SectionHeader icon="shield" title="Security" subtitle="Retry and runtime limits" />
            <FormField id="jf-retry-max" label="Max Retries" value={job?.retry_max || job?.retryMax || '0'} placeholder="0" type="number" />
            <div style={{ marginTop: 12 }}>
              <FormField id="jf-retry-delay" label="Retry Delay (sec)" value={job?.retry_delay || job?.retryDelay || '30'} placeholder="30" type="number" />
            </div>
            <div style={{ marginTop: 12 }}>
              <FormField id="jf-max-runtime" label="Max Runtime (sec)" value={job?.max_runtime || job?.maxRuntime || '0'} placeholder="0 = unlimited" type="number" />
            </div>
          </div>

          {/* Estimated Impact */}
          <div style={{
            ...sectionStyle,
            background: 'var(--bg-tertiary)',
          }}>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
              Estimated Impact
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-secondary)' }}>Frequency</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                {cronDesc || 'Manual'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-secondary)' }}>Safety Level</span>
              <span style={{
                padding: '2px 10px', borderRadius: 'var(--radius-full)', fontSize: 12,
                fontWeight: 600, fontFamily: 'var(--font-sans)',
                background: selectedFlags.includes('--delete') ? 'var(--error-light)' : 'var(--success-light)',
                color: selectedFlags.includes('--delete') ? 'var(--error-text)' : 'var(--success-text)',
                border: `1px solid ${selectedFlags.includes('--delete') ? 'var(--error-border)' : 'var(--success-border)'}`,
              }}>
                {selectedFlags.includes('--delete') ? 'CAUTION' : 'SAFE'}
              </span>
            </div>
          </div>

          {/* Advanced */}
          <div style={sectionStyle}>
            <details>
              <summary style={{
                fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600,
                color: 'var(--text-primary)', cursor: 'pointer', padding: '4px 0',
              }}>Advanced Options</summary>
              <div style={{ marginTop: 16 }}>
                <FormField id="jf-exclude" label="Exclude Patterns" value={job?.exclude || job?.exclude_patterns} placeholder=".git, node_modules" />
                <div style={{ marginTop: 12 }}>
                  <FormField id="jf-bwlimit" label="Bandwidth Limit (KB/s)" value={job?.bwlimit || job?.bandwidth_limit} placeholder="0 = unlimited" />
                </div>
                <div style={{ marginTop: 12 }}>
                  <FormField id="jf-custom-flags" label="Custom Flags" value={job?.customFlags || job?.custom_flags} placeholder="--timeout=300" />
                </div>
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
