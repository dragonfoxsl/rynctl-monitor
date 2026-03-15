import { useEffect } from 'preact/hooks';
import { api } from './lib/api';
import { user, page, modal, isAdmin } from './lib/store';
import { Sidebar } from './components/Sidebar';
import { ToastContainer } from './components/Toast';
import { ConfirmDialog } from './components/ConfirmDialog';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Jobs } from './pages/Jobs';
import { Runs } from './pages/Runs';
import { Flags } from './pages/Flags';
import { Crontab } from './pages/Crontab';
import { Users } from './pages/Users';
import { Settings } from './pages/Settings';

export function App() {
  // Check session on mount
  useEffect(() => {
    api('GET', '/api/auth/me')
      .then(me => {
        user.value = me;
        const hash = window.location.hash.replace('#', '') || 'dashboard';
        page.value = hash;
      })
      .catch(() => { page.value = 'login'; });
  }, []);

  // Listen for hash changes
  useEffect(() => {
    const handler = () => {
      const hash = window.location.hash.replace('#', '') || 'dashboard';
      if (user.value && hash !== page.value) {
        page.value = hash;
      }
    };
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const navigate = (p) => {
    page.value = p;
    window.location.hash = '#' + p;
  };

  // Not authenticated — show login
  if (page.value === 'login' || !user.value) {
    return (
      <>
        <Login />
        <ToastContainer />
      </>
    );
  }

  // Render current page
  let pageContent;
  switch (page.value) {
    case 'dashboard': pageContent = <Dashboard />; break;
    case 'jobs': pageContent = <Jobs />; break;
    case 'runs': pageContent = <Runs />; break;
    case 'flags': pageContent = <Flags />; break;
    case 'crontab': pageContent = <Crontab />; break;
    case 'users': pageContent = isAdmin() ? <Users /> : <Dashboard />; break;
    case 'settings': pageContent = isAdmin() ? <Settings /> : <Dashboard />; break;
    default: pageContent = <Dashboard />;
  }

  return (
    <>
      <Sidebar onNavigate={navigate} />
      <main style="margin-left:240px;padding:28px 36px;min-height:100vh;">
        {pageContent}
      </main>
      <ToastContainer />
      <ConfirmDialog />
    </>
  );
}
