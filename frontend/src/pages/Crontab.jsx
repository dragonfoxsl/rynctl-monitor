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
      <div style="margin-bottom:24px;">
        <h1 style="font-family:'JetBrains Mono',monospace;font-weight:600;font-size:24px;margin:0;">
          <span style="color:#64748B;">~/</span><span style="color:#F1F5F9;">crontab</span>
        </h1>
      </div>
      <div style="background:#1E293B;border-radius:10px;border:1px solid #334155;overflow:hidden;">
        {entries.length === 0 ? (
          <div style="padding:32px;text-align:center;color:#64748B;font-family:'JetBrains Mono',monospace;font-size:13px;">No rsync entries found in system crontab</div>
        ) : (
          entries.map((e, i) => (
            <div key={i} style="background:#0F172A;border-radius:8px;padding:14px 18px;margin:12px 16px;">
              <span style="font-family:'JetBrains Mono',monospace;font-size:13px;color:#34D399;">{e}</span>
            </div>
          ))
        )}
      </div>
    </>
  );
}
