import { useEffect } from 'preact/hooks';
import { api } from '../lib/api';
import { formatBytes, formatNumber, timeAgo } from '../lib/utils';
import { stats, runs } from '../lib/store';
import { StatusBadge } from '../components/StatusBadge';
import { showToast } from '../components/Toast';

export function Dashboard() {
  useEffect(() => {
    Promise.all([api('GET', '/api/stats'), api('GET', '/api/runs/recent')])
      .then(([s, r]) => { stats.value = s || {}; runs.value = r || []; })
      .catch(e => showToast(e.message, 'error'));
  }, []);

  const s = stats.value;
  const cards = [
    { label: 'Total Jobs', value: formatNumber(s.total_jobs), color: '#3B82F6' },
    { label: 'Scheduled', value: formatNumber(s.scheduled), color: '#F1F5F9' },
    { label: 'Total Runs', value: formatNumber(s.total_runs), color: '#F1F5F9' },
    { label: 'Successful', value: formatNumber(s.successful), color: '#34D399' },
    { label: 'Failed', value: formatNumber(s.failed), color: '#F87171' },
    { label: 'Running', value: formatNumber(s.running), color: '#A78BFA' },
    { label: 'Data Transferred', value: formatBytes(s.data_transferred), color: '#F1F5F9' },
    { label: 'Files Synced', value: formatNumber(s.files_synced), color: '#F1F5F9' },
  ];

  return (
    <>
      <div style="margin-bottom:32px;">
        <h1 style="font-family:'JetBrains Mono',monospace;font-weight:600;font-size:24px;margin:0;">
          <span style="color:#64748B;">~/</span><span style="color:#F1F5F9;">dashboard</span>
        </h1>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:32px;">
        {cards.map(c => (
          <div key={c.label} style="background:#1E293B;border-radius:10px;padding:20px;border:1px solid #334155;">
            <div style="font-size:12px;color:#94A3B8;font-family:'JetBrains Mono',monospace;text-transform:uppercase;margin-bottom:8px;">{c.label}</div>
            <div style={`font-size:28px;font-weight:700;color:${c.color};font-family:'JetBrains Mono',monospace;`}>{c.value}</div>
          </div>
        ))}
      </div>
      <div style="background:#1E293B;border-radius:10px;border:1px solid #334155;overflow:hidden;">
        <div style="padding:16px 20px;border-bottom:1px solid #334155;">
          <span style="font-family:'JetBrains Mono',monospace;font-size:14px;color:#F1F5F9;font-weight:600;">Recent Activity</span>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:1px solid #334155;">
              {['Job', 'Status', 'Started', 'Data', 'Files'].map(h => (
                <th key={h} style="padding:10px 16px;text-align:left;font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;color:#64748B;">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(runs.value || []).slice(0, 10).map(r => (
              <tr key={r.id} style="border-bottom:1px solid #1E293B;">
                <td style="padding:10px 16px;font-family:'JetBrains Mono',monospace;font-size:13px;color:#F1F5F9;">{r.job_name || '\u2014'}</td>
                <td style="padding:10px 16px;"><StatusBadge status={r.status} /></td>
                <td style="padding:10px 16px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#94A3B8;">{timeAgo(r.started_at)}</td>
                <td style="padding:10px 16px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#94A3B8;">{formatBytes(r.bytes_transferred)}</td>
                <td style="padding:10px 16px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#94A3B8;">{formatNumber(r.files_transferred)}</td>
              </tr>
            ))}
            {(!runs.value || runs.value.length === 0) && (
              <tr><td colspan="5" style="padding:24px;text-align:center;color:#64748B;font-family:'JetBrains Mono',monospace;font-size:13px;">No recent activity</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
