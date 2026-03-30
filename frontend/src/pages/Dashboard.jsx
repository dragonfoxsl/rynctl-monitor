import { useEffect } from 'preact/hooks';
import { api } from '../lib/api';
import { formatBytes, formatNumber, timeAgo } from '../lib/utils';
import { stats, runs, page } from '../lib/store';
import { StatusBadge, StatusDot } from '../components/StatusBadge';
import { showToast } from '../components/Toast';
import { Icon } from '../lib/icons';

export function Dashboard() {
  useEffect(() => {
    Promise.all([api('GET', '/api/stats'), api('GET', '/api/runs/recent')])
      .then(([s, r]) => { stats.value = s || {}; runs.value = r || []; })
      .catch(e => showToast(e.message, 'error'));
  }, []);

  const s = stats.value;

  const statCards = [
    { label: 'Active Tasks', value: formatNumber(s.total_jobs), icon: 'jobs', color: 'var(--accent)', bg: 'var(--accent-light)' },
    { label: '24h Success Rate', value: s.total_runs > 0 ? `${Math.round((s.successful / s.total_runs) * 100)}%` : '—', icon: 'check', color: 'var(--success-text)', bg: 'var(--success-light)' },
    { label: 'Data Moved', value: formatBytes(s.data_transferred), icon: 'database', color: 'var(--purple-text)', bg: 'var(--purple-light)' },
    { label: 'Critical Alerts', value: formatNumber(s.failed), icon: 'alert', color: 'var(--error-text)', bg: 'var(--error-light)' },
  ];

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 26, margin: 0, color: 'var(--text-primary)' }}>
            System Dashboard
          </h1>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Monitoring {formatNumber(s.total_jobs || 0)} synchronization tasks
          </p>
        </div>
        <button onClick={() => { page.value = 'create-job'; window.location.hash = '#create-job'; }} style={{
          padding: '10px 20px', background: 'var(--accent)', border: 'none',
          borderRadius: 'var(--radius-md)', color: '#fff', fontFamily: 'var(--font-sans)',
          fontSize: 14, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center',
          gap: 6, boxShadow: 'var(--shadow-sm)',
        }}>
          <Icon name="plus" size={14} /> Create New Job
        </button>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {statCards.map(c => (
          <div key={c.label} style={{
            background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
            padding: 20, border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>{c.label}</span>
              <div style={{
                width: 32, height: 32, borderRadius: 'var(--radius-md)',
                background: c.bg, display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: c.color,
              }}>
                <Icon name={c.icon} size={16} />
              </div>
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>
        {/* Job Performance */}
        <div style={{
          background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid var(--border-primary)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
              Job Performance
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>Last 24 hours</span>
          </div>
          <div style={{ padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {[
                { label: 'Total Runs', value: formatNumber(s.total_runs), color: 'var(--text-primary)' },
                { label: 'Successful', value: formatNumber(s.successful), color: 'var(--success-text)' },
                { label: 'Failed', value: formatNumber(s.failed), color: 'var(--error-text)' },
                { label: 'Running', value: formatNumber(s.running), color: 'var(--purple-text)' },
              ].map(item => (
                <div key={item.label} style={{ textAlign: 'center', padding: '12px 0' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: item.color, fontFamily: 'var(--font-sans)' }}>{item.value}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', marginTop: 4 }}>{item.label}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, padding: '16px 0', borderTop: '1px solid var(--border-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>Files Synced</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>{formatNumber(s.files_synced)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>Scheduled Jobs</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>{formatNumber(s.scheduled)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Status */}
        <div style={{
          background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid var(--border-primary)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
              Quick Status
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>Recent</span>
          </div>
          <div style={{ padding: '8px 0' }}>
            {(runs.value || []).slice(0, 6).map(r => (
              <div key={r.id} style={{
                padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12,
                borderBottom: '1px solid var(--border-secondary)',
              }}>
                <StatusDot status={r.status} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.job_name || '—'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', marginTop: 2 }}>
                    {timeAgo(r.started_at)} · {formatBytes(r.bytes_transferred)}
                  </div>
                </div>
              </div>
            ))}
            {(!runs.value || runs.value.length === 0) && (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, fontFamily: 'var(--font-sans)' }}>
                No recent activity
              </div>
            )}
            <div style={{ padding: '12px 20px' }}>
              <a href="#runs" onClick={e => { e.preventDefault(); page.value = 'runs'; window.location.hash = '#runs'; }}
                style={{ fontSize: 13, color: 'var(--accent)', fontFamily: 'var(--font-sans)', textDecoration: 'none', fontWeight: 500 }}>
                View All Job History →
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
