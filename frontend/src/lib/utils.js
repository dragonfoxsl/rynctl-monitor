export function formatBytes(bytes) {
  if (bytes == null || isNaN(bytes)) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let v = Number(bytes);
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return (i === 0 ? v : v.toFixed(1)) + ' ' + units[i];
}

export function formatNumber(n) {
  if (n == null) return '0';
  return Number(n).toLocaleString('en-US');
}

export function timeAgo(dateStr) {
  if (!dateStr) return '\u2014';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  if (diff < 2592000) return Math.floor(diff / 86400) + 'd ago';
  return new Date(dateStr).toLocaleDateString();
}

export function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Convert a 5-field cron expression (minute hour dom month dow) to
// a human-readable plain English description.
// Examples: "0 0/6 * * *" → "Every 6 hours", "30 2 * * 1" → "At 02:30, on Monday"
export function describeCron(expr) {
  if (!expr || !expr.trim()) return '';
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return 'Invalid cron expression (need 5 fields)';

  const [min, hour, dom, mon, dow] = parts;

  const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const describeField = (val, names) => {
    if (val === '*') return null;
    if (val.includes('/')) {
      const [, step] = val.split('/');
      return `every ${step}`;
    }
    if (val.includes(',')) {
      return val.split(',').map(v => names ? (names[parseInt(v)] || v) : v).join(', ');
    }
    if (val.includes('-')) {
      const [a, b] = val.split('-');
      const fa = names ? (names[parseInt(a)] || a) : a;
      const fb = names ? (names[parseInt(b)] || b) : b;
      return `${fa} through ${fb}`;
    }
    return names ? (names[parseInt(val)] || val) : val;
  };

  // Common patterns
  if (min === '*' && hour === '*' && dom === '*' && mon === '*' && dow === '*')
    return 'Every minute';
  if (hour === '*' && dom === '*' && mon === '*' && dow === '*') {
    if (min.includes('/')) return `Every ${min.split('/')[1]} minutes`;
    return `At minute ${min} of every hour`;
  }
  if (dom === '*' && mon === '*' && dow === '*') {
    if (hour.includes('/')) {
      const step = hour.split('/')[1];
      const atMin = min === '0' ? '' : ` at minute ${min}`;
      return `Every ${step} hours${atMin}`;
    }
    if (hour === '*') return `Every hour at minute ${min}`;
    return `Daily at ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
  }

  // Build description from pieces
  const pieces = [];

  // Time
  if (min !== '*' && hour !== '*' && !hour.includes('/') && !min.includes('/'))
    pieces.push(`At ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`);
  else if (min !== '*' || hour !== '*') {
    const mDesc = min === '*' ? 'every minute' : (min.includes('/') ? `every ${min.split('/')[1]} minutes` : `minute ${min}`);
    const hDesc = hour === '*' ? 'every hour' : (hour.includes('/') ? `every ${hour.split('/')[1]} hours` : `hour ${hour}`);
    pieces.push(`${mDesc}, ${hDesc}`);
  }

  // Day of month
  if (dom !== '*') {
    const d = describeField(dom);
    pieces.push(dom.includes('/') ? `every ${dom.split('/')[1]} days` : `on day ${d} of the month`);
  }

  // Month
  if (mon !== '*') {
    const m = describeField(mon, monthNames);
    pieces.push(`in ${m}`);
  }

  // Day of week
  if (dow !== '*') {
    const d = describeField(dow, dayNames);
    pieces.push(dow.includes('/') ? `every ${dow.split('/')[1]} days of the week` : `on ${d}`);
  }

  return pieces.join(', ') || 'Every minute';
}

export function buildRsyncCommand(fd) {
  const parts = ['rsync'];
  if (fd.flags) parts.push(fd.flags.trim());
  if (fd.customFlags) parts.push(fd.customFlags.trim());
  if (fd.exclude) {
    fd.exclude.split(',').map(e => e.trim()).filter(Boolean).forEach(e => parts.push(`--exclude='${e}'`));
  }
  if (fd.bwlimit) parts.push(`--bwlimit=${fd.bwlimit}`);
  if (fd.remoteHost) {
    const port = fd.sshPort || '22';
    const keyPart = fd.sshKey ? ` -i ${fd.sshKey}` : '';
    parts.push(`-e 'ssh -p ${port}${keyPart}'`);
    parts.push(fd.source || '/source/');
    parts.push(`${fd.remoteHost}:${fd.dest || '/dest/'}`);
  } else {
    parts.push(fd.source || '/source/');
    parts.push(fd.dest || '/dest/');
  }
  return parts.join(' ');
}
