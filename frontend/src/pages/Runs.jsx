import { useEffect } from 'preact/hooks';
import { api } from '../lib/api';
import { formatBytes, formatNumber, timeAgo } from '../lib/utils';
import { runs, runSearch, expandedLog } from '../lib/store';
import { Icon } from '../lib/icons';
import { StatusBadge } from '../components/StatusBadge';
import { SearchInput } from '../components/SearchInput';
import { showToast } from '../components/Toast';

export function Runs() {
  const loadRuns = () => {
    api('GET', '/api/runs/recent').then(r => { runs.value = r || []; expandedLog.value = null; }).catch(e => showToast(e.message, 'error'));
  };

  useEffect(() => { loadRuns(); }, []);

  const rq = (runSearch.value || '').toLowerCase();
  const filtered = (runs.value || []).filter(r => {
    if (!rq) return true;
    return (r.job_name || '').toLowerCase().includes(rq) || (r.status || '').toLowerCase().includes(rq);
  });

  const viewLog = async (id) => {
    try {
      const log = await api('GET', `/api/runs/${id}/log`);
      expandedLog.value = { runId: id, content: typeof log === 'string' ? log : (log?.content || JSON.stringify(log)) };
    } catch (err) { showToast(err.message, 'error'); }
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 26, margin: 0, color: 'var(--text-primary)' }}>
            Run History
          </h1>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            View all rsync job run history and logs.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SearchInput value={runSearch.value} onInput={v => { runSearch.value = v; }} placeholder="Filter runs..." />
          <button onClick={loadRuns} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px',
            background: 'var(--bg-secondary)', border: '1px solid var(--border-input)',
            borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)',
            fontFamily: 'var(--font-sans)', fontSize: 13, cursor: 'pointer', fontWeight: 500,
          }}>
            <Icon name="refresh" size={14} /> Refresh
          </button>
        </div>
      </div>

      <div style={{
        background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-primary)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-primary)' }}>
              {['Job', 'Run ID', 'Status', 'Started', 'Data', 'Files', 'Log'].map(h => (
                <th key={h} style={{
                  padding: '12px 16px', textAlign: 'left', fontFamily: 'var(--font-sans)',
                  fontSize: 12, textTransform: 'uppercase', color: 'var(--text-muted)',
                  fontWeight: 600, letterSpacing: '0.5px',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid var(--border-secondary)', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '12px 16px', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{r.job_name || '—'}</td>
                <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>#{r.id}</td>
                <td style={{ padding: '12px 16px' }}><StatusBadge status={r.status} /></td>
                <td style={{ padding: '12px 16px', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-secondary)' }}>{timeAgo(r.started_at)}</td>
                <td style={{ padding: '12px 16px', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-secondary)' }}>{formatBytes(r.bytes_transferred)}</td>
                <td style={{ padding: '12px 16px', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-secondary)' }}>{formatNumber(r.files_transferred)}</td>
                <td style={{ padding: '12px 16px' }}>
                  <button onClick={() => viewLog(r.id)} title="View Log" style={{
                    padding: '6px 8px', background: 'none', border: '1px solid var(--border-input)',
                    borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', cursor: 'pointer',
                  }}>
                    <Icon name="eye" size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan="7" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, fontFamily: 'var(--font-sans)' }}>
                No runs recorded
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {expandedLog.value && (
        <div style={{
          marginTop: 16, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-primary)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{
            padding: '12px 20px', borderBottom: '1px solid var(--border-primary)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              Log — Run #{expandedLog.value.runId}
            </span>
            <button onClick={() => { expandedLog.value = null; }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <Icon name="x" />
            </button>
          </div>
          <pre style={{
            margin: 0, padding: '16px 20px', background: 'var(--bg-code)',
            fontFamily: 'var(--font-mono)', fontSize: 12, color: '#94A3B8',
            maxHeight: 400, overflow: 'auto', whiteSpace: 'pre-wrap',
          }}>
            {expandedLog.value.content || 'No log content available.'}
          </pre>
        </div>
      )}
    </>
  );
}
