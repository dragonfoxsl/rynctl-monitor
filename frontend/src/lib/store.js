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

// Theme: 'light' | 'dark'
const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('theme') : null;
const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
export const theme = signal(stored || (prefersDark ? 'dark' : 'light'));

export function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', theme.value);
  document.documentElement.classList.toggle('dark', theme.value === 'dark');
}

// Apply theme on load
if (typeof document !== 'undefined') {
  document.documentElement.classList.toggle('dark', theme.value === 'dark');
}

export function isAdmin() { return user.value && user.value.role === 'admin'; }
export function isReadonly() { return user.value && user.value.role === 'readonly'; }
