import { ALL_FLAGS } from '../lib/flags';

export function Flags() {
  return (
    <>
      <div style="margin-bottom:24px;">
        <h1 style="font-family:'JetBrains Mono',monospace;font-weight:600;font-size:24px;margin:0 0 8px;">
          <span style="color:#64748B;">~/</span><span style="color:#F1F5F9;">flags-reference</span>
        </h1>
        <p style="font-family:'IBM Plex Sans',-apple-system,sans-serif;font-size:14px;color:#94A3B8;margin:0;">
          Detailed descriptions of all rsync flags available when configuring jobs.
        </p>
      </div>

      <div style="display:flex;flex-direction:column;gap:12px;">
        {ALL_FLAGS.map(f => (
          <div key={f.flag} style="background:#1E293B;border:1px solid #334155;border-radius:12px;padding:20px;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
              <span style="display:inline-block;padding:4px 14px;border-radius:9999px;font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:600;background:rgba(59,130,246,0.12);border:1px solid #3B82F6;color:#60A5FA;">{f.flag}</span>
              <span style="font-family:'JetBrains Mono',monospace;font-size:14px;color:#F1F5F9;font-weight:500;">{f.label}</span>
            </div>
            <p style="font-family:'IBM Plex Sans',-apple-system,sans-serif;font-size:13px;color:#94A3B8;line-height:1.7;margin:0;">{f.desc}</p>
            <div style="margin-top:12px;">
              <code style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#22C55E;background:#020617;padding:6px 12px;border-radius:6px;display:inline-block;">rsync {f.flag} /source/ /dest/</code>
            </div>
          </div>
        ))}
      </div>

      {/* Advanced options */}
      <div style="margin-top:32px;margin-bottom:24px;">
        <h2 style="font-family:'JetBrains Mono',monospace;font-weight:600;font-size:18px;margin:0 0 8px;">
          <span style="color:#64748B;">~/</span><span style="color:#F1F5F9;">advanced-options</span>
        </h2>
        <p style="font-family:'IBM Plex Sans',-apple-system,sans-serif;font-size:14px;color:#94A3B8;margin:0;">
          Additional job configuration options beyond flag toggles.
        </p>
      </div>

      <div style="display:flex;flex-direction:column;gap:12px;">
        <AdvancedCard flag="--exclude" label="Exclude Patterns" color="#EAB308"
          desc={<>Exclude files or directories matching the given patterns. Patterns are matched against the relative path from the source directory. Each pattern goes on its own line. Supports wildcards: <Code>*</Code> matches any non-slash characters, <Code>**</Code> matches everything including slashes, <Code>?</Code> matches any single character.</>}
          examples={[
            ["--exclude '*.log'", 'Skip all log files'],
            ["--exclude 'node_modules/'", 'Skip node_modules directories'],
            ["--exclude '.git/' --exclude '*.tmp'", 'Multiple patterns (one per line in the UI)'],
          ]}
        />
        <AdvancedCard flag="--bwlimit" label="Bandwidth Limit" color="#EAB308"
          desc={<>Limits the transfer rate to the specified value in kilobytes per second. Prevents rsync from saturating the network link. Set to <Code>0</Code> for unlimited. You can also use suffixes: <Code>m</Code> for MBps, <Code>g</Code> for GBps.</>}
          examples={[
            ['--bwlimit=5000', 'Limit to 5,000 KB/s (~5 MB/s)'],
            ['--bwlimit=10m', 'Limit to 10 MB/s'],
            ['--bwlimit=0', 'No limit (default)'],
          ]}
        />
        <AdvancedCard flag="custom" label="Custom Flags" color="#EAB308"
          desc={<>Append any additional rsync flags not covered by the toggle chips. Entered as a raw space-separated string and appended verbatim. Useful for one-off options like <Code>--max-size</Code>, <Code>--min-size</Code>, <Code>--include</Code>, or <Code>--backup-dir</Code>.</>}
          examples={[
            ['--max-size=100m --timeout=300', 'Skip files over 100MB, timeout after 5 min'],
            ['--backup --backup-dir=/backups/old', 'Keep overwritten files in a backup directory'],
            ['--chmod=Du=rwx,Dg=rx,Fu=rw,Fg=r', 'Override permissions on destination'],
          ]}
        />
      </div>

      {/* Common combinations */}
      <div style="margin-top:24px;padding:20px;background:#1E293B;border:1px solid #334155;border-radius:12px;">
        <h2 style="font-family:'JetBrains Mono',monospace;font-size:14px;color:#F1F5F9;margin:0 0 12px;">Common Combinations</h2>
        <div style="display:flex;flex-direction:column;gap:8px;">
          {[
            ['rsync -avh', 'Standard backup — archive mode, verbose, human-readable'],
            ['rsync -avhz --delete', 'Mirror sync — compressed, removes deleted files from destination'],
            ['rsync -avhP', 'Resumable backup — shows progress, keeps partial files'],
            ['rsync -avhn --delete', 'Dry-run mirror — preview what would be deleted before committing'],
          ].map(([cmd, desc]) => (
            <div key={cmd} style="display:flex;align-items:center;gap:12px;">
              <code style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#22C55E;background:#020617;padding:6px 12px;border-radius:6px;min-width:200px;">{cmd}</code>
              <span style="font-family:'IBM Plex Sans',sans-serif;font-size:13px;color:#94A3B8;">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Code({ children }) {
  return <code style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#60A5FA;background:#020617;padding:2px 6px;border-radius:4px;">{children}</code>;
}

function AdvancedCard({ flag, label, color, desc, examples }) {
  return (
    <div style="background:#1E293B;border:1px solid #334155;border-radius:12px;padding:20px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
        <span style={`display:inline-block;padding:4px 14px;border-radius:9999px;font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:600;background:rgba(234,179,8,0.12);border:1px solid ${color};color:#FACC15;`}>{flag}</span>
        <span style="font-family:'JetBrains Mono',monospace;font-size:14px;color:#F1F5F9;font-weight:500;">{label}</span>
      </div>
      <p style="font-family:'IBM Plex Sans',-apple-system,sans-serif;font-size:13px;color:#94A3B8;line-height:1.7;margin:0 0 8px;">{desc}</p>
      <div style="display:flex;flex-direction:column;gap:6px;margin-top:12px;">
        {examples.map(([cmd, desc]) => (
          <div key={cmd} style="display:flex;align-items:center;gap:12px;">
            <code style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#22C55E;background:#020617;padding:6px 12px;border-radius:6px;min-width:280px;">{cmd}</code>
            <span style="font-family:'IBM Plex Sans',sans-serif;font-size:13px;color:#94A3B8;">{desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
