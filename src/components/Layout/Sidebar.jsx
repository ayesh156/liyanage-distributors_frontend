import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Store, FileText, ChevronLeft, Menu, X, Map, Users } from 'lucide-react';

const navItems = [
  { id: '/', label: 'Dashboard', icon: LayoutDashboard },
  { id: '/stores', label: 'Hardware Stores', icon: Store },
  { id: '/sales-persons', label: 'Sales Persons', icon: Users },
  { id: '/routes', label: 'Route Management', icon: Map },
  { id: '/full-report', label: 'Reports', icon: FileText },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(true); // COLLAPSED BY DEFAULT
  const [mobileOpen, setMobileOpen] = useState(false);

  // Determine active route
  const activeRoute = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleNav = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="h-full flex flex-col dark:bg-slate-800">
      {/* Logo */}
      <div className={`px-4 py-6 flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <img
          src="/logo.jpg"
          alt="Liyanage Distributors"
          className="w-10 h-10 rounded-xl object-cover flex-shrink-0 shadow-lg"
        />
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-gray-900 truncate dark:text-slate-100">Liyanage</h1>
            <p className="text-[10px] text-gray-500 font-medium truncate dark:text-slate-400">Distributors</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map(({ id, label, icon: Icon }) => (
          <div key={id} className="relative group">
            <button
              onClick={() => handleNav(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeRoute(id)
                  ? 'bg-accent-50 text-accent-700 shadow-sm border border-accent-200 dark:bg-accent-900/30 dark:text-accent-300 dark:border-accent-700'
                   : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 border border-transparent dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700/50'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </button>
            {/* Tooltip — appears on hover when collapsed */}
            {collapsed && (
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-white text-gray-700 text-xs font-medium rounded-lg border border-gray-200 shadow-xl whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[60] pointer-events-none dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600">
                {label}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Collapse toggle - desktop only */}
      <div className="hidden lg:block px-3 pb-4">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-700/50"
        >
          <ChevronLeft size={14} className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col fixed left-0 top-0 h-screen bg-white border-r border-gray-200 shadow-light-sidebar z-30 transition-all duration-300 dark:bg-slate-800 dark:border-slate-700 dark:shadow-premium ${
          collapsed ? 'w-[72px]' : 'w-56'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Hamburger */}
      <div className="lg:hidden fixed top-0 left-0 z-50 p-4">
        <button
          onClick={() => setMobileOpen(true)}
          className="w-10 h-10 rounded-xl bg-white/80 backdrop-blur-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 shadow-sm dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <Menu size={18} />
        </button>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm dark:bg-gray-900/40" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 bg-white border-r border-gray-200 shadow-2xl dark:bg-slate-800 dark:border-slate-700">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}