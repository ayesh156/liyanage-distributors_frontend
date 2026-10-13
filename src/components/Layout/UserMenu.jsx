import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Shield, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/**
 * Computes uppercase user initials from name or username.
 * e.g., "Ayesh Chathuranga" -> "AC", "Admin" -> "AD"
 */
function getInitials(name, username) {
  if (name && typeof name === 'string' && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (username && typeof username === 'string' && username.trim()) {
    return username.trim().slice(0, 2).toUpperCase();
  }
  return 'AC';
}

/**
 * UserMenu: Executive dark-themed user avatar popover and dropdown menu.
 * Integrates Profile Settings, Staff Access, and graceful Sign Out.
 */
export default function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  const displayName = user?.name || (user?.username === 'admin' ? 'Ayesh Chathuranga' : user?.username) || 'Ayesh Chathuranga';
  const displayEmail = user?.email || (user?.username === 'admin' ? 'ayesh@gmail.com' : `${user?.username || 'user'}@liyanagedistributors.com`);
  const initials = getInitials(user?.name, user?.username);
  const roleLabel = (user?.role || 'ADMIN').toUpperCase();

  // Close on outside click or escape press
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleNavigate = (path) => {
    setIsOpen(false);
    navigate(path);
  };

  const handleSignOut = () => {
    setIsOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      {/* Trigger Button */}
      <button
        type="button"
        id="user-profile-menu-button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1.5 rounded-full sm:rounded-2xl border border-gray-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/80 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
      >
        {/* Avatar circle with initials */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-700 to-violet-600 text-white font-semibold text-xs flex items-center justify-center shadow-sm flex-shrink-0 tracking-wider">
          {initials}
        </div>

        {/* User full name display (visible on sm+) */}
        <div className="hidden sm:flex flex-col text-left pr-1">
          <span className="text-xs font-semibold text-slate-800 dark:text-zinc-100 truncate max-w-[130px]">
            {displayName}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-zinc-400 font-medium leading-none">
            {roleLabel}
          </span>
        </div>

        <ChevronDown
          size={14}
          className={`text-slate-400 dark:text-zinc-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Adaptive Theme-Responsive Dropdown Menu Panel */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="user-profile-menu-button"
          className="absolute right-0 mt-2.5 w-[calc(100vw-24px)] max-w-xs sm:w-72 origin-top-right rounded-2xl bg-white text-slate-800 border border-slate-200 shadow-xl dark:bg-zinc-900 dark:text-white dark:border-zinc-800 dark:shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 focus:outline-none"
        >
          {/* Header */}
          <div className="px-3.5 py-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold text-sm flex items-center justify-center shadow-md flex-shrink-0">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                  {displayName}
                </p>
                <p className="font-mono text-xs text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                  {displayEmail}
                </p>
              </div>
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-indigo-600 border border-slate-200 dark:bg-zinc-800 dark:text-indigo-400 dark:border-zinc-700/60">
                {roleLabel}
              </span>
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Active Session
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="border-b border-slate-100 dark:border-zinc-800 my-1" />

          {/* Navigation Option 1: Profile Settings */}
          <button
            type="button"
            role="menuitem"
            onClick={() => handleNavigate('/settings?tab=profile')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-200 dark:hover:text-white dark:hover:bg-zinc-800 transition-colors text-left group min-h-[44px]"
          >
            <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-slate-200 dark:bg-zinc-800 dark:group-hover:bg-zinc-700 flex items-center justify-center text-slate-600 group-hover:text-slate-900 dark:text-zinc-300 dark:group-hover:text-white transition-colors">
              <User size={15} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-medium">Profile Settings</span>
              <p className="text-[10px] text-slate-400 dark:text-zinc-400 truncate">Account credentials & security</p>
            </div>
          </button>

          {/* Navigation Option 2: Staff Access */}
          <button
            type="button"
            role="menuitem"
            onClick={() => handleNavigate('/settings?tab=users')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-200 dark:hover:text-white dark:hover:bg-zinc-800 transition-colors text-left group min-h-[44px]"
          >
            <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-slate-200 dark:bg-zinc-800 dark:group-hover:bg-zinc-700 flex items-center justify-center text-slate-600 group-hover:text-slate-900 dark:text-zinc-300 dark:group-hover:text-white transition-colors">
              <Shield size={15} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-medium">Staff Access</span>
              <p className="text-[10px] text-slate-400 dark:text-zinc-400 truncate">Manage roles & user permissions</p>
            </div>
          </button>

          {/* Divider */}
          <div className="border-b border-slate-100 dark:border-zinc-800 my-1" />

          {/* Navigation Option 3: Sign Out */}
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-500 dark:hover:bg-rose-500/10 transition-colors text-left group min-h-[44px]"
          >
            <div className="w-7 h-7 rounded-lg bg-rose-50 group-hover:bg-rose-100 dark:bg-rose-500/10 dark:group-hover:bg-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-500 transition-colors">
              <LogOut size={15} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-medium">Sign Out</span>
              <p className="text-[10px] text-rose-400/80 truncate">End current session securely</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
