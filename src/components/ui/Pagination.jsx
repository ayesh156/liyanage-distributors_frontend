import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * Reusable Pagination Component
 *
 * Renders a page navigation bar with First/Previous/Next/Last buttons,
 * page numbers, a rows-per-page selector, and page info text.
 * Automatically hides itself when totalPages <= 1.
 *
 * Props:
 *   currentPage       : number (1-based index of the active page)
 *   totalPages        : number (total number of pages)
 *   rowsPerPage       : number (current rows-per-page setting)
 *   onPageChange      : (page: number) => void  — called when user clicks a page
 *   onRowsPerPageChange : (rowsPerPage: number) => void  — called when user changes rows-per-page
 */
export default function Pagination({
  currentPage,
  totalPages,
  rowsPerPage = 15,
  onPageChange,
  onRowsPerPageChange,
}) {
  // ── Conditional visibility: hide if 1 or 0 pages ──────────────
  if (totalPages <= 1) return null;

  // Build page number range — show up to 5 visible buttons
  const getVisiblePages = () => {
    const delta = 2; // siblings before/after current
    const range = [];
    const start = Math.max(2, currentPage - delta);
    const end = Math.min(totalPages - 1, currentPage + delta);

    range.push(1); // first page always visible

    if (start > 2) range.push('…'); // ellipsis before

    for (let i = start; i <= end; i++) {
      range.push(i);
    }

    if (end < totalPages - 1) range.push('…'); // ellipsis after

    if (totalPages > 1) range.push(totalPages); // last page always visible

    return range;
  };

  const pages = getVisiblePages();

  const handleRowsPerPageChange = (e) => {
    if (onRowsPerPageChange) {
      onRowsPerPageChange(Number(e.target.value));
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-3 px-4 border-t border-gray-200 dark:border-slate-700">
      {/* Rows-per-page selector */}
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
        <span className="font-medium whitespace-nowrap">Rows per page:</span>
        <select
          value={rowsPerPage}
          onChange={handleRowsPerPageChange}
          className="input-field text-xs py-1 px-2 rounded-lg border border-gray-200 dark:border-slate-600
            bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300
            focus:ring-1 focus:ring-accent-500 focus:border-accent-500 cursor-pointer appearance-none pr-6"
        >
          <option value={10}>10</option>
          <option value={15}>15</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
        </select>
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center gap-1">
        {/* First Button */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg
            text-gray-600 hover:text-gray-900 hover:bg-gray-100
            dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700
            disabled:opacity-40 disabled:pointer-events-none transition-colors"
          title="First Page"
        >
          <ChevronsLeft size={14} />
          <span className="hidden sm:inline">First</span>
        </button>

        {/* Previous Button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg
            text-gray-600 hover:text-gray-900 hover:bg-gray-100
            dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700
            disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft size={14} />
          <span className="hidden sm:inline">Previous</span>
        </button>

        {/* Page Numbers */}
        {pages.map((p, idx) =>
          typeof p === 'string' ? (
            <span
              key={`ellipsis-${idx}`}
              className="px-1.5 text-xs text-gray-400 dark:text-slate-500 select-none"
            >
              {p}
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`min-w-[30px] h-[30px] flex items-center justify-center rounded-lg text-xs font-medium
                transition-all duration-150 ${
                  p === currentPage
                    ? 'bg-accent-500 text-white shadow-sm shadow-accent-200 dark:shadow-accent-800'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700'
                }`}
            >
              {p}
            </button>
          )
        )}

        {/* Next Button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg
            text-gray-600 hover:text-gray-900 hover:bg-gray-100
            dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700
            disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight size={14} />
        </button>

        {/* Last Button */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg
            text-gray-600 hover:text-gray-900 hover:bg-gray-100
            dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700
            disabled:opacity-40 disabled:pointer-events-none transition-colors"
          title="Last Page"
        >
          <span className="hidden sm:inline">Last</span>
          <ChevronsRight size={14} />
        </button>

        {/* Page info */}
        <span className="ml-2 text-[10px] text-gray-400 dark:text-slate-500 font-medium whitespace-nowrap">
          Page {currentPage} of {totalPages}
        </span>
      </div>
    </div>
  );
}