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
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:12px;">
        <h1 style="font-family:'JetBrains Mono',monospace;font-weight:600;font-size:24px;margin:0;">
          <span style="color:#64748B;">~/</span><span style="color:#F1F5F9;">run-history</span>
        </h1>
        <div style="display:flex;align-items:center;gap:12px;">
          <SearchInput value={runSearch.value} onInput={v => { runSearch.value = v; }} placeholder="Filter runs..." />
          <button onClick={loadRuns} style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:#1E293B;border:1px solid #334155;border-radius:8px;color:#94A3B8;font-family:'JetBrains Mono',monospace;font-size:12px;cursor:pointer;">
            <Icon name="refresh" /> Refresh
          </button>
        </div>
      </div>
      <p style="color:#64748B;font-family:'JetBrains Mono',monospace;font-size:12px;margin-bottom:20px;">View all rsync job run history and logs.</p>
      <div style="background:#1E293B;border-radius:10px;border:1px solid #334155;overflow:hidden;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:1px solid #334155;">
              {['Job', 'Run ID', 'Status', 'Started', 'Data', 'Files', 'Log'].map(h => (
                <th key={h} style="padding:10px 16px;text-align:left;font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;color:#64748B;">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} style="border-bottom:1px solid #1E293B;">
                <td style="padding:10px 16px;font-family:'JetBrains Mono',monospace;font-size:13px;color:#F1F5F9;">{r.job_name || '\u2014'}</td>
                <td style="padding:10px 16px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#94A3B8;">#{r.id}</td>
                <td style="padding:10px 16px;"><StatusBadge status={r.status} /></td>
                <td style="padding:10px 16px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#94A3B8;">{timeAgo(r.started_at)}</td>
                <td style="padding:10px 16px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#94A3B8;">{formatBytes(r.bytes_transferred)}</td>
                <td style="padding:10px 16px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#94A3B8;">{formatNumber(r.files_transferred)}</td>
                <td style="padding:10px 16px;">
                  <button onClick={() => viewLog(r.id)} title="View Log" style="padding:4px 8px;background:none;border:1px solid #475569;border-radius:6px;color:#94A3B8;cursor:pointer;">
                    <Icon name="eye" />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colspan="7" style="padding:24px;text-align:center;color:#64748B;font-family:'JetBrains Mono',monospace;font-size:13px;">No runs recorded</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {expandedLog.value && (
        <div style="margin-top:16px;background:#1E293B;border-radius:10px;border:1px solid #334155;overflow:hidden;">
          <div style="padding:12px 20px;border-bottom:1px solid #334155;display:flex;justify-content:space-between;align-items:center;">
            <span style="font-family:'JetBrains Mono',monospace;font-size:13px;color:#F1F5F9;">Log — Run #{expandedLog.value.runId}</span>
            <button onClick={() => { expandedLog.value = null; }} style="background:none;border:none;color:#64748B;cursor:pointer;"><Icon name="x" /></button>
          </div>
          <pre style="margin:0;padding:16px 20px;background:#020617;font-family:'JetBrains Mono',monospace;font-size:12px;color:#94A3B8;max-height:400px;overflow:auto;white-space:pre-wrap;">
            {expandedLog.value.content || 'No log content available.'}
          </pre>
        </div>
      )}
    </>
  );
}
