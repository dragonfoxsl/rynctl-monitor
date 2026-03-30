import { ALL_FLAGS } from '../lib/flags';

export function Flags() {
  return (
    <>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 26, margin: '0 0 6px', color: 'var(--text-primary)' }}>
          Flags Reference
        </h1>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
          Detailed descriptions of all rsync flags available when configuring jobs.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {ALL_FLAGS.map(f => (
          <div key={f.flag} style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-lg)', padding: 20, boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <span style={{
                display: 'inline-block', padding: '4px 14px', borderRadius: 'var(--radius-full)',
                fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600,
                background: 'var(--accent-light)', border: '1px solid var(--accent)',
                color: 'var(--accent)',
              }}>{f.flag}</span>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{f.label}</span>
            </div>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>{f.desc}</p>
            <div style={{ marginTop: 12 }}>
              <code style={{
                fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--success-text)',
                background: 'var(--bg-code)', padding: '6px 12px', borderRadius: 'var(--radius-sm)',
                display: 'inline-block',
              }}>rsync {f.flag} /source/ /dest/</code>
            </div>
          </div>
        ))}
      </div>

      {/* Advanced options */}
      <div style={{ marginTop: 32, marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 20, margin: '0 0 6px', color: 'var(--text-primary)' }}>
          Advanced Options
        </h2>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
          Additional job configuration options beyond flag toggles.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <AdvancedCard flag="--exclude" label="Exclude Patterns"
          desc={<>Exclude files or directories matching the given patterns. Supports wildcards: <Code>*</Code> matches any non-slash characters, <Code>**</Code> matches everything including slashes.</>}
          examples={[
            ["--exclude '*.log'", 'Skip all log files'],
            ["--exclude 'node_modules/'", 'Skip node_modules directories'],
            ["--exclude '.git/' --exclude '*.tmp'", 'Multiple patterns'],
          ]}
        />
        <AdvancedCard flag="--bwlimit" label="Bandwidth Limit"
          desc={<>Limits the transfer rate in KB/s. Set to <Code>0</Code> for unlimited. You can use suffixes: <Code>m</Code> for MBps.</>}
          examples={[
            ['--bwlimit=5000', 'Limit to ~5 MB/s'],
            ['--bwlimit=10m', 'Limit to 10 MB/s'],
          ]}
        />
        <AdvancedCard flag="custom" label="Custom Flags"
          desc={<>Append any additional rsync flags. Entered as a raw space-separated string. Useful for <Code>--max-size</Code>, <Code>--timeout</Code>, or <Code>--backup-dir</Code>.</>}
          examples={[
            ['--max-size=100m --timeout=300', 'Skip files over 100MB, timeout after 5 min'],
            ['--backup --backup-dir=/backups/old', 'Keep overwritten files'],
          ]}
        />
      </div>

      {/* Common combinations */}
      <div style={{
        marginTop: 24, padding: 20, background: 'var(--bg-secondary)',
        border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 12px' }}>Common Combinations</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            ['rsync -avh', 'Standard backup — archive, verbose, human-readable'],
            ['rsync -avhz --delete', 'Mirror sync — compressed, removes deleted files'],
            ['rsync -avhP', 'Resumable backup — shows progress, keeps partial files'],
            ['rsync -avhn --delete', 'Dry-run mirror — preview before committing'],
          ].map(([cmd, desc]) => (
            <div key={cmd} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <code style={{
                fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--success-text)',
                background: 'var(--bg-code)', padding: '6px 12px', borderRadius: 'var(--radius-sm)',
                minWidth: 200,
              }}>{cmd}</code>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-secondary)' }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Code({ children }) {
  return <code style={{
    fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)',
    background: 'var(--bg-code)', padding: '2px 6px', borderRadius: 4,
  }}>{children}</code>;
}

function AdvancedCard({ flag, label, desc, examples }) {
  return (
    <div style={{
      background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
      borderRadius: 'var(--radius-lg)', padding: 20, boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <span style={{
          display: 'inline-block', padding: '4px 14px', borderRadius: 'var(--radius-full)',
          fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600,
          background: 'var(--warning-light)', border: '1px solid var(--warning-border)',
          color: 'var(--warning-text)',
        }}>{flag}</span>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{label}</span>
      </div>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, margin: '0 0 8px' }}>{desc}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
        {examples.map(([cmd, desc]) => (
          <div key={cmd} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <code style={{
              fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--success-text)',
              background: 'var(--bg-code)', padding: '6px 12px', borderRadius: 'var(--radius-sm)',
              minWidth: 280,
            }}>{cmd}</code>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-secondary)' }}>{desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
