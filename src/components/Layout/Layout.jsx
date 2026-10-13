import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import ThemeToggle from './ThemeToggle';
import UserMenu from './UserMenu';

const routeMeta = {
  '/': { title: 'Dashboard', subtitle: 'Overview of your business outstanding' },
  '/stores': { title: 'Hardware Stores', subtitle: 'Manage your hardware store accounts' },
  '/sales-persons': { title: 'Sales Representatives', subtitle: 'Manage sales field officers and assign stores' },
  '/routes': { title: 'Route Management', subtitle: 'Configure delivery routes, areas & schedules' },
  '/full-report': { title: 'Outstanding Report', subtitle: 'Detailed outstanding statement' },
  '/settings': { title: 'Settings & Administration', subtitle: 'Account credentials, profile details and staff permissions' },
};

function getMeta(pathname) {
  if (pathname === '/') return routeMeta['/'];
  if (pathname.startsWith('/stores')) return routeMeta['/stores'];
  if (pathname.startsWith('/sales-persons')) return routeMeta['/sales-persons'];
  if (pathname.startsWith('/routes')) return routeMeta['/routes'];
  if (pathname.startsWith('/full-report')) return routeMeta['/full-report'];
  if (pathname.startsWith('/settings')) return routeMeta['/settings'];
  return { title: 'Dashboard', subtitle: 'Overview of your business outstanding' };
}

/**
 * Layout — Global responsive application shell.
 *
 * Responsiveness architecture:
 * - Header adapts dynamically between mobile (<640px) and tablet/desktop (>=640px).
 * - Left header area accommodates the mobile hamburger drawer button with dedicated spacing
 *   and safeguards long page titles/subtitles against collisions with action controls.
 * - Main container enforces zero horizontal overflow (overflow-x-hidden) with safe fluid padding.
 */
export default function Layout() {
  const location = useLocation();
  const meta = getMeta(location.pathname);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 overflow-x-hidden">
      <Sidebar />

      {/* Header bar — hidden during print */}
      <header
        className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-gray-200 transition-all duration-300 lg:ml-[72px] dark:bg-slate-800/80 dark:border-slate-700"
        id="layout-header"
      >
        <div className="flex items-center justify-between px-2 sm:px-4 md:px-6 py-2.5 sm:py-3 gap-2">
          {/* Title group with mobile hamburger clearance */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile hamburger clearance spacer (w-10 ensures 40px tap space) */}
            <div className="lg:hidden w-10 flex-shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold sm:font-semibold text-slate-900 dark:text-white capitalize truncate max-w-[160px] xs:max-w-[220px] sm:max-w-none">
                {meta.title}
              </h2>
              <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {meta.subtitle}
              </p>
            </div>
          </div>

          {/* Action controls (Theme switch + User popover) */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main content viewport — optimized edge-to-edge mobile padding */}
      <main
        className="transition-all duration-300 lg:ml-[72px] overflow-x-hidden"
        id="layout-main"
      >
        <div className="w-full max-w-full px-1.5 sm:px-4 md:px-6 py-3 sm:py-6 overflow-x-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
}