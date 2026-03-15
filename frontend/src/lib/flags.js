export const ALL_FLAGS = [
  { flag: '-a', label: 'archive', desc: 'Equivalent to -rlptgoD. Preserves permissions, timestamps, symbolic links, owner, group, and device files. The most commonly used flag for backups.' },
  { flag: '-v', label: 'verbose', desc: 'Increases verbosity. Shows files being transferred and gives a summary at the end. Use -vv or -vvv for more detail.' },
  { flag: '-h', label: 'human', desc: 'Outputs numbers (file sizes, transfer rates) in a human-readable format (e.g., 1.2G instead of 1234567890).' },
  { flag: '-z', label: 'compress', desc: 'Compresses data during transfer using zlib. Reduces bandwidth usage but adds CPU overhead. Most beneficial for slow network links.' },
  { flag: '-P', label: 'progress', desc: 'Combines --progress and --partial. Shows per-file transfer progress and keeps partially transferred files so interrupted transfers can resume.' },
  { flag: '--delete', label: 'delete', desc: 'Deletes files on the destination that no longer exist on the source. Makes destination an exact mirror. Use with caution — data on destination can be permanently removed.' },
  { flag: '-n', label: 'dry-run', desc: 'Performs a trial run without making any changes. Shows what would be transferred or deleted. Always recommended before running --delete for the first time.' },
  { flag: '--partial', label: 'partial', desc: 'Keeps partially transferred files instead of deleting them. Allows interrupted transfers to be resumed without starting over.' },
  { flag: '-r', label: 'recursive', desc: 'Copies directories recursively. Already included when using -a (archive mode), so only needed when not using -a.' },
  { flag: '-u', label: 'update', desc: 'Skips files that are newer on the destination than on the source. Prevents overwriting newer changes on the destination.' },
  { flag: '-c', label: 'checksum', desc: 'Uses checksum (MD5/MD4) instead of modification time and size to determine if files have changed. Slower but more accurate.' },
  { flag: '-H', label: 'hardlinks', desc: 'Preserves hard links between files. Without this flag, hard-linked files are transferred as separate copies.' },
  { flag: '-A', label: 'acls', desc: 'Preserves Access Control Lists (ACLs). Required when source filesystem uses ACLs for fine-grained permissions beyond standard Unix permissions.' },
  { flag: '-X', label: 'xattrs', desc: 'Preserves extended attributes (xattrs). Used for SELinux contexts, capabilities, and other metadata stored in extended attributes.' },
  { flag: '--stats', label: 'stats', desc: 'Prints a detailed summary of the transfer including bytes sent/received, speedup ratio, and file counts. Automatically appended by RynctlMonitor for metric tracking.' },
];

export const DEFAULT_FLAGS = ['-a', '-v', '-h'];
