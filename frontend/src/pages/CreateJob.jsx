import { useState, useEffect, useCallback } from 'preact/hooks';
import { Icon } from '../lib/icons';
import { ALL_FLAGS, DEFAULT_FLAGS } from '../lib/flags';
import { buildRsyncCommand, describeCron } from '../lib/utils';
import { page, modal } from '../lib/store';
import { api } from '../lib/api';
import { showToast } from '../components/Toast';

/* ── Shared styles ── */

const cardStyle = {
  background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--border-primary)', marginBottom: 20,
  boxShadow: 'var(--shadow-sm)', overflow: 'hidden',
};

const cardHeaderStyle = {
  padding: '14px 20px', borderBottom: '1px solid var(--border-primary)',
  display: 'flex', alignItems: 'center', gap: 10,
};

const cardBodyStyle = { padding: 20 };

const labelStyle = {
  display: 'block', fontFamily: 'var(--font-sans)', fontSize: 12,
  fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6,
  textTransform: 'uppercase', letterSpacing: '0.4px',
};

const inputStyle = {
  width: '100%', padding: '10px 14px', background: 'var(--bg-input)',
  border: '1px solid var(--border-input)', borderRadius: 'var(--radius-md)',
  color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', fontSize: 14,
  outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s, box-shadow 0.15s',
};

const iconBadge = (color, bg) => ({
  width: 30, height: 30, borderRadius: 'var(--radius-md)',
  background: bg, display: 'flex', alignItems: 'center',
  justifyContent: 'center', color, flexShrink: 0,
});

/* ── Small components ── */

function SectionTitle({ icon, title, subtitle, color, bg, right }) {
  return (
    <div style={cardHeaderStyle}>
      <div style={iconBadge(color || 'var(--accent)', bg || 'var(--accent-light)')}>
        <Icon name={icon} size={15} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</div>
        {subtitle && <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}

function FormField({ id, label, value, placeholder, required, type, hint, children, style: wrapStyle }) {
  return (
    <div style={wrapStyle || {}}>
      <label htmlFor={id} style={labelStyle}>
        {label}{required && <span style={{ color: 'var(--error)' }}> *</span>}
      </label>
      {children || (
        <input id={id} type={type || 'text'} value={value || ''} placeholder={placeholder || ''} style={inputStyle} />
      )}
      {hint && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'var(--font-sans)' }}>{hint}</div>}
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

function PathInput({ id, label, value: initialValue, placeholder, required, host, port, sshKey, onChange }) {
  const [browserOpen, setBrowserOpen] = useState(false);
  const [inputValue, setInputValue] = useState(initialValue || '');

  const updateValue = (val) => {
    setInputValue(val);
    if (onChange) onChange(val);
  };

  return (
    <div>
      <label htmlFor={id} style={labelStyle}>{label}{required && <span style={{ color: 'var(--error)' }}> *</span>}</label>
      <div style={{ display: 'flex', gap: 4 }}>
        <input id={id} type="text" value={inputValue} placeholder={placeholder || ''}
          onInput={(e) => updateValue(e.target.value)}
          style={{ ...inputStyle, flex: 1 }} />
        <button onClick={() => setBrowserOpen(true)} title="Browse files" style={{
          padding: '8px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-input)',
          borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', cursor: 'pointer',
          display: 'flex', alignItems: 'center',
        }}>
          <Icon name="folder" />
        </button>
      </div>
      {browserOpen && (
        <FileBrowser initialPath={inputValue || '/'} host={host} port={port} sshKey={sshKey}
          onSelect={(val) => { updateValue(val); setBrowserOpen(false); }}
          onClose={() => setBrowserOpen(false)} />
      )}
    </div>
  );
}

function FlagPill({ flag, label, selected, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 14px', borderRadius: 'var(--radius-full)',
      fontFamily: 'var(--font-sans)', fontSize: 12, cursor: 'pointer',
      border: `1px solid ${selected ? 'var(--accent)' : 'var(--border-input)'}`,
      background: selected ? 'var(--accent-light)' : 'transparent',
      color: selected ? 'var(--accent)' : 'var(--text-secondary)',
      fontWeight: selected ? 600 : 400, transition: 'all .15s', userSelect: 'none',
      display: 'inline-flex', alignItems: 'center', gap: 5,
    }}>
      {selected && <Icon name="check" size={12} />}
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{flag}</span>
      <span>{label}</span>
    </button>
  );
}

function ToggleSwitch({ checked, onChange }) {
  const [on, setOn] = useState(!!checked);
  return (
    <div
      className={`toggle-switch ${on ? 'active' : ''}`}
      onClick={() => { setOn(!on); if (onChange) onChange(!on); }}
      style={{ flexShrink: 0 }}
    />
  );
}

function CollapsibleCard({ icon, title, subtitle, color, bg, defaultOpen, dark, children }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div style={{ ...cardStyle, ...(dark && !open ? { background: 'var(--bg-code)' } : {}) }}>
      <div style={{ ...cardHeaderStyle, cursor: 'pointer', ...(dark && !open ? { borderBottom: 'none' } : {}) }}
        onClick={() => setOpen(!open)}>
        <div style={iconBadge(color || 'var(--accent)', bg || 'var(--accent-light)')}>
          <Icon name={icon} size={15} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: dark && !open ? '#94A3B8' : 'var(--text-primary)' }}>{title}</div>
          {subtitle && <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: dark && !open ? '#64748B' : 'var(--text-muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</div>}
        </div>
        <div style={{
          color: 'var(--text-muted)', transition: 'transform 0.2s',
          transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
        }}>
          <Icon name="chevron-right" size={14} />
        </div>
      </div>
      {open && <div style={cardBodyStyle}>{children}</div>}
    </div>
  );
}

/* Cron preset buttons */
const CRON_PRESETS = [
  { label: 'Every hour', cron: '0 * * * *' },
  { label: 'Every 6h', cron: '0 */6 * * *' },
  { label: 'Daily midnight', cron: '0 0 * * *' },
  { label: 'Daily 3 AM', cron: '0 3 * * *' },
  { label: 'Weekly Sun', cron: '0 0 * * 0' },
  { label: 'Monthly 1st', cron: '0 0 1 * *' },
];

/* ── Main component ── */

export function CreateJob({ job, onSaved }) {
  const isEdit = !!job?.id;

  const initialFlags = isEdit && job.flags
    ? job.flags.split(/\s+/).filter(Boolean)
    : [...DEFAULT_FLAGS];

  const [selectedFlags, setSelectedFlags] = useState(initialFlags);
  const [preview, setPreview] = useState('rsync -avh /source/ /dest/');
  const [cronDesc, setCronDesc] = useState('');
  const [showAllFlags, setShowAllFlags] = useState(false);
  const [sshEnabled, setSshEnabled] = useState(
    !!(job?.remote_host || job?.remoteHost)
  );
  const [scheduleEnabled, setScheduleEnabled] = useState(
    !!(job?.scheduleEnabled || job?.schedule_enabled)
  );

  const getFormData = useCallback(() => {
    const g = id => document.getElementById(id)?.value || '';
    return {
      name: g('jf-name'), source: g('jf-source'), dest: g('jf-dest'),
      remoteHost: sshEnabled ? g('jf-remote-host') : '',
      sshPort: sshEnabled ? g('jf-ssh-port') : '',
      sshKey: sshEnabled ? g('jf-ssh-key') : '',
      flags: selectedFlags.join(' '), exclude: g('jf-exclude'), bwlimit: g('jf-bwlimit'),
      customFlags: g('jf-custom-flags'), tags: g('jf-tags'),
      retryMax: g('jf-retry-max'), retryDelay: g('jf-retry-delay'), maxRuntime: g('jf-max-runtime'),
      schedule: g('jf-schedule'),
      scheduleEnabled,
    };
  }, [selectedFlags, sshEnabled, scheduleEnabled]);

  const updatePreview = useCallback(() => {
    const fd = getFormData();
    setPreview(buildRsyncCommand(fd));
    setCronDesc(describeCron(fd.schedule));
  }, [getFormData]);

  useEffect(() => { updatePreview(); }, [selectedFlags, sshEnabled]);

  const toggleFlag = (flag) => {
    setSelectedFlags(prev =>
      prev.includes(flag) ? prev.filter(f => f !== flag) : [...prev, flag]
    );
  };

  const setCronValue = (cron) => {
    const el = document.getElementById('jf-schedule');
    if (el) {
      el.value = cron;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
    setCronDesc(describeCron(cron));
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

  const quickFlags = [
    { flag: '-a', label: 'Archive' },
    { flag: '-z', label: 'Compress' },
    { flag: '--delete', label: 'Delete' },
    { flag: '-v', label: 'Verbose' },
    { flag: '-u', label: 'Update' },
    { flag: '-n', label: 'Dry Run' },
    { flag: '-P', label: 'Progress' },
    { flag: '-c', label: 'Checksum' },
  ];

  const extraFlags = ALL_FLAGS.filter(f => !quickFlags.some(qf => qf.flag === f.flag));

  return (
    <div onInput={updatePreview}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 26, margin: 0, color: 'var(--text-primary)' }}>
            {isEdit ? 'Edit Job' : 'Create New Job'}
          </h1>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Configure your rsync synchronization job
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={discard} style={{
            padding: '10px 20px', background: 'transparent', border: '1px solid var(--border-input)',
            borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)',
            fontFamily: 'var(--font-sans)', fontSize: 14, cursor: 'pointer', fontWeight: 500,
          }}>Cancel</button>
          <button onClick={save} style={{
            padding: '10px 24px', background: 'var(--accent)', border: 'none',
            borderRadius: 'var(--radius-md)', color: '#fff',
            fontFamily: 'var(--font-sans)', fontSize: 14, cursor: 'pointer', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 6, boxShadow: 'var(--shadow-sm)',
          }}>
            <Icon name="check" size={14} /> {isEdit ? 'Save Changes' : 'Create Job'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
        {/* ── Left Column ── */}
        <div>
          {/* Job Identity */}
          <div style={cardStyle}>
            <SectionTitle icon="tag" title="Job Identity" subtitle="Name and organize your sync task" />
            <div style={cardBodyStyle}>
              <FormField id="jf-name" label="Job Name" value={job?.name} placeholder="e.g. Daily Production Backup" required />
              <div style={{ marginTop: 14 }}>
                <FormField id="jf-tags" label="Tags" value={job?.tags} placeholder="backup, production, daily"
                  hint="Comma-separated tags for filtering and organization" />
              </div>
            </div>
          </div>

          {/* Paths */}
          <div style={cardStyle}>
            <SectionTitle icon="folder" title="Source & Destination" subtitle="Directories to synchronize" />
            <div style={cardBodyStyle}>
              <PathInput id="jf-source" label="Source Path" value={job?.source} placeholder="/home/user/data/" required host="" port="" sshKey="" onChange={updatePreview} />
              <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-light)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--accent)', fontSize: 14,
                }}>
                  <Icon name="chevron-right" size={14} />
                </div>
              </div>
              <PathInput id="jf-dest" label="Destination Path" value={job?.dest || job?.destination} placeholder="/backup/data/" required
                host={sshEnabled ? (document.getElementById('jf-remote-host')?.value || job?.remote_host || '') : ''}
                port={sshEnabled ? (document.getElementById('jf-ssh-port')?.value || job?.ssh_port || '22') : ''}
                sshKey={sshEnabled ? (document.getElementById('jf-ssh-key')?.value || job?.ssh_key || '') : ''}
                onChange={updatePreview} />
            </div>
          </div>

          {/* SSH Configuration — collapsible via toggle */}
          <div style={cardStyle}>
            <SectionTitle icon="wifi" title="SSH Configuration" subtitle="Remote transfer settings"
              color="var(--purple-text)" bg="var(--purple-light)"
              right={<ToggleSwitch checked={sshEnabled} onChange={setSshEnabled} />}
            />
            {sshEnabled && (
              <div style={cardBodyStyle}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 12 }}>
                  <FormField id="jf-remote-host" label="Remote Host" value={job?.remoteHost || job?.remote_host} placeholder="user@hostname" />
                  <FormField id="jf-ssh-port" label="Port" value={job?.sshPort || job?.ssh_port || '22'} placeholder="22" />
                </div>
                <div style={{ marginTop: 14 }}>
                  <FormField id="jf-ssh-key" label="SSH Key Path" value={job?.sshKey || job?.ssh_key} placeholder="~/.ssh/id_rsa"
                    hint="Leave empty to use the default SSH key" />
                </div>
              </div>
            )}
          </div>

          {/* Rsync Flags — below SSH */}
          <div style={cardStyle}>
            <SectionTitle icon="flag" title="Rsync Flags" subtitle={`${selectedFlags.length} flags selected`} />
            <div style={cardBodyStyle}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {quickFlags.map(f => (
                  <FlagPill key={f.flag} flag={f.flag} label={f.label}
                    selected={selectedFlags.includes(f.flag)} onClick={() => toggleFlag(f.flag)} />
                ))}
              </div>
              {extraFlags.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <button onClick={() => setShowAllFlags(!showAllFlags)} style={{
                    background: 'none', border: 'none', padding: '4px 0',
                    fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--accent)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    {showAllFlags ? 'Hide' : 'Show'} all flags ({extraFlags.length} more)
                  </button>
                  {showAllFlags && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {extraFlags.map(f => (
                        <FlagPill key={f.flag} flag={f.flag} label={f.label}
                          selected={selectedFlags.includes(f.flag)} onClick={() => toggleFlag(f.flag)} />
                      ))}
                    </div>
                  )}
                </div>
              )}
              {selectedFlags.includes('--delete') && (
                <div style={{
                  marginTop: 12, padding: '8px 14px', background: 'var(--error-light)',
                  borderRadius: 'var(--radius-sm)', border: '1px solid var(--error-border)',
                  fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--error-text)',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <Icon name="alert" size={14} /> The --delete flag will remove files from destination that don't exist in source.
                </div>
              )}
            </div>
          </div>

          {/* Execution Limits — collapsible */}
          <CollapsibleCard
            icon="shield" title="Execution Limits" subtitle="Retry and timeout settings"
            color="var(--warning-text)" bg="var(--warning-light)"
            defaultOpen={!!(job?.retry_max || job?.retryMax || job?.max_runtime || job?.maxRuntime)}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <FormField id="jf-retry-max" label="Max Retries" value={job?.retry_max || job?.retryMax || '0'} placeholder="0" type="number" />
              <FormField id="jf-retry-delay" label="Retry Delay (s)" value={job?.retry_delay || job?.retryDelay || '30'} placeholder="30" type="number" />
              <FormField id="jf-max-runtime" label="Max Runtime (s)" value={job?.max_runtime || job?.maxRuntime || '0'} placeholder="0 = no limit" type="number" />
            </div>
          </CollapsibleCard>

          {/* Advanced Options — collapsible */}
          <CollapsibleCard
            icon="settings" title="Advanced Options" subtitle="Excludes, bandwidth, custom flags"
            color="var(--text-muted)" bg="var(--bg-tertiary)"
            defaultOpen={!!(job?.exclude_patterns || job?.exclude || job?.bandwidth_limit || job?.bwlimit || job?.custom_flags || job?.customFlags)}
          >
            <FormField id="jf-exclude" label="Exclude Patterns" value={job?.exclude || job?.exclude_patterns} placeholder=".git, node_modules, *.tmp"
              hint="Comma-separated glob patterns to exclude" />
            <div style={{ marginTop: 14 }}>
              <FormField id="jf-bwlimit" label="Bandwidth Limit (KB/s)" value={job?.bwlimit || job?.bandwidth_limit} placeholder="0 = unlimited" />
            </div>
            <div style={{ marginTop: 14 }}>
              <FormField id="jf-custom-flags" label="Custom Flags" value={job?.customFlags || job?.custom_flags} placeholder="--timeout=300 --partial-dir=.rsync-partial" />
            </div>
          </CollapsibleCard>

          {/* Command Preview — collapsible */}
          <CollapsibleCard
            icon="terminal" title="Command Preview" subtitle={preview.length > 40 ? preview.substring(0, 40) + '...' : preview}
            color="#94A3B8" bg="var(--bg-code)"
            defaultOpen={true}
            dark
          >
            <div style={{
              padding: '14px 16px', background: 'var(--bg-code)', borderRadius: 'var(--radius-md)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
            }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#E2E8F0', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.6, flex: 1 }}>
                <span style={{ color: '#64748B' }}>$ </span>
                <span style={{ color: '#34D399' }}>{preview}</span>
              </div>
              <button onClick={() => { navigator.clipboard?.writeText(preview); showToast('Copied!'); }}
                style={{
                  padding: '4px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 'var(--radius-sm)', color: '#94A3B8', fontSize: 12,
                  fontFamily: 'var(--font-sans)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                  flexShrink: 0,
                }}>
                <Icon name="clone" size={12} /> Copy
              </button>
            </div>
          </CollapsibleCard>
        </div>

        {/* ── Right Column ── */}
        <div>
          {/* Schedule / Cron */}
          <div style={cardStyle}>
            <SectionTitle icon="history" title="Schedule" subtitle="Automate with cron timing"
              color="var(--success-text)" bg="var(--success-light)"
              right={
                <ToggleSwitch checked={scheduleEnabled} onChange={(v) => setScheduleEnabled(v)} />
              }
            />
            <div style={cardBodyStyle}>
              <FormField id="jf-schedule" label="Cron Expression" value={job?.schedule || job?.schedule_cron} placeholder="0 */6 * * *" />
              <input id="jf-schedule-enabled" type="checkbox" checked={scheduleEnabled}
                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
              {cronDesc && (
                <div style={{
                  marginTop: 8, padding: '8px 12px', background: 'var(--success-light)',
                  borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-sans)',
                  fontSize: 12, color: 'var(--success-text)', border: '1px solid var(--success-border)',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <Icon name="check" size={12} /> {cronDesc}
                </div>
              )}
              <div style={{ marginTop: 12 }}>
                <div style={{ ...labelStyle, marginBottom: 8 }}>Quick Presets</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {CRON_PRESETS.map(p => (
                    <button key={p.cron} onClick={() => setCronValue(p.cron)} style={{
                      padding: '5px 12px', borderRadius: 'var(--radius-full)',
                      border: '1px solid var(--border-input)', background: 'transparent',
                      color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)',
                      fontSize: 12, cursor: 'pointer', transition: 'all .15s',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-input)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    >{p.label}</button>
                  ))}
                </div>
              </div>
              {!scheduleEnabled && (
                <div style={{
                  marginTop: 12, padding: '8px 12px', background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-sans)',
                  fontSize: 12, color: 'var(--text-muted)',
                }}>
                  Schedule is disabled. Enable the toggle above to activate.
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          <div style={{
            ...cardStyle, background: 'var(--bg-tertiary)', marginBottom: 0,
          }}>
            <div style={{ padding: 20 }}>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14 }}>
                Summary
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-secondary)' }}>Transfer</span>
                  <span style={{
                    padding: '2px 10px', borderRadius: 'var(--radius-full)', fontSize: 12,
                    fontWeight: 500, fontFamily: 'var(--font-sans)',
                    background: sshEnabled ? 'var(--purple-light)' : 'var(--accent-light)',
                    color: sshEnabled ? 'var(--purple-text)' : 'var(--accent)',
                    border: `1px solid ${sshEnabled ? 'var(--purple-border)' : 'var(--accent-border)'}`,
                  }}>
                    {sshEnabled ? 'Remote (SSH)' : 'Local'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-secondary)' }}>Frequency</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>
                    {scheduleEnabled && cronDesc ? cronDesc : 'Manual'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-secondary)' }}>Safety</span>
                  <span style={{
                    padding: '2px 10px', borderRadius: 'var(--radius-full)', fontSize: 12,
                    fontWeight: 600, fontFamily: 'var(--font-sans)',
                    background: selectedFlags.includes('--delete') ? 'var(--error-light)' : 'var(--success-light)',
                    color: selectedFlags.includes('--delete') ? 'var(--error-text)' : 'var(--success-text)',
                    border: `1px solid ${selectedFlags.includes('--delete') ? 'var(--error-border)' : 'var(--success-border)'}`,
                  }}>
                    {selectedFlags.includes('--delete') ? 'DESTRUCTIVE' : selectedFlags.includes('-n') ? 'DRY RUN' : 'SAFE'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-secondary)' }}>Flags</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                    {selectedFlags.join(' ')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
