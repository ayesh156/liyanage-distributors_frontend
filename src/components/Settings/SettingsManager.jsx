import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Truck,
  Upload,
  MapPin,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { usersApi } from '../../services/api';
import vanStockApi from '../../services/vanStockApi';
import useVanStockStore from '../../hooks/useVanStockStore';
import { compressImageToDataUrl, resolveServerImageUrl } from '../../utils/imageCompression';
import SearchableSelect from '../ui/SearchableSelect';

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
  const tabParam = searchParams.get('tab');
  const activeTab = tabParam === 'users' ? 'users' : tabParam === 'vehicle' ? 'vehicle' : 'profile';

  const setTab = (tab) => {
    setSearchParams({ tab });
  };

  // -------------------------------------------------------------
  // TAB 3: VEHICLE PROFILE STATE & HANDLERS
  // -------------------------------------------------------------
  const vehicle = useVanStockStore((s) => s.vehicle);
  const updateVehicleProfile = useVanStockStore((s) => s.updateVehicleProfile);

  const [vehicleForm, setVehicleForm] = useState({
    id: vehicle?.id || 'VAN-01',
    plateNumber: vehicle?.plateNumber || vehicle?.vehicleNumber || 'WP KDK-4521',
    driver: vehicle?.driver || vehicle?.driverName || 'Sunil Shantha',
    warehouseLocation: vehicle?.warehouseLocation || 'Deiyandara Central Warehouse',
    vehicleImage: vehicle?.vehicleImage || null,
  });

  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const [isSavingVehicle, setIsSavingVehicle] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Synchronize local form when vehicle profile updates in Zustand store
  useEffect(() => {
    if (vehicle) {
      setVehicleForm({
        id: vehicle.id || 'VAN-01',
        plateNumber: vehicle.plateNumber || vehicle.vehicleNumber || 'WP KDK-4521',
        driver: vehicle.driver || vehicle.driverName || 'Sunil Shantha',
        warehouseLocation: vehicle.warehouseLocation || 'Deiyandara Central Warehouse',
        vehicleImage: vehicle.vehicleImage || null,
      });
    }
  }, [vehicle]);

  // Cross-browser backend vehicle profile hydration on mount (ensures cross-browser viewing without relying on localStorage)
  useEffect(() => {
    vanStockApi.getVehicleProfile('VAN-01')
      .then((res) => {
        if (res?.data) {
          updateVehicleProfile(res.data);
          setVehicleForm((prev) => ({
            ...prev,
            ...res.data,
          }));
        }
      })
      .catch((_err) => {});
  }, [updateVehicleProfile]);

  /**
   * Processes and downscales selected image file via Canvas compression,
   * then immediately persists it into vehicleForm and Zustand store.
   *
   * @param {File} file - Raw image file from file input or drag-and-drop
   */
  const processSelectedFile = async (file) => {
    if (!file) return;

    if (!file.type || !file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file (PNG, JPG, WebP).');
      return;
    }

    try {
      setIsCompressingImage(true);
      const compressedBase64 = await compressImageToDataUrl(file, 600, 600, 0.75);
      setVehicleForm((prev) => ({ ...prev, vehicleImage: compressedBase64 }));
      updateVehicleProfile({ vehicleImage: compressedBase64 });
      toast.success('Vehicle photo attached & persisted (<100KB).');
    } catch (err) {
      console.error('Image compression failed:', err);
      toast.error('Failed to process image. Please try another photo.');
    } finally {
      setIsCompressingImage(false);
    }
  };

  /**
   * Handles file input change event.
   */
  const handleVehicleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      await processSelectedFile(file);
    }
  };

  /**
   * Clears attached vehicle photo from state, store, and file input ref.
   */
  const handleRemoveVehicleImage = () => {
    setVehicleForm((prev) => ({ ...prev, vehicleImage: null }));
    updateVehicleProfile({ vehicleImage: null });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.info('Vehicle photo removed.');
  };

  /**
   * Saves updated vehicle profile attributes to backend filesystem storage,
   * Zustand store, and local storage. Converts Base64 images to physical files on the server.
   */
  const handleVehicleSubmit = async (e) => {
    e.preventDefault();
    if (!vehicleForm.plateNumber.trim()) {
      toast.error('Vehicle Plate Number is required.');
      return;
    }

    setIsSavingVehicle(true);
    try {
      const payload = {
        id: vehicleForm.id.trim(),
        plateNumber: vehicleForm.plateNumber.trim(),
        driver: vehicleForm.driver.trim(),
        route: 'All Routes',
        warehouseLocation: vehicleForm.warehouseLocation,
        vehicleImage: vehicleForm.vehicleImage,
      };

      // Optimistic local state update
      let saved = updateVehicleProfile(payload);

      // Persist to backend: converts Base64 image to physical binary file in public/images/van/
      try {
        const backendRes = await vanStockApi.saveVehicleProfile(payload);
        if (backendRes?.success && backendRes?.data) {
          saved = updateVehicleProfile(backendRes.data);
        }
      } catch (backendErr) {
        console.warn('Backend vehicle image persist failed, fallback to local state:', backendErr);
      }

      if (saved) {
        setVehicleForm((prev) => ({
          ...prev,
          ...saved,
        }));
      }
      toast.success('Vehicle profile saved successfully!');
    } catch (err) {
      console.error('Failed to update vehicle profile:', err);
      toast.error('Failed to save vehicle profile.');
    } finally {
      setIsSavingVehicle(false);
    }
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

  // Curated tab options for mobile dropdown selector, memoized and safely positioned after stats calculation
  const settingsTabOptions = useMemo(
    () => [
      { value: 'profile', label: 'Profile & Security', icon: User },
      { value: 'users', label: `Staff Access (${stats.total || usersList.length})`, icon: Users },
      { value: 'vehicle', label: 'Vehicle Profile', icon: Truck },
    ],
    [stats.total, usersList.length]
  );

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
      {/* Page Header (Full Width) */}
      <div className="w-full border-b border-gray-200 dark:border-slate-800 pb-4">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
          <Shield className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <span>Settings & Administration</span>
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-1">
          Configure executive security credentials, profile identity, role-based staff access, and fleet delivery vehicles.
        </p>
      </div>

      {/* Tab Navigation Controls (Full Width Below Title) */}
      <div className="w-full">
        {/* Mobile View (<640px): Full-Width SearchableSelect Dropdown */}
        <div className="flex sm:hidden w-full">
          <SearchableSelect
            value={activeTab}
            onChange={(val) => setTab(val || 'profile')}
            options={settingsTabOptions}
            clearable={false}
            className="w-full"
            placeholder="Switch Settings Tab..."
          />
        </div>

        {/* Desktop & Tablet View (>=640px): Full-Width Horizontal Tab Bar */}
        <div className="hidden sm:flex w-full items-center p-1.5 bg-gray-100 dark:bg-slate-800/80 rounded-2xl border border-gray-200 dark:border-slate-700 gap-1.5">
          <button
            type="button"
            onClick={() => setTab('profile')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
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
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Staff Access</span>
            <span className="ml-1.5 px-2 py-0.5 text-[10px] rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold">
              {stats.total || usersList.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTab('vehicle')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'vehicle'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Vehicle Profile</span>
          </button>
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
                            {u.email || 'â€”'}
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
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'â€”'}
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
      {/* TAB 3: VEHICLE PROFILE VIEW                                       */}
      {/* ================================================================= */}
      {activeTab === 'vehicle' && (
        <form onSubmit={handleVehicleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Card: Vehicle Preview & Identity */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      Fleet Delivery Vehicle
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                      Active mobile dispatch unit
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Active
                  </span>
                </div>

                {/* Vehicle Photo Dropzone & Live Preview */}
                <div
                  onClick={() => {
                    if (!vehicleForm.vehicleImage && !isCompressingImage) {
                      fileInputRef.current?.click();
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const droppedFile = e.dataTransfer.files?.[0];
                    if (droppedFile) {
                      await processSelectedFile(droppedFile);
                    }
                  }}
                  className={`mt-5 relative w-full h-52 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center overflow-hidden group ${
                    vehicleForm.vehicleImage
                      ? 'border-gray-200 dark:border-slate-700 bg-slate-900/50'
                      : isDragging
                      ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 cursor-pointer scale-[1.01]'
                      : 'border-gray-300 hover:border-indigo-400 dark:border-slate-700 dark:hover:border-indigo-500 bg-slate-50 hover:bg-slate-100/80 dark:bg-slate-900/80 dark:hover:bg-slate-900 cursor-pointer'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    disabled={isCompressingImage}
                    onChange={handleVehicleImageChange}
                    className="hidden"
                  />

                  {vehicleForm.vehicleImage ? (
                    <div className="relative w-full h-full">
                      <img
                        src={resolveServerImageUrl(vehicleForm.vehicleImage)}
                        alt={vehicleForm.plateNumber}
                        className="w-full h-full object-cover"
                      />
                      {/* Inline Delete Button (Top-Right) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveVehicleImage();
                        }}
                        className="absolute top-2.5 right-2.5 p-1.5 rounded-xl bg-black/70 hover:bg-rose-600 text-white shadow-lg backdrop-blur-md transition-all cursor-pointer z-10"
                        title="Remove vehicle photo"
                      >
                        <X size={16} />
                      </button>
                      {/* Hover Re-upload Overlay */}
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white text-xs font-semibold gap-1.5 backdrop-blur-[1px]"
                      >
                        <Upload size={16} />
                        <span>Click to Change Photo</span>
                      </div>
                    </div>
                  ) : isCompressingImage ? (
                    <div className="text-center p-4 space-y-2">
                      <div className="inline-block animate-spin w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full" />
                      <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        Compressing image via Canvas...
                      </p>
                    </div>
                  ) : (
                    <div className="text-center p-4 space-y-2 select-none">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 flex items-center justify-center mx-auto border border-indigo-200 dark:border-indigo-800/60 shadow-sm group-hover:scale-105 transition-transform">
                        <Upload size={24} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-800 dark:text-slate-200">
                          Click or drag & drop truck photo
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                          PNG, JPG, WebP auto-compressed under 100KB
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-100 dark:border-slate-700/60 my-5" />

                {/* Specs List */}
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-gray-500 dark:text-slate-400">Plate Number</span>
                    <span className="font-mono font-bold text-gray-900 dark:text-white bg-slate-100 dark:bg-slate-700/70 px-2 py-0.5 rounded">
                      {vehicleForm.plateNumber || 'Not Set'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-gray-500 dark:text-slate-400">Fleet ID</span>
                    <span className="font-mono font-semibold text-gray-900 dark:text-white">
                      {vehicleForm.id}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-gray-500 dark:text-slate-400">Assigned Driver</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {vehicleForm.driver || 'Unassigned'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-gray-500 dark:text-slate-400">Operating Territory</span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      All Routes
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-gray-500 dark:text-slate-400">Central Hub</span>
                    <span className="text-gray-700 dark:text-slate-300 truncate max-w-[200px]">
                      {vehicleForm.warehouseLocation || 'Central Warehouse'}
                    </span>
                  </div>
                </div>

                {/* Canvas Compression Informational Pill */}
                <div className="mt-5 p-3 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-[11px] text-indigo-900 dark:text-indigo-200 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Smart Canvas Compression:</strong> Uploaded vehicle photos are automatically downscaled to 600px and converted to JPEG (75% quality), keeping payloads under 100KB for instant mobile syncing.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Card: Vehicle Details Form & Photo Uploader */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm space-y-6">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Truck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <span>Fleet Vehicle & Driver Profile</span>
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                    Configure registration plate, fleet identifier, designated driver, and primary warehouse hub. Operating territory defaults universally to All Routes.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Plate Number */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                      Plate Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={vehicleForm.plateNumber}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, plateNumber: e.target.value })}
                      placeholder="e.g. WP KDK-4521"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/60 text-xs text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  {/* Vehicle Fleet Code */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                      Vehicle Fleet Code
                    </label>
                    <input
                      type="text"
                      value={vehicleForm.id}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, id: e.target.value })}
                      placeholder="e.g. VAN-01"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/60 text-xs text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Designated Driver */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                      Designated Driver Name
                    </label>
                    <input
                      type="text"
                      value={vehicleForm.driver}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, driver: e.target.value })}
                      placeholder="e.g. Sunil Shantha"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/60 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  {/* Central Warehouse Location */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                      Central Warehouse Hub
                    </label>
                    <input
                      type="text"
                      value={vehicleForm.warehouseLocation}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, warehouseLocation: e.target.value })}
                      placeholder="e.g. Deiyandara Central Warehouse"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/60 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                {/* Submit Action */}
                <div className="border-t border-gray-100 dark:border-slate-700/60 pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSavingVehicle || isCompressingImage}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingVehicle ? 'Saving Profile...' : 'Save Vehicle Profile'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
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
