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
