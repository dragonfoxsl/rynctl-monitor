import { modal } from '../lib/store';
import { CreateJob } from '../pages/CreateJob';

/**
 * JobModal — thin wrapper that renders CreateJob inside a modal overlay
 * for editing existing jobs. New job creation uses the full-page CreateJob.
 */
export function JobModal({ job, onSaved }) {
  const close = () => { modal.value = null; };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      overflowY: 'auto', padding: '40px 20px',
    }} onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <div style={{
        background: 'var(--bg-primary)', borderRadius: 'var(--radius-xl)',
        width: '100%', maxWidth: 1100, animation: 'slideUp .25s ease',
        padding: 32, boxShadow: 'var(--shadow-lg)',
      }} onClick={e => e.stopPropagation()}>
        <CreateJob job={job} onSaved={() => { modal.value = null; onSaved(); }} />
      </div>
    </div>
  );
}
