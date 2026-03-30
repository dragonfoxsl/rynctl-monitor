import { useEffect } from 'preact/hooks';
import { api } from '../lib/api';
import { formatBytes, timeAgo, describeCron } from '../lib/utils';
import { jobs, jobSearch, modal, confirmDialog, isReadonly, page } from '../lib/store';
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

  const all = jobs.value || [];
  const totalJobs = all.length;
  const scheduled = all.filter(j => j.schedule_cron).length;
  const active = all.filter(j => j.last_status === 'running').length;
  const failed = all.filter(j => j.last_status === 'failed').length;

  const runJob = async (id) => {
    try { await api('POST', `/api/jobs/${id}/run`); showToast('Job started'); loadJobs(); }
    catch (err) { showToast(err.message, 'error'); }
  };

  const deleteJob = (id) => {
    confirmDialog.value = {
      title: 'Delete Job',
      message: 'Are you sure you want to delete this job? All run history will also be removed.',
      onConfirm: async () => {
        try { await api('DELETE', `/api/jobs/${id}`); showToast('Job deleted'); loadJobs(); }
        catch (err) { showToast(err.message, 'error'); }
      },
    };
  };

  const cloneJob = (j) => { modal.value = { type: 'job', data: { ...j, id: undefined, name: j.name + ' (copy)' } }; };

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 26, margin: 0, color: 'var(--text-primary)' }}>
            Task Management
          </h1>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Configure and monitor your automated rsync synchronization jobs.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            padding: '6px 14px', borderRadius: 'var(--radius-full)', fontSize: 13,
            fontFamily: 'var(--font-sans)', fontWeight: 500,
            background: 'var(--success-light)', color: 'var(--success-text)',
            border: '1px solid var(--success-border)',
          }}>System Connected</span>
          {!isReadonly() && (
            <button onClick={() => { page.value = 'create-job'; window.location.hash = '#create-job'; }} style={{
              padding: '10px 20px', background: 'var(--accent)', border: 'none',
              borderRadius: 'var(--radius-md)', color: '#fff', fontFamily: 'var(--font-sans)',
              fontSize: 14, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center',
              gap: 6, boxShadow: 'var(--shadow-sm)',
            }}>
              <Icon name="plus" size={14} /> New Job
            </button>
          )}
        </div>
      </div>

      {/* Stats Pills */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Jobs', value: totalJobs, color: 'var(--accent)', bg: 'var(--accent-light)' },
          { label: 'Scheduled', value: scheduled, color: 'var(--success-text)', bg: 'var(--success-light)' },
          { label: 'Active', value: active, color: 'var(--purple-text)', bg: 'var(--purple-light)' },
          { label: 'Failed', value: failed, color: 'var(--error-text)', bg: 'var(--error-light)' },
        ].map(s => (
          <div key={s.label} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px',
            background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', background: s.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 700, color: s.color, fontFamily: 'var(--font-sans)',
            }}>{s.value}</div>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)', fontWeight: 500 }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="list" size={16} />
          <span style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>
            Showing {filtered.length} of {totalJobs} jobs
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>Sort by: Name</span>
          <SearchInput value={jobSearch.value} onInput={v => { jobSearch.value = v; }} placeholder="Search jobs..." />
        </div>
      </div>

      {/* Table */}
      <div style={{
        background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-primary)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-primary)' }}>
              {['Job Name', 'Source / Destination', 'Schedule', 'Last Run', 'Status', 'Actions'].map(h => (
                <th key={h} style={{
                  padding: '12px 16px', textAlign: 'left', fontFamily: 'var(--font-sans)',
                  fontSize: 12, textTransform: 'uppercase', color: 'var(--text-muted)',
                  fontWeight: 600, letterSpacing: '0.5px',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(j => {
              const sched = j.schedule_cron;
              return (
                <tr key={j.id} style={{ borderBottom: '1px solid var(--border-secondary)', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>{j.name}</div>
                    {j.tags && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                        {j.tags.split(',').map(t => t.trim()).filter(Boolean).map(t => (
                          <span key={t} style={{
                            padding: '1px 8px', borderRadius: 'var(--radius-full)',
                            fontFamily: 'var(--font-sans)', fontSize: 11,
                            background: 'var(--accent-light)', color: 'var(--accent)',
                            border: '1px solid var(--accent-border)',
                          }}>{t}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                    {j.source} <span style={{ color: 'var(--accent)' }}>→</span> {j.destination}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {sched ? (
                      <span style={{
                        padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: 12,
                        fontFamily: 'var(--font-sans)', fontWeight: 500,
                        background: 'var(--accent-light)', color: 'var(--accent)',
                      }}>
                        {describeCron(sched) || sched}
                      </span>
                    ) : (
                      <span style={{
                        padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: 12,
                        fontFamily: 'var(--font-sans)', background: 'var(--bg-tertiary)',
                        color: 'var(--text-muted)',
                      }}>manual</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-secondary)' }}>
                    {timeAgo(j.last_run)}
                  </td>
                  <td style={{ padding: '14px 16px' }}><StatusDot status={j.last_status} /></td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {isReadonly() ? (
                        <button onClick={() => { modal.value = { type: 'job', data: j }; }} title="View" style={actionBtn('var(--text-secondary)', 'var(--border-input)')}>
                          <Icon name="eye" size={14} />
                        </button>
                      ) : (
                        <>
                          <button onClick={() => runJob(j.id)} title="Run" style={actionBtn('var(--success-text)', 'var(--success-border)')}>
                            <Icon name="play" size={14} />
                          </button>
                          <button onClick={() => { modal.value = { type: 'job', data: j }; }} title="Edit" style={actionBtn('var(--text-secondary)', 'var(--border-input)')}>
                            <Icon name="edit" size={14} />
                          </button>
                          <button onClick={() => cloneJob(j)} title="Clone" style={actionBtn('var(--text-secondary)', 'var(--border-input)')}>
                            <Icon name="clone" size={14} />
                          </button>
                          <button onClick={() => deleteJob(j.id)} title="Delete" style={actionBtn('var(--error-text)', 'var(--error-border)')}>
                            <Icon name="delete" size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan="6" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, fontFamily: 'var(--font-sans)' }}>
                No jobs configured
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Tips */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20 }}>
        <div style={{
          background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-primary)', padding: 20, boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Icon name="flag" size={16} />
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              Quick Tip: Bandwidth Limiting
            </span>
          </div>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            You can set bandwidth limits on jobs to prevent network saturation. Use the "Bandwidth Limit" setting in a job to limit KB/s.
          </p>
        </div>
        <div style={{
          background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-primary)', padding: 20, boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Icon name="terminal" size={16} />
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              Cron Expressions
            </span>
          </div>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            System supports standard cron syntax. Need help? Use our built-in scheduler when creating new jobs.
          </p>
        </div>
      </div>

      {modal.value?.type === 'job' && <JobModal job={modal.value.data} onSaved={loadJobs} />}
    </>
  );
}

function actionBtn(color, borderColor) {
  return {
    padding: '6px 8px', background: 'none', border: `1px solid ${borderColor}`,
    borderRadius: 'var(--radius-sm)', color, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
}
