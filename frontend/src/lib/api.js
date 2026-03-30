let csrfToken = null;

async function getCsrfToken() {
  if (csrfToken) return csrfToken;
  const res = await fetch('/api/auth/csrf', { credentials: 'same-origin' });
  if (!res.ok) throw new Error('Failed to fetch CSRF token');
  const data = await res.json();
  csrfToken = data?.csrf_token || null;
  if (!csrfToken) throw new Error('Missing CSRF token');
  return csrfToken;
}

export function clearCsrfToken() {
  csrfToken = null;
}

export async function csrfHeaders() {
  return { 'X-CSRF-Token': await getCsrfToken() };
}

// API helper — handles JSON requests with credentials
export async function api(method, url, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
  };
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase()) && url !== '/api/auth/login') {
    opts.headers['X-CSRF-Token'] = await getCsrfToken();
  }
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) clearCsrfToken();
    let msg = res.statusText;
    try {
      const j = await res.json();
      msg = j.detail || j.error || j.message || msg;
    } catch (_) {}
    throw new Error(msg);
  }
  if (url === '/api/auth/login' || url === '/api/auth/logout') clearCsrfToken();
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
