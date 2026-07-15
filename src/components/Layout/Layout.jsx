import { Outlet, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import Sidebar from './Sidebar';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '../../context/AuthContext';

const routeMeta = {
  '/': { title: 'Dashboard', subtitle: 'Overview of your business outstanding' },
  '/stores': { title: 'Hardware Stores', subtitle: 'Manage your hardware store accounts' },
  '/routes': { title: 'Route Management', subtitle: 'Configure delivery routes, areas & schedules' },
  '/full-report': { title: 'Outstanding Report', subtitle: 'Detailed outstanding statement' },
};

function getMeta(pathname) {
  if (pathname === '/') return routeMeta['/'];
  if (pathname.startsWith('/stores')) return routeMeta['/stores'];
  if (pathname.startsWith('/routes')) return routeMeta['/routes'];
  if (pathname.startsWith('/full-report')) return routeMeta['/full-report'];
  return { title: 'Dashboard', subtitle: 'Overview of your business outstanding' };
}

export default function Layout() {
  const location = useLocation();
  const meta = getMeta(location.pathname);
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Sidebar />

      {/* Header bar — hidden during print */}
      <header
        className={`sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-gray-200 transition-all duration-300 lg:ml-[72px] dark:bg-slate-800/80 dark:border-slate-700`}
        id="layout-header"
      >
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="lg:hidden w-12" /> {/* spacer for mobile hamburger */}
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white font-bold capitalize">
                {meta.title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {meta.subtitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-slate-100">
              {user?.username || 'ADMIN'}
            </span>
            <ThemeToggle />
            <button
              onClick={logout}
              className="btn-ghost text-xs px-2.5 py-2 text-slate-900 dark:text-slate-100"
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main
        className={`transition-all duration-300 lg:ml-[72px]`}
        id="layout-main"
      >
        <div className="w-full min-w-full px-5 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}