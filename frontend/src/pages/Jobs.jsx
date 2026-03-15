import { useEffect } from 'preact/hooks';
import { api } from '../lib/api';
import { formatBytes, timeAgo } from '../lib/utils';
import { jobs, jobSearch, modal, confirmDialog, isReadonly } from '../lib/store';
import { Icon } from '../lib/icons';
import { StatusDot } from '../components/StatusBadge';
import { SearchInput } from '../components/SearchInput';
import { JobModal } from '../components/JobModal';
import { showToast } from '../components/Toast';

export function Jobs() {
  const loadJobs = () => api('GET', '/api/jobs').then(j => { jobs.value = j || []; }).catch(e => showToast(e.message, 'error'));

  useEffect(() => { loadJobs(); }, []);

  const q = (jobSearch.value || '').toLowerCase();
  const filtered = (jobs.value || []).filter(j => {
    if (!q) return true;
    return (j.name || '').toLowerCase().includes(q)
      || (j.source || '').toLowerCase().includes(q)
      || (j.destination || '').toLowerCase().includes(q)
      || (j.tags || '').toLowerCase().includes(q);
  });

  const runJob = async (id) => {
    try {
      await api('POST', `/api/jobs/${id}/run`);
      showToast('Job started');
      loadJobs();
    } catch (err) { showToast(err.message, 'error'); }
  };

  const deleteJob = (id) => {
    confirmDialog.value = {
      title: 'Delete Job',
      message: 'Are you sure you want to delete this job? All run history will also be removed. This cannot be undone.',
      onConfirm: async () => {
        try {
          await api('DELETE', `/api/jobs/${id}`);
          showToast('Job deleted');
          loadJobs();
        } catch (err) { showToast(err.message, 'error'); }
      },
    };
  };

  const cloneJob = (j) => {
    modal.value = { type: 'job', data: { ...j, id: undefined, name: j.name + ' (copy)' } };
  };

  return (
    <>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
        <h1 style="font-family:'JetBrains Mono',monospace;font-weight:600;font-size:24px;margin:0;">
          <span style="color:#64748B;">~/</span><span style="color:#F1F5F9;">jobs</span>
        </h1>
        <div style="display:flex;align-items:center;gap:12px;">
          <SearchInput value={jobSearch.value} onInput={v => { jobSearch.value = v; }} placeholder="Filter jobs..." />
          {!isReadonly() && (
            <button onClick={() => { modal.value = { type: 'job', data: null }; }} style="display:inline-flex;align-items:center;gap:6px;padding:8px 16px;background:#3B82F6;border:none;border-radius:8px;color:#fff;font-family:'JetBrains Mono',monospace;font-size:12px;cursor:pointer;">
              <Icon name="plus" /> New Job
            </button>
          )}
        </div>
      </div>
      <div style="background:#1E293B;border-radius:10px;border:1px solid #334155;overflow:hidden;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:1px solid #334155;">
              {['Name', 'Source / Dest', 'Schedule', 'Last Run', 'Status', 'Total Data', 'Actions'].map(h => (
                <th key={h} style="padding:10px 16px;text-align:left;font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;color:#64748B;">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(j => {
              const sched = j.schedule_cron;
              return (
                <tr key={j.id} style="border-bottom:1px solid #1E293B;">
                  <td style="padding:10px 16px;">
                    <div style="font-family:'JetBrains Mono',monospace;font-size:13px;color:#F1F5F9;">{j.name}</div>
                    {j.tags && (
                      <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">
                        {j.tags.split(',').map(t => t.trim()).filter(Boolean).map(t => (
                          <span key={t} style="padding:1px 6px;border-radius:9999px;font-family:'JetBrains Mono',monospace;font-size:10px;background:rgba(59,130,246,0.15);color:#60A5FA;border:1px solid #1E3A5F;">{t}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style="padding:10px 16px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#94A3B8;">
                    {j.source} <span style="color:#3B82F6;">→</span> {j.destination}
                  </td>
                  <td style="padding:10px 16px;">
                    {sched
                      ? <span style="background:#065F46;color:#34D399;padding:2px 8px;border-radius:9999px;font-size:11px;font-family:'JetBrains Mono',monospace;">{sched}</span>
                      : <span style="background:#334155;color:#94A3B8;padding:2px 8px;border-radius:9999px;font-size:11px;font-family:'JetBrains Mono',monospace;">manual</span>
                    }
                  </td>
                  <td style="padding:10px 16px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#94A3B8;">{timeAgo(j.last_run)}</td>
                  <td style="padding:10px 16px;"><StatusDot status={j.last_status} /></td>
                  <td style="padding:10px 16px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#94A3B8;">{formatBytes(j.total_data)}</td>
                  <td style="padding:10px 16px;">
                    {isReadonly() ? (
                      <button onClick={() => { modal.value = { type: 'job', data: j }; }} title="View" style="padding:4px 8px;background:none;border:1px solid #475569;border-radius:6px;color:#94A3B8;cursor:pointer;"><Icon name="eye" /></button>
                    ) : (
                      <>
                        <button onClick={() => runJob(j.id)} title="Run" style="padding:4px 8px;background:none;border:1px solid #16A34A;border-radius:6px;color:#34D399;cursor:pointer;margin-right:4px;"><Icon name="play" /></button>
                        <button onClick={() => { modal.value = { type: 'job', data: j }; }} title="Edit" style="padding:4px 8px;background:none;border:1px solid #475569;border-radius:6px;color:#94A3B8;cursor:pointer;margin-right:4px;"><Icon name="edit" /></button>
                        <button onClick={() => cloneJob(j)} title="Clone" style="padding:4px 8px;background:none;border:1px solid #475569;border-radius:6px;color:#94A3B8;cursor:pointer;margin-right:4px;"><Icon name="clone" /></button>
                        <button onClick={() => deleteJob(j.id)} title="Delete" style="padding:4px 8px;background:none;border:1px solid #DC2626;border-radius:6px;color:#F87171;cursor:pointer;"><Icon name="delete" /></button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colspan="7" style="padding:24px;text-align:center;color:#64748B;font-family:'JetBrains Mono',monospace;font-size:13px;">No jobs configured</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal.value?.type === 'job' && <JobModal job={modal.value.data} onSaved={loadJobs} />}
    </>
  );
}
