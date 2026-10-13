import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Store, FileText, ChevronLeft, Menu, X, Map, Users, Settings } from 'lucide-react';

const navItems = [
  { id: '/', label: 'Dashboard', icon: LayoutDashboard },
  { id: '/stores', label: 'Hardware Stores', icon: Store },
  { id: '/sales-persons', label: 'Sales Persons', icon: Users },
  { id: '/routes', label: 'Route Management', icon: Map },
  { id: '/full-report', label: 'Reports', icon: FileText },
  { id: '/settings', label: 'Settings', icon: Settings },
];

/**
 * Sidebar — Responsive drawer and navigation controller.
 *
 * Responsiveness architecture:
 * - Desktop: Fixed mini-rail (72px) expandable to 224px with hover tooltips and collapse toggle.
 * - Mobile (<1024px): Overlay drawer with full-width expanded items, safe-area bottom padding (pb-safe),
 *   instant route auto-close, touch backdrop dismissal, and dedicated 44px tap targets.
 */
export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(true); // COLLAPSED BY DEFAULT ON DESKTOP
  const [mobileOpen, setMobileOpen] = useState(false);

  // Auto-close mobile drawer when route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Determine active route
  const activeRoute = (path) => {
    if (path === '/') return location.pathname === '';
    return location.pathname.startsWith(path);
  };

  const handleNav = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  // Reusable nav items renderer
  const renderNavList = (isMobile = false) => {
    const isExpanded = isMobile || !collapsed;

    return (
      <div className={`h-full flex flex-col justify-between dark:bg-slate-800 ${isMobile ? 'pb-safe' : ''}`}>
        <div>
          {/* Logo */}
          <div className={`px-4 py-5 flex items-center ${!isExpanded ? 'justify-center' : 'gap-3'}`}>
            <img
              src="/logo.jpg"
              alt="Liyanage Distributors"
              className="w-10 h-10 rounded-xl object-cover flex-shrink-0 shadow-lg"
            />
            {isExpanded && (
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-gray-900 truncate dark:text-slate-100">Liyanage</h1>
                <p className="text-[10px] text-gray-500 font-medium truncate dark:text-slate-400">Distributors</p>
              </div>
            )}
          </div>

          {/* Navigation items */}
          <nav className="px-3 space-y-1.5 mt-2">
            {navItems.map(({ id, label, icon: Icon }) => (
              <div key={id} className="relative group">
                <button
                  type="button"
                  onClick={() => handleNav(id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    activeRoute(id)
                      ? 'bg-accent-50 text-accent-700 shadow-sm border border-accent-200 dark:bg-accent-900/30 dark:text-accent-300 dark:border-accent-700 font-semibold'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-transparent dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700/50'
                  } ${!isExpanded ? 'justify-center' : ''}`}
                >
                  <Icon size={19} className="flex-shrink-0" />
                  {isExpanded && <span className="truncate">{label}</span>}
                </button>

                {/* Tooltip on desktop rail hover */}
                {!isExpanded && (
                  <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-white text-gray-700 text-xs font-medium rounded-lg border border-gray-200 shadow-xl whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[60] pointer-events-none dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600">
                    {label}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* Collapse toggle (desktop only) */}
        {!isMobile && (
          <div className="hidden lg:block px-3 pb-4">
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-700/50"
            >
              <ChevronLeft size={14} className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
              {!collapsed && <span>Collapse</span>}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Desktop Sidebar (Mini-rail / Collapsible) */}
      <aside
        className={`hidden lg:flex flex-col fixed left-0 top-0 h-screen bg-white border-r border-gray-200 shadow-light-sidebar z-30 transition-all duration-300 dark:bg-slate-800 dark:border-slate-700 dark:shadow-premium ${
          collapsed ? 'w-[72px]' : 'w-56'
        }`}
      >
        {renderNavList(false)}
      </aside>

      {/* Mobile Hamburger Trigger */}
      <div className="lg:hidden fixed top-2 left-2 sm:top-2.5 sm:left-3 z-30">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/90 backdrop-blur-xl border border-gray-200/80 flex items-center justify-center text-gray-600 hover:text-gray-900 shadow-sm active:scale-95 transition-all dark:bg-slate-800/90 dark:border-slate-700 dark:text-slate-300 dark:hover:text-white"
        >
          <Menu size={18} />
        </button>
      </div>

      {/* Mobile Overlay Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex animate-in fade-in duration-200">
          {/* Touch Backdrop */}
          <div
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div className="relative w-64 max-w-[80vw] h-full bg-white border-r border-gray-200 shadow-2xl dark:bg-slate-800 dark:border-slate-700 flex flex-col animate-in slide-in-from-left duration-250">
            {/* Close button */}
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation menu"
              className="absolute top-4 right-3 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X size={18} />
            </button>

            {/* Fully expanded mobile drawer content */}
            {renderNavList(true)}
          </div>
        </div>
      )}
    </>
  );
}