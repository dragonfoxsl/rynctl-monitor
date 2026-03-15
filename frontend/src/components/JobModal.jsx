import { useState, useEffect, useCallback } from 'preact/hooks';
import { Icon } from '../lib/icons';
import { ALL_FLAGS, DEFAULT_FLAGS } from '../lib/flags';
import { buildRsyncCommand } from '../lib/utils';
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

export function JobModal({ job, onSaved }) {
  const isEdit = !!job?.id;
  const title = isEdit ? 'Edit rsync Job' : 'New rsync Job';

  const initialFlags = isEdit && job.flags
    ? job.flags.split(/\s+/).filter(Boolean)
    : [...DEFAULT_FLAGS];

  const [selectedFlags, setSelectedFlags] = useState(initialFlags);
  const [preview, setPreview] = useState('rsync -avh /source/ /dest/');

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
    setPreview(buildRsyncCommand(getFormData()));
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
              <FormField id="jf-source" label="Source Path" value={job?.source} placeholder="/path/to/source/" required />
              <div style="font-size:10px;color:#EAB308;font-family:'JetBrains Mono',monospace;margin-top:4px;display:flex;align-items:center;gap:4px;">
                <Icon name="warning" />
                Trailing / syncs contents only — without / syncs the folder itself
              </div>
            </div>
            <FormField id="jf-dest" label="Destination Path" value={job?.dest || job?.destination} placeholder="/path/to/dest/" required />
          </div>

          <div style="display:grid;grid-template-columns:5fr 2fr 5fr;gap:16px;margin-top:16px;">
            <FormField id="jf-remote-host" label="Remote Host" value={job?.remoteHost || job?.remote_host} placeholder="user@host" />
            <FormField id="jf-ssh-port" label="SSH Port" value={job?.sshPort || job?.ssh_port || '22'} placeholder="22" />
            <FormField id="jf-ssh-key" label="SSH Key Path" value={job?.sshKey || job?.ssh_key} placeholder="~/.ssh/id_rsa" />
          </div>

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
            <FormField id="jf-schedule" label="Cron Schedule" value={job?.schedule || job?.schedule_cron} placeholder="0 */6 * * *" />
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
