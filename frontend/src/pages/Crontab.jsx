import { useEffect } from 'preact/hooks';
import { api } from '../lib/api';
import { crontabEntries } from '../lib/store';
import { showToast } from '../components/Toast';

export function Crontab() {
  useEffect(() => {
    api('GET', '/api/crontab')
      .then(data => { crontabEntries.value = data?.entries || []; })
      .catch(e => showToast(e.message, 'error'));
  }, []);

  const entries = crontabEntries.value || [];

  return (
    <>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 26, margin: 0, color: 'var(--text-primary)' }}>
          System Crontab
        </h1>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)', margin: '4px 0 0' }}>
          Active rsync entries detected in system crontab.
        </p>
      </div>
      <div style={{
        background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-primary)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
      }}>
        {entries.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', fontSize: 14 }}>
            No rsync entries found in system crontab
          </div>
        ) : (
          entries.map((e, i) => (
            <div key={i} style={{
              padding: '14px 20px', margin: '12px 16px',
              background: 'var(--bg-code)', borderRadius: 'var(--radius-md)',
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#34D399' }}>{e}</span>
            </div>
          ))
        )}
      </div>
    </>
  );
}
