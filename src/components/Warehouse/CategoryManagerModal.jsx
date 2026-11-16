/**
 * @file CategoryManagerModal.jsx
 * @description Dynamic Category CRUD Modal.
 * Enables warehouse managers to view, add, edit, and soft-delete hardware product categories.
 * Updates reflect immediately across all comboboxes, filters, and product dialogs.
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Layers, Plus, Edit2, Trash2, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import useVanStockStore from '../../hooks/useVanStockStore';
import useAppStore from '../../hooks/useAppStore';

export default function CategoryManagerModal({ isOpen, onClose }) {
  const categories = useVanStockStore((s) => s.categories);
  const products = useVanStockStore((s) => s.products);
  const fetchCategories = useVanStockStore((s) => s.fetchCategories);
  const createCategory = useVanStockStore((s) => s.createCategory);
  const updateCategory = useVanStockStore((s) => s.updateCategory);
  const deleteCategory = useVanStockStore((s) => s.deleteCategory);
  const appFetchCategories = useAppStore((s) => s.fetchCategories);

  const [newCatName, setNewCatName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      if (typeof appFetchCategories === 'function') {
        appFetchCategories();
      }
      setNewCatName('');
      setEditingId(null);
      setError('');
    }
  }, [isOpen, fetchCategories, appFetchCategories]);

  if (!isOpen) return null;

  const handleAddCategory = async (e) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) {
      setError('Please enter a category name.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await createCategory(trimmed);
      if (typeof appFetchCategories === 'function') {
        await appFetchCategories();
      }
      setNewCatName('');
      toast.success(`Category "${trimmed}" created successfully.`);
    } catch (err) {
      setError(err.message || 'Failed to create category.');
      toast.error(err.message || 'Failed to create category.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (cat) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
    setError('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleSaveEdit = async (catId) => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      setError('Category name cannot be empty.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await updateCategory(catId, trimmed);
      if (typeof appFetchCategories === 'function') {
        await appFetchCategories();
      }
      setEditingId(null);
      toast.success('Category updated successfully.');
    } catch (err) {
      setError(err.message || 'Failed to update category.');
      toast.error(err.message || 'Failed to update category.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (cat) => {
    if (!window.confirm(`Are you sure you want to delete category "${cat.name}"?`)) return;
    setLoading(true);
    setError('');
    try {
      await deleteCategory(cat.id);
      if (typeof appFetchCategories === 'function') {
        await appFetchCategories();
      }
      toast.success(`Category "${cat.name}" deleted.`);
    } catch (err) {
      setError(err.message || 'Failed to delete category.');
      toast.error(err.message || 'Failed to delete category.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full sm:max-w-xl bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] pb-safe animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent-50 dark:bg-accent-950/60 text-accent-600 dark:text-accent-400 border border-accent-200/50 dark:border-accent-800/50">
              <Layers size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Manage Categories
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Master hardware category options across warehouse and dispatch
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form to Add New Category */}
        <form onSubmit={handleAddCategory} className="p-4 sm:p-5 border-b border-gray-100 dark:border-slate-700/80">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Enter new category name (e.g. Solar & Inverters)..."
              disabled={loading}
              className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-500 transition-all"
            />
            <button
              type="submit"
              disabled={loading || !newCatName.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-accent-600 hover:bg-accent-700 disabled:opacity-50 text-white shadow-sm transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus size={16} />
              <span>Add</span>
            </button>
          </div>
          {error && (
            <div className="mt-2.5 flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}
        </form>

        {/* Category List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold px-2">
            <span>Category Name</span>
            <span>Products Count / Actions</span>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-slate-700/60 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden bg-slate-50/40 dark:bg-slate-900/40">
            {categories.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No custom categories found. Add your first category above.
              </div>
            ) : (
              categories.map((cat) => {
                const count = products.filter((p) => p.category === cat.name).length;
                const isEditing = editingId === cat.id;

                return (
                  <div
                    key={cat.id}
                    className="p-3 sm:px-4 flex items-center justify-between gap-3 bg-white dark:bg-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    {isEditing ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-accent-400 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-accent-500"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(cat.id)}
                          disabled={loading}
                          className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                          title="Save changes"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 transition-colors"
                          title="Cancel"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2 h-2 rounded-full bg-accent-500" />
                          <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {cat.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                            {count} SKU{count === 1 ? '' : 's'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(cat)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-accent-600 hover:bg-accent-50 dark:hover:bg-accent-950/40 transition-colors"
                            title="Edit Category Name"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(cat)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Delete Category"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-gray-100 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
