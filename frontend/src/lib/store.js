// Lightweight reactive store using Preact signals pattern
import { signal } from '@preact/signals';

export const user = signal(null);
export const page = signal('login');
export const jobs = signal([]);
export const stats = signal({});
export const runs = signal([]);
export const crontabEntries = signal([]);
export const users = signal([]);
export const modal = signal(null);       // { type: 'job'|'user', data }
export const expandedLog = signal(null);  // { runId, content }
export const confirmDialog = signal(null); // { title, message, onConfirm }
export const jobSearch = signal('');
export const runSearch = signal('');

export function isAdmin() { return user.value && user.value.role === 'admin'; }
export function isReadonly() { return user.value && user.value.role === 'readonly'; }
