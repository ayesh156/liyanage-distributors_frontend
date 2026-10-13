import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  User,
  Shield,
  Key,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Save,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Edit2,
  Trash2,
  RotateCcw,
  Check,
  ShieldAlert,
  UserCheck,
  UserX,
  Users,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { usersApi } from '../../services/api';

/**
 * Computes uppercase user initials from name or username.
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
  return 'LD';
}

/**
 * Password strength evaluator.
 */
function evaluatePasswordStrength(password) {
  if (!password) return { score: 0, label: '', color: 'bg-zinc-700' };
  let score = 0;
  if (password.length >= 5) score += 1;
  if (password.length >= 10) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;

  if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-rose-500' };
  if (score === 2) return { score: 2, label: 'Fair', color: 'bg-amber-500' };
  if (score === 3 || score === 4) return { score: 3, label: 'Strong', color: 'bg-indigo-500' };
  return { score: 4, label: 'Excellent', color: 'bg-emerald-500' };
}

export default function SettingsManager() {
  const { user, updateUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'users' ? 'users' : 'profile';

  const setTab = (tab) => {
    setSearchParams({ tab });
  };

  // -------------------------------------------------------------
  // TAB 1: PROFILE & SECURITY STATE
  // -------------------------------------------------------------
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    username: user?.username || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Sync profile form when auth context user changes
  useEffect(() => {
    if (user) {
      setProfileForm((prev) => ({
        ...prev,
        name: user.name || (user.username === 'admin' ? 'Ayesh Chathuranga' : user.username) || '',
        username: user.username || '',
        email: user.email || (user.username === 'admin' ? 'ayesh@gmail.com' : '') || '',
      }));
    }
  }, [user]);

  const passwordStrength = useMemo(
    () => evaluatePasswordStrength(profileForm.newPassword),
    [profileForm.newPassword]
  );

  const passwordsMatch = useMemo(() => {
    if (!profileForm.newPassword) return true;
    return profileForm.newPassword === profileForm.confirmPassword;
  }, [profileForm.newPassword, profileForm.confirmPassword]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();

    if (!profileForm.username.trim()) {
      toast.error('Username cannot be empty');
      return;
    }

    if (profileForm.newPassword) {
      if (!profileForm.currentPassword) {
        toast.error('Current password is required to change password');
        return;
      }
      if (profileForm.newPassword.length < 5) {
        toast.error('New password must be at least 5 characters');
        return;
      }
      if (profileForm.newPassword !== profileForm.confirmPassword) {
        toast.error('New passwords do not match');
        return;
      }
    }

    setIsSavingProfile(true);
    try {
      const payload = {
        name: profileForm.name.trim(),
        username: profileForm.username.trim(),
        email: profileForm.email.trim(),
      };

      if (profileForm.newPassword) {
        payload.currentPassword = profileForm.currentPassword;
        payload.newPassword = profileForm.newPassword;
      }

      const res = await usersApi.updateProfile(payload);
      if (res?.data) {
        updateUser(res.data);
      }
      toast.success('Profile settings updated successfully');

      // Clear password fields
      setProfileForm((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 2: STAFF & USER MANAGEMENT STATE
  // -------------------------------------------------------------
  const [usersList, setUsersList] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editUserModal, setEditUserModal] = useState({ isOpen: false, user: null });
  const [resetPasswordModal, setResetPasswordModal] = useState({ isOpen: false, user: null });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, user: null });

  // Create Form State
  const [createForm, setCreateForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'STAFF',
    status: 'ACTIVE',
  });

  // Edit Form State
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: 'STAFF',
    status: 'ACTIVE',
  });

  // Reset Password Form State
  const [resetPasswordInput, setResetPasswordInput] = useState('');

  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const res = await usersApi.list();
      setUsersList(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      toast.error(err.message || 'Failed to load staff list');
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab, fetchUsers]);

  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      const query = userSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        u.username?.toLowerCase().includes(query) ||
        u.name?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query);

      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [usersList, userSearchQuery, roleFilter]);

  const stats = useMemo(() => {
    const total = usersList.length;
    const admins = usersList.filter((u) => u.role === 'ADMIN').length;
    const staff = usersList.filter((u) => u.role === 'STAFF').length;
    const active = usersList.filter((u) => u.status === 'ACTIVE').length;
    return { total, admins, staff, active };
  }, [usersList]);

  // Handle Create User Submit
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!createForm.username.trim() || !createForm.password.trim()) {
      toast.error('Username and password are required');
      return;
    }
    if (createForm.password.length < 5) {
      toast.error('Password must be at least 5 characters');
      return;
    }

    try {
      await usersApi.create(createForm);
      toast.success('Staff account created successfully');
      setIsCreateModalOpen(false);
      setCreateForm({
        name: '',
        username: '',
        email: '',
        password: '',
        role: 'STAFF',
        status: 'ACTIVE',
      });
      fetchUsers();
    } catch (err) {
      toast.error(err.message || 'Failed to create user');
    }
  };

  // Open Edit Modal
  const openEditModal = (u) => {
    setEditUserModal({ isOpen: true, user: u });
    setEditForm({
      name: u.name || '',
      email: u.email || '',
      role: u.role || 'STAFF',
      status: u.status || 'ACTIVE',
    });
  };

  // Handle Edit User Submit
  const handleEditUser = async (e) => {
    e.preventDefault();
    if (!editUserModal.user) return;

    try {
      await usersApi.update(editUserModal.user.id, editForm);
      toast.success('Staff profile updated');
      setEditUserModal({ isOpen: false, user: null });
      fetchUsers();
    } catch (err) {
      toast.error(err.message || 'Failed to update user');
    }
  };

  // Toggle Status directly
  const handleToggleStatus = async (u) => {
    const newStatus = u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await usersApi.update(u.id, { status: newStatus });
      toast.success(`Account status changed to ${newStatus}`);
      fetchUsers();
    } catch (err) {
      toast.error(err.message || 'Failed to change status');
    }
  };

  // Handle Reset Password Submit
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetPasswordModal.user) return;
    if (resetPasswordInput.length < 5) {
      toast.error('Password must be at least 5 characters long');
      return;
    }

    try {
      await usersApi.resetPassword(resetPasswordModal.user.id, { newPassword: resetPasswordInput });
      toast.success(`Password for ${resetPasswordModal.user.username} was reset`);
      setResetPasswordModal({ isOpen: false, user: null });
      setResetPasswordInput('');
    } catch (err) {
      toast.error(err.message || 'Failed to reset password');
    }
  };

  // Handle Delete User
  const handleDeleteUser = async () => {
    if (!deleteModal.user) return;
    try {
      await usersApi.delete(deleteModal.user.id);
      toast.success(`Staff account deleted`);
      setDeleteModal({ isOpen: false, user: null });
      fetchUsers();
    } catch (err) {
      toast.error(err.message || 'Failed to delete account');
    }
  };

  return (
    <div className="space-y-5 w-full max-w-5xl mx-auto px-1 sm:px-4 md:px-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 border-b border-gray-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Settings & Administration</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-1">
            Configure executive security credentials, profile identity, and role-based staff access.
          </p>
        </div>

        {/* Tab Controls — Smooth Touch-Scrollable */}
        <div className="overflow-x-auto scrollbar-none py-0.5 max-w-full">
          <div className="inline-flex items-center p-1 bg-gray-100 dark:bg-slate-800/80 rounded-2xl border border-gray-200 dark:border-slate-700 whitespace-nowrap min-w-full sm:min-w-0">
            <button
              type="button"
              onClick={() => setTab('profile')}
              className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'profile'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Profile & Security</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('users')}
              className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'users'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Staff Access</span>
              <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold">
                {stats.total || usersList.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* TAB 1: PROFILE & SECURITY VIEW                                    */}
      {/* ================================================================= */}
      {activeTab === 'profile' && (
        <form onSubmit={handleProfileSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Card: Account Overview & Identity */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-violet-600 text-white font-bold text-xl flex items-center justify-center shadow-lg flex-shrink-0">
                    {getInitials(profileForm.name, profileForm.username)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
                      {profileForm.name || profileForm.username}
                    </h3>
                    <p className="text-xs font-mono text-gray-500 dark:text-slate-400 truncate mt-0.5">
                      {profileForm.email || 'No email registered'}
                    </p>
                    <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                      <Shield className="w-3 h-3" />
                      {user?.role || 'ADMIN'}
                    </span>
                  </div>
                </div>

                <div className="border-t border-gray-100 dark:border-slate-700/60 my-5" />

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                      Display Full Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                        placeholder="e.g. Ayesh Chathuranga"
                        className="w-full pl-3 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/60 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                      Username <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={profileForm.username}
                      onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                      placeholder="Username"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/60 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                        placeholder="e.g. ayesh@gmail.com"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/60 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Card: Security Credentials & Password Update */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                      Password & Authentication Security
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      Leave password fields empty unless you want to change your current credentials.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Current Password */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                      Current Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={profileForm.currentPassword}
                        onChange={(e) => setProfileForm({ ...profileForm, currentPassword: e.target.value })}
                        placeholder="Required only when changing password"
                        className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/60 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"
                      >
                        {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={profileForm.newPassword}
                        onChange={(e) => setProfileForm({ ...profileForm, newPassword: e.target.value })}
                        placeholder="Minimum 5 characters"
                        className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/60 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>

                    {/* Password Strength Meter */}
                    {profileForm.newPassword && (
                      <div className="mt-2.5 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-gray-500 dark:text-slate-400">Strength:</span>
                          <span className="font-semibold text-gray-700 dark:text-slate-200">
                            {passwordStrength.label}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden flex gap-1">
                          {[1, 2, 3, 4].map((step) => (
                            <div
                              key={step}
                              className={`h-full flex-1 rounded-full transition-colors ${
                                step <= passwordStrength.score ? passwordStrength.color : 'bg-transparent'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={profileForm.confirmPassword}
                        onChange={(e) => setProfileForm({ ...profileForm, confirmPassword: e.target.value })}
                        placeholder="Re-enter new password"
                        className={`w-full pl-9 pr-10 py-2.5 rounded-xl border bg-gray-50 dark:bg-slate-900/60 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 transition-colors ${
                          !passwordsMatch
                            ? 'border-rose-400 focus:ring-rose-400/20'
                            : 'border-gray-200 dark:border-slate-700 focus:ring-indigo-500/20 focus:border-indigo-500'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>

                    {!passwordsMatch && (
                      <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Passwords do not match
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-gray-100 dark:border-slate-700 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingProfile ? 'Saving Changes...' : 'Save Profile Changes'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ================================================================= */}
      {/* TAB 2: USER / STAFF MANAGEMENT VIEW                               */}
      {/* ================================================================= */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Top Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Total Staff Accounts</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Administrators</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.admins}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <Shield className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Active Accounts</p>
                <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.active}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Action Bar (Search, Filter, Create) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="flex flex-1 items-center gap-2 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Search staff by name, username or email..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/60 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Role filter select */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-2.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/60 text-xs font-medium text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="ALL">All Roles</option>
                <option value="ADMIN">Admins</option>
                <option value="STAFF">Staff</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs font-semibold shadow-sm transition-all whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Add Staff Account</span>
            </button>
          </div>          {/* Staff Table / Mobile Card List */}
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm">
            {/* Mobile Card List (<640px) */}
            <div className="sm:hidden divide-y divide-gray-100 dark:divide-slate-700/60">
              {isLoadingUsers ? (
                <div className="p-8 text-center text-gray-400">
                  <div className="inline-block animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full mb-2"></div>
                  <p className="text-xs">Loading staff directory...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <Users className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-slate-600" />
                  <p className="text-xs font-medium">No staff members found matching criteria.</p>
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const isSelf = u.id === user?.id || u.username === user?.username;
                  const staffInitials = getInitials(u.name, u.username);
                  return (
                    <div key={u.id} className="p-3.5 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-semibold text-xs flex items-center justify-center flex-shrink-0 shadow-sm">
                            {staffInitials}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-xs text-gray-900 dark:text-white truncate">
                              {u.name || u.username}
                              {isSelf && (
                                <span className="ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
                                  You
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] font-mono text-gray-400 dark:text-slate-400 truncate">
                              @{u.username}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              u.role === 'ADMIN'
                                ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                : 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                            }`}
                          >
                            {u.role === 'ADMIN' ? <Shield className="w-2.5 h-2.5" /> : <User className="w-2.5 h-2.5" />}
                            {u.role}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-slate-400 pt-1 border-t border-gray-50 dark:border-slate-750">
                        <span className="truncate max-w-[180px] font-mono">{u.email || 'No email'}</span>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(u)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.status === 'ACTIVE'
                              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                              : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
                          {u.status}
                        </button>
                      </div>

                      <div className="flex items-center justify-end gap-1 pt-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(u)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors flex items-center gap-1"
                        >
                          <Edit2 size={13} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setResetPasswordModal({ isOpen: true, user: u });
                            setResetPasswordInput('');
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/50 transition-colors flex items-center gap-1"
                        >
                          <RotateCcw size={13} /> Reset
                        </button>
                        {!isSelf && (
                          <button
                            type="button"
                            onClick={() => setDeleteModal({ isOpen: true, user: u })}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors flex items-center gap-1"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table View (>=640px) */}
            <div className="hidden sm:block overflow-x-auto scrollbar-thin">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-700/80 bg-gray-50/50 dark:bg-slate-900/30 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="px-5 py-3.5">Staff Member</th>
                    <th className="px-5 py-3.5">Email</th>
                    <th className="px-5 py-3.5">Role</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Created Date</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60 text-xs text-gray-700 dark:text-slate-200">
                  {isLoadingUsers ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                        <div className="inline-block animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full mb-2"></div>
                        <p>Loading staff directory...</p>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                        <Users className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-slate-600" />
                        <p className="font-medium">No staff members found matching criteria.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isSelf = u.id === user?.id || u.username === user?.username;
                      const staffInitials = getInitials(u.name, u.username);

                      return (
                        <tr key={u.id} className="hover:bg-gray-50/60 dark:hover:bg-slate-750 transition-colors">
                          {/* Member info */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-semibold text-xs flex items-center justify-center flex-shrink-0 shadow-sm">
                                {staffInitials}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900 dark:text-white truncate">
                                  {u.name || u.username}
                                  {isSelf && (
                                    <span className="ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
                                      You
                                    </span>
                                  )}
                                </p>
                                <p className="text-[11px] font-mono text-gray-400 dark:text-slate-400 truncate">
                                  @{u.username}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Email */}
                          <td className="px-5 py-3.5 text-gray-600 dark:text-slate-300 font-mono text-[11px]">
                            {u.email || '—'}
                          </td>

                          {/* Role */}
                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                u.role === 'ADMIN'
                                ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                : 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                            }`}
                            >
                              {u.role === 'ADMIN' ? <Shield className="w-2.5 h-2.5" /> : <User className="w-2.5 h-2.5" />}
                              {u.role}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-5 py-3.5">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(u)}
                              title="Click to toggle status"
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all hover:opacity-80 ${
                                u.status === 'ACTIVE'
                                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  u.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'
                                }`}
                              />
                              {u.status}
                            </button>
                          </td>

                          {/* Created Date */}
                          <td className="px-5 py-3.5 text-gray-500 dark:text-slate-400 text-[11px]">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                          </td>

                          {/* Action Buttons */}
                          <td className="px-5 py-3.5 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {/* Edit details */}
                              <button
                                type="button"
                                onClick={() => openEditModal(u)}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700 transition-colors"
                                title="Edit staff profile"
                              >
                                <Edit2 size={14} />
                              </button>

                              {/* Reset password */}
                              <button
                                type="button"
                                onClick={() => {
                                  setResetPasswordModal({ isOpen: true, user: u });
                                  setResetPasswordInput('');
                                }}
                                className="p-1.5 rounded-lg text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/50 transition-colors"
                                title="Reset credentials"
                              >
                                <RotateCcw size={14} />
                              </button>

                              {/* Delete account */}
                              {!isSelf && (
                                <button
                                  type="button"
                                  onClick={() => setDeleteModal({ isOpen: true, user: u })}
                                  className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                                  title="Delete staff account"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 1: CREATE STAFF ACCOUNT                                     */}
      {/* ================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full sm:max-w-lg max-h-[92vh] sm:max-h-[85vh] bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl border-t sm:border border-gray-200 dark:border-slate-700 flex flex-col overflow-hidden pb-safe">
            <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-gray-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>Create New Staff Account</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 mt-4 overflow-y-auto flex-1 min-h-0 pr-0.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g. Sunil Perera"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/60 text-base sm:text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Username <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.username}
                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                    placeholder="sunil_staff"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/60 text-base sm:text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="Min 5 characters"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/60 text-base sm:text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="sunil@liyanagedistributors.com"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/60 text-base sm:text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Role Permission
                  </label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/60 text-base sm:text-xs text-gray-900 dark:text-white"
                  >
                    <option value="STAFF">STAFF (Standard Access)</option>
                    <option value="ADMIN">ADMIN (Full Authority)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Initial Status
                  </label>
                  <select
                    value={createForm.status}
                    onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/60 text-base sm:text-xs text-gray-900 dark:text-white"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div className="sticky bottom-0 bg-white dark:bg-slate-800 pt-3 pb-1 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 p-4 sm:p-6 border-t border-gray-100 dark:border-slate-700 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 z-10 pb-safe">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 text-center"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 2: EDIT STAFF DETAILS & ROLE                                */}
      {/* ================================================================= */}
      {editUserModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full sm:max-w-md max-h-[92vh] sm:max-h-[85vh] bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl border-t sm:border border-gray-200 dark:border-slate-700 flex flex-col overflow-hidden pb-safe">
            <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-gray-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Edit Staff: {editUserModal.user?.username}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditUserModal({ isOpen: false, user: null })}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditUser} className="space-y-4 mt-4 overflow-y-auto flex-1 min-h-0 pr-0.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/60 text-base sm:text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/60 text-base sm:text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Role
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/60 text-base sm:text-xs text-gray-900 dark:text-white"
                  >
                    <option value="STAFF">STAFF</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/60 text-base sm:text-xs text-gray-900 dark:text-white"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div className="sticky bottom-0 bg-white dark:bg-slate-800 pt-3 pb-1 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 p-4 sm:p-6 border-t border-gray-100 dark:border-slate-700 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 z-10 pb-safe">
                <button
                  type="button"
                  onClick={() => setEditUserModal({ isOpen: false, user: null })}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 text-center"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 3: RESET CREDENTIALS / PASSWORD                             */}
      {/* ================================================================= */}
      {resetPasswordModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full sm:max-w-md max-h-[92vh] sm:max-h-[85vh] bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl border-t sm:border border-gray-200 dark:border-slate-700 flex flex-col overflow-hidden pb-safe">
            <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-gray-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-500" />
                <span>Reset Password: {resetPasswordModal.user?.username}</span>
              </h3>
              <button
                type="button"
                onClick={() => setResetPasswordModal({ isOpen: false, user: null })}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4 mt-4 overflow-y-auto flex-1 min-h-0 pr-0.5">
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Enter a new temporary or permanent password for this account. Minimum 5 characters.
              </p>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={resetPasswordInput}
                  onChange={(e) => setResetPasswordInput(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/60 text-base sm:text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div className="sticky bottom-0 bg-white dark:bg-slate-800 pt-3 pb-1 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 p-4 sm:p-6 border-t border-gray-100 dark:border-slate-700 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 z-10 pb-safe">
                <button
                  type="button"
                  onClick={() => setResetPasswordModal({ isOpen: false, user: null })}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-md shadow-amber-600/20 text-center"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 4: DELETE CONFIRMATION                                      */}
      {/* ================================================================= */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full sm:max-w-sm bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border-t sm:border border-gray-200 dark:border-slate-700 pb-safe">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-500 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-gray-900 dark:text-white text-center">
              Delete Staff Account?
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 text-center mt-1.5 leading-relaxed">
              Are you sure you want to remove account for <strong className="text-gray-900 dark:text-white">@{deleteModal.user?.username}</strong>? This action cannot be undone.
            </p>

            <div className="mt-6 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setDeleteModal({ isOpen: false, user: null })}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-md shadow-rose-600/20 text-center"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
