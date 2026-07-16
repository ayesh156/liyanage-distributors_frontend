import { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  Printer, Store, CalendarDays, FileText,
  ChevronDown, TrendingUp,
  MapPin, Phone, User, DollarSign, FileSpreadsheet, Filter, Search, SlidersHorizontal, X
} from 'lucide-react';
import PrintFullReport from './PrintFullReport';
import Pagination from '../ui/Pagination';
import FancyDatePicker from '../ui/FancyDatePicker';
import { outstandingApi, withPagination } from '../../services/api';
import { extractData, mapOutstandingRowFromApi } from '../../services/dataMappers';
import useAppStore from '../../hooks/useAppStore';
import { formatDateYMD } from '../../utils/date';

const toMoneyNumber = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return parseFloat(numeric.toFixed(2));
};

const computeBalanceDue = (amount, received) => {
  const computedBalanceDue = parseFloat((Number(amount) - Number(received)).toFixed(2));
  return Math.max(0, Number.isFinite(computedBalanceDue) ? computedBalanceDue : 0);
};

const formatCurrency = (val) => {
  const normalized = toMoneyNumber(val);
  const sign = normalized < 0 ? '-' : '';
  return `${sign}Rs. ${Math.abs(normalized).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateStr) => formatDateYMD(dateStr);

const normalizeInvoiceNo = (value) => {
  const invoiceNo = String(value ?? '').trim();
  if (/^Manual_bill(_\d+)?$/i.test(invoiceNo)) {
    return 'Manual_bill';
  }
  return invoiceNo || '—';
};

const toIsoDate = (value) => {
  if (!value) return '';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toISOString().split('T')[0];
};

const csvEscape = (value) => {
  const normalized = String(value ?? '').replace(/\r?\n|\r/g, ' ').replace(/"/g, '""');
  return `"${normalized}"`;
};

const csvDateCell = (value) => {
  const iso = toIsoDate(value);
  if (!iso) return csvEscape('');
  return csvEscape(`\t${iso}`);
};

const computeElapsedDays = (dateStr) => {
  if (!dateStr) return 0;
  const postingDate = new Date(dateStr);
  if (Number.isNaN(postingDate.getTime())) return 0;
  const elapsedDays = Math.max(0, Math.floor((new Date() - postingDate) / (1000 * 60 * 60 * 24)));
  return elapsedDays;
};

const getAgeBucket = (days) => {
  if (days <= 15) return { label: '0-15 days', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', barColor: 'bg-emerald-500' };
  if (days <= 30) return { label: '16-30 days', color: 'bg-yellow-50 text-yellow-700 border-yellow-200', barColor: 'bg-yellow-500' };
  if (days <= 60) return { label: '31-60 days', color: 'bg-orange-50 text-orange-700 border-orange-200', barColor: 'bg-orange-500' };
  return { label: '60+ days', color: 'bg-red-50 text-red-700 border-red-200', barColor: 'bg-red-500' };
};

const getSalesPersonName = (shop) => {
  if (!shop) return '';
  if (typeof shop.salesPerson === 'string') return shop.salesPerson;
  return shop.salesPerson?.name || shop.salesPersonName || '';
};

const getScreenRowTypographyClassName = (ageDays) => {
  const normalizedAge = Number(ageDays) || 0;
  if (normalizedAge >= 60) {
    return 'text-red-600 font-bold dark:text-red-500';
  }
  if (normalizedAge >= 45) {
    return 'text-black font-normal dark:text-slate-300 dark:font-normal';
  }
  return 'text-black font-normal dark:text-slate-300 dark:font-normal';
};

export default function OutstandingReport({ shops, allShops, generateOutstandingReport }) {
  const setReportFinalMarketOutstanding = useAppStore((state) => state.setReportFinalMarketOutstanding);
  const [showFilters, setShowFilters] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [olderThan60Days, setOlderThan60Days] = useState(false);
  const [omniSearch, setOmniSearch] = useState('');
  const [showOmniSuggestions, setShowOmniSuggestions] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState(null);
  const [reportRows, setReportRows] = useState([]);
  const [loadingReport, setLoadingReport] = useState(false);
  const [sortField, setSortField] = useState('date');
  const [sortDir, setSortDir] = useState('asc');
  const [expandedBuckets, setExpandedBuckets] = useState({});
  const readDateValue = (input) => input?.target?.value ?? input ?? '';
  
  // ── Per-group pagination state keyed by shopId ──
  const [currentPages, setCurrentPages] = useState({});
  const [rowsPerPage, setRowsPerPage] = useState(15);

  // Reset all per-group pages when shop selection or rows-per-page changes
  useEffect(() => { setCurrentPages({}); }, [startDate, endDate, selectedYear, selectedMonth, olderThan60Days, rowsPerPage]);

  // Helper: get/set current page for a specific shop group
  const getGroupPage = (shopId) => currentPages[shopId] || 1;
  const setGroupPage = (shopId, page) =>
    setCurrentPages(prev => ({ ...prev, [shopId]: page }));

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, idx) => String(currentYear - idx));
  }, []);

  const monthOptions = useMemo(() => ([
    { value: '1', label: 'Jan' },
    { value: '2', label: 'Feb' },
    { value: '3', label: 'Mar' },
    { value: '4', label: 'Apr' },
    { value: '5', label: 'May' },
    { value: '6', label: 'Jun' },
    { value: '7', label: 'Jul' },
    { value: '8', label: 'Aug' },
    { value: '9', label: 'Sep' },
    { value: '10', label: 'Oct' },
    { value: '11', label: 'Nov' },
    { value: '12', label: 'Dec' },
  ]), []);

  useEffect(() => {
    let isMounted = true;

    const loadOutstanding = async () => {
      setLoadingReport(true);
      try {
        const params = withPagination({
          ...(startDate ? { startDate } : {}),
          ...(endDate ? { endDate } : {}),
          ...(selectedYear ? { year: selectedYear } : {}),
          ...(selectedMonth ? { month: selectedMonth } : {}),
        }, 1, 5000);
        const res = await outstandingApi.getReport(params);
        const mappedRows = extractData(res).map(mapOutstandingRowFromApi);
        if (isMounted) {
          setReportRows(mappedRows);
        }
      } catch (error) {
        if (isMounted) {
          setReportRows([]);
        }
      } finally {
        if (isMounted) {
          setLoadingReport(false);
        }
      }
    };

    loadOutstanding();
    return () => {
      isMounted = false;
    };
  }, [startDate, endDate, selectedYear, selectedMonth]);

  const availableStoreProfiles = useMemo(() => {
    const sourceStores = Array.isArray(shops) && shops.length > 0 ? shops : allShops;
    const uniqueStoreMap = new Map();
    sourceStores.forEach((store) => {
      if (!store?.id) return;
      uniqueStoreMap.set(String(store.id), store);
    });
    return Array.from(uniqueStoreMap.values());
  }, [shops, allShops]);

  const omniSuggestions = useMemo(() => {
    const searchNeedle = omniSearch.trim().toLowerCase();
    const list = availableStoreProfiles
      .filter((store) => {
        const storeName = String(store?.name || '').toLowerCase();
        const routeName = String(store?.route || '').toLowerCase();
        if (!searchNeedle) return true;
        return storeName.includes(searchNeedle) || routeName.includes(searchNeedle);
      })
      .slice(0, 12);
    return list;
  }, [availableStoreProfiles, omniSearch]);

  // ═══════════════════════════════════════════════════════════════════
  // CASE-INSENSITIVE KEY NORMALIZER
  // Transforms any invoice/bill token into a uniform lowercase key
  // before it is joined with shopId into a composite dictionary key.
  // Handles every casing variant (Manual Bill / Manual-bill /
  // Manual_bill / manual_bill) by lowercasing the full token then
  // collapsing all runs of spaces, dashes, and underscores into a
  // single underscore. This guarantees that payments bond to their
  // parent invoice regardless of capitalisation or separator style
  // in the source data.
  // ═══════════════════════════════════════════════════════════════════
  const normalizeKeyToken = (value) =>
    String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/[\s\-_]+/g, '_');

  // ═══════════════════════════════════════════════════════════════════
  // GLOBAL STATE-LEVEL PAYMENT DICTIONARY
  // Builds a cross-reference map keyed by "shopId_normalizedDocNo"
  // from ALL payment rows in the raw API data. The normalizeKeyToken
  // step ensures casing and separator variants collapse to the same
  // bucket, forcing payments onto the DOM immediately.
  // ═══════════════════════════════════════════════════════════════════
  const paymentMap = useMemo(() => {
    const map = {};
    const isPaymentRowType = (docType) => docType === 'Payment' || docType === 'Payment (Cash)';
    reportRows.forEach((row) => {
      if (isPaymentRowType(row.docType)) {
        const storeId = String(row.shopId || '').trim();
        // Extract invoice reference: try docNo first (most reliable),
        // fall back to invoiceId text value if docNo is empty.
        // Normalise the token so casing variants map to the same bucket.
        const rawInvoiceNo = String(row.docNo || row.invoiceId || '').trim();
        const invoiceNo = normalizeKeyToken(rawInvoiceNo);
        const key = storeId + '_' + invoiceNo;
        if (!storeId || !invoiceNo || key === '_') return;
        const paymentAmount = toMoneyNumber(row.received || row.amount || 0);
        map[key] = toMoneyNumber((map[key] || 0) + paymentAmount);
      }
    });
    return map;
  }, [reportRows]);

  // ═══════════════════════════════════════════════════════════════════
  // CONSOLIDATED REPORT ROWS
  // Preserves the API's pre-calculated `received` value as the primary
  // source of truth. Any additional payments found in the paymentMap
  // (standalone Payment rows) are additive on top. This prevents the
  // frontend from zeroing out backend-accurate data when the endpoint
  // returns no standalone Payment rows (paymentMap is empty).
  // ═══════════════════════════════════════════════════════════════════
  const consolidatedReportRows = useMemo(() => {
    if (reportRows.length === 0) return [];

    return reportRows.map((row) => {
      if (row.docType === 'Invoice') {
        const storeId = String(row.shopId || '').trim();
        // Normalise the invoice token with the same routine used when
        // the paymentMap was built — guarantees key parity.
        const invDocNo = normalizeKeyToken(String(row.docNo || '').trim());
        const lookupKey = storeId + '_' + invDocNo;

        // GOLDEN FIX: Preserve the API's pre-calculated received amount.
        // The backend already sends the correct received value — honour it.
        // Any additional payments captured in paymentMap are purely additive.
        const apiReceived = toMoneyNumber(row.received || 0);
        const mappedPaid = toMoneyNumber(paymentMap[lookupKey] || 0);
        const totalPaid = toMoneyNumber(apiReceived + mappedPaid);

        const invoiceAmount = toMoneyNumber(row.amount);
        const updatedBalanceDue = computeBalanceDue(invoiceAmount, totalPaid);

        return {
          ...row,
          received: totalPaid,
          balanceDue: updatedBalanceDue,
        };
      }
      // Payment rows survive the pipeline untouched
      return row;
    });
  }, [reportRows, paymentMap]);

  // Apply the 60-day age filter on top of already-consolidated data
  const ageAwareReportRows = useMemo(() => {
    if (!olderThan60Days) return consolidatedReportRows;

    return consolidatedReportRows
      .filter((row) => computeElapsedDays(row?.date) >= 60)
      .filter((row) => toMoneyNumber(row.balanceDue) > 0);
  }, [consolidatedReportRows, olderThan60Days]);

  const filteredReportRows = useMemo(() => {
    if (!selectedStoreId) return ageAwareReportRows;
    return ageAwareReportRows.filter((row) => String(row.shopId) === String(selectedStoreId));
  }, [ageAwareReportRows, selectedStoreId]);

  // ═══════════════════════════════════════════════════════════════════
  // CONSOLIDATED DATA GROUPED BY SHOP
  // Aggregates the filtered invoice rows into per-store buckets using
  // safe toMoneyNumber addition guards. Each group's totalOutstanding
  // strictly sums the pre-calculated inv.balanceDue properties from the
  // consolidated dataset (Invoice Amount minus cumulative payment
  // dictionary values). No raw row data leaks into the summary.
  // ═══════════════════════════════════════════════════════════════════
  const allStoresData = useMemo(() => {
    const groups = {};
    filteredReportRows.forEach((row) => {
      if (toMoneyNumber(row.balanceDue) <= 0) return;
      if (!groups[row.shopId]) {
        const shop = allShops.find((s) => String(s.id) === String(row.shopId));
        groups[row.shopId] = {
          id: row.shopId,
          shopId: row.shopId,
          shopName: row.shopName,
          shop,
          invoices: [],
          totalOutstanding: 0,
          totalInvoiced: 0,
          totalReceived: 0,
          invoiceCount: 0,
        };
      }

      const group = groups[row.shopId];
      if (row.docType === 'Invoice' || row.docType === 'Payment' || row.docType === 'Payment (Cash)') {
        group.invoices.push({
          ...row,
          ageDays: computeElapsedDays(row.date),
          ageBucket: getAgeBucket(computeElapsedDays(row.date)),
        });
        // Only accumulate invoiced amount and received from Invoice rows
        if (row.docType === 'Invoice') {
          group.totalInvoiced += toMoneyNumber(row.amount);
          // Force safe cumulative addition: wraps both operands AND the
          // result through toMoneyNumber to prevent floating-point leakage
          // into downstream summary banner aggregations.
          group.totalReceived = toMoneyNumber(group.totalReceived + toMoneyNumber(row.received || 0));
          group.invoiceCount++;
        }
      }
    });

    // totalOutstanding strictly sums the pre-calculated balanceDue from
    // Invoice rows only — payment rows are excluded from the net balance sum.
    Object.values(groups).forEach((group) => {
      group.totalOutstanding = group.invoices.reduce((sum, inv) => {
        if (inv.docType !== 'Invoice') return sum;
        const netValue = toMoneyNumber(inv.balanceDue);
        return toMoneyNumber(sum + netValue);
      }, 0);
    });

    return Object.values(groups)
      .filter((g) => (g.totalOutstanding || 0) > 0)
      .sort((a, b) => {
        const routeCmp = (a.shop?.route || '').localeCompare(b.shop?.route || '');
        if (routeCmp !== 0) return routeCmp;
        return a.shopName.localeCompare(b.shopName);
      });
  }, [filteredReportRows, allShops]);

  const filteredData = useMemo(() => {
    return selectedStoreId
      ? allStoresData.filter((item) => String(item.id) === String(selectedStoreId))
      : allStoresData;
  }, [allStoresData, selectedStoreId]);

  const { shopGroups, totalMarketOutstanding, summary } = useMemo(() => {
    const totalInvoiceCount = filteredData.reduce((sum, g) => sum + g.invoiceCount, 0);
    const totalInvoiceAmount = filteredData.reduce((sum, g) => sum + g.totalInvoiced, 0);
    const totalReceivedAmount = filteredData.reduce((sum, g) => toMoneyNumber(sum + toMoneyNumber(g.totalReceived || 0)), 0);
    // Grand total is the strict sum of shop-level net balances (already
    // clamped and reduced by the paymentMap), ensuring absolute net parity
    // with per-store outstanding figures shown in the UI.
    const totalOutstanding = filteredData.reduce((sum, g) => toMoneyNumber(sum + toMoneyNumber(g.totalOutstanding || 0)), 0);
    const avgOutstanding = filteredData.length > 0 ? totalOutstanding / filteredData.length : 0;
    const highestOutstanding = filteredData.length > 0
      ? Math.max(...filteredData.map((g) => g.totalOutstanding || 0))
      : 0;

    return {
      shopGroups: filteredData,
      totalMarketOutstanding: totalOutstanding,
      summary: {
        shopsWithOutstandingCount: filteredData.length,
        totalInvoiceCount,
        totalInvoiceAmount,
        totalReceivedAmount,
        avgOutstanding,
        highestOutstanding,
      },
    };
  }, [filteredData]);

  const groupByRoute = useMemo(() => {
    return shopGroups
      .filter((group) => (group.totalOutstanding || 0) > 0)
      .reduce((acc, group) => {
        const routeKey = String(group.shop?.route || 'Unassigned Route').trim() || 'Unassigned Route';
        if (!acc[routeKey]) {
          acc[routeKey] = [];
        }
        acc[routeKey].push(group);
        return acc;
      }, {});
  }, [shopGroups]);

  const groupedRouteEntries = useMemo(() => {
    return Object.entries(groupByRoute).sort(([leftRoute], [rightRoute]) => leftRoute.localeCompare(rightRoute));
  }, [groupByRoute]);

  useEffect(() => {
    setReportFinalMarketOutstanding(totalMarketOutstanding);
  }, [totalMarketOutstanding, setReportFinalMarketOutstanding]);

  // Bind directly to the locally consolidated net total. Do NOT fall back
  // to the store's reportFinalMarketOutstanding here — that value is only
  // written by the effect below AFTER this render, so on refresh/mount it
  // can briefly hold a stale, unreduced snapshot figure from a previous
  // fetch, causing the "flash to a wrong number" bug.
  const sharedTotalMarketOutstanding = toMoneyNumber(totalMarketOutstanding);

  // Sort invoices within a group
  const getSortedInvoices = useCallback((invoices) => {
    return [...invoices].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') cmp = new Date(a.date) - new Date(b.date);
      else if (sortField === 'amount') cmp = a.amount - b.amount;
      else if (sortField === 'received') cmp = (a.received || 0) - (b.received || 0);
      else if (sortField === 'balanceDue') cmp = a.balanceDue - b.balanceDue;
      else if (sortField === 'ageDays') cmp = a.ageDays - b.ageDays;
      else cmp = a.docNo.localeCompare(b.docNo);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [sortField, sortDir]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const toggleBucket = (shopId) => {
    setExpandedBuckets(prev => ({ ...prev, [shopId]: !prev[shopId] }));
  };

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedYear('');
    setSelectedMonth('');
    setOlderThan60Days(false);
    setOmniSearch('');
    setSelectedStoreId(null);
  };

  const handleQuickRange = (range) => {
    const now = new Date();
    const end = new Date(now);
    let start = new Date(now);

    if (range === 'thisMonth') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (range === 'last30') {
      start.setDate(now.getDate() - 29);
    } else if (range === 'last7') {
      start.setDate(now.getDate() - 6);
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
    setSelectedYear('');
    setSelectedMonth('');
  };

  // NOTE: Never call setTheme() or modify theme state here.
  // All print styling is handled purely by @media print CSS in index.css.
  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = useCallback(() => {
    const headers = ['Shop Name', 'Route', 'Contact', '#', 'Posting Date', 'Invoice No', 'Description', 'Payment Mode', 'Cheque No', 'Bank', 'Amount', 'Balance Due', 'Age (Days)'];
    const csvRows = [headers.join(',')];
    
    let idx = 1;
    shopGroups.filter(g => (g.totalOutstanding || 0) > 0).forEach(group => {
      getSortedInvoices(group.invoices).forEach(inv => {
        const displayBalance = computeBalanceDue(inv.amount, inv.received || 0);
        if (displayBalance <= 0) return;
        csvRows.push([
          csvEscape(group.shopName),
          csvEscape(group.shop?.route || ''),
          csvEscape(group.shop?.contact || ''),
          idx++,
          csvDateCell(inv.date),
          csvEscape(normalizeInvoiceNo(inv.docNo)),
          csvEscape(inv.description || ''),
          csvEscape(inv.paymentMode || ''),
          csvEscape(inv.chequeNo || ''),
          csvEscape(inv.bankName || ''),
          inv.amount,
          displayBalance,
          computeElapsedDays(inv.date),
        ].join(','));
      });
      csvRows.push(['', '', '', '', '', '', csvEscape(`${group.shopName} Outstanding: ${formatCurrency(group.totalOutstanding)}`), '', '', '', '', '', ''].join(','));
    });
    
    csvRows.push(['', '', '', '', '', '', csvEscape(`TOTAL MARKET OUTSTANDING: ${formatCurrency(Math.round(sharedTotalMarketOutstanding))}`), '', '', '', '', '', ''].join(','));
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `outstanding-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [shopGroups, sharedTotalMarketOutstanding, getSortedInvoices]);

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronDown size={12} className="text-gray-400 ml-1 opacity-0 group-hover:opacity-100 dark:text-slate-500" />;
    return (
      <ChevronDown
        size={12}
        className={`ml-1 transition-transform ${sortDir === 'desc' ? 'rotate-180' : ''}`}
      />
    );
  };

  const activeShopsCount = allShops.filter(s => s.active).length;

  return (
    <div className="w-full min-w-full space-y-6">
      {/* Controls Bar */}
      <div className="no-print flex items-center justify-end">
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
            <input
              type="checkbox"
              checked={olderThan60Days}
              onChange={(event) => setOlderThan60Days(event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-accent-600 focus:ring-accent-500"
            />
            Age {'>'} 60 Days
          </label>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium border rounded-xl shadow-sm bg-white text-gray-700 hover:bg-gray-50 border-gray-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700/80 transition-all"
          >
            <SlidersHorizontal size={16} className={`transition-transform duration-300 ${showFilters ? 'rotate-180 text-orange-500' : ''}`} />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
          <button onClick={handleExportCSV} className="btn-secondary text-xs flex-1 lg:flex-initial">
            <FileSpreadsheet size={14} />
            <span className="hidden sm:inline">CSV</span>
          </button>
          <button onClick={handlePrint} className="btn-primary text-xs flex-1 lg:flex-initial">
            <Printer size={14} />
            <span className="hidden sm:inline">Print / PDF</span>
          </button>
        </div>
      </div>

      <div className={`transition-all duration-300 ease-in-out ${showFilters ? 'max-h-[500px] overflow-visible opacity-100 mb-6' : 'max-h-0 overflow-hidden opacity-0 mb-0 pointer-events-none'}`}>
        <div className="glass-card no-print overflow-visible border border-accent-200/50 dark:border-accent-700/40">
          <div className="h-1.5 bg-gradient-to-r from-accent-500 via-orange-500 to-rose-500" />
          <div className="p-4 sm:p-5 lg:p-6 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-slate-400">Temporal Intelligence Panel</p>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-slate-100">Calendar Matrix and Search Stores</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
              <div className="xl:col-span-5 rounded-2xl border border-gray-200 bg-gradient-to-br from-white via-gray-50 to-gray-100/80 p-4 shadow-sm dark:border-slate-700 dark:from-slate-800 dark:via-slate-850 dark:to-slate-900">
              <div className="flex items-center gap-2 mb-3">
                <CalendarDays size={15} className="text-accent-600 dark:text-accent-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">Date Range Calendar</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FancyDatePicker
                  value={startDate}
                  onChange={(event) => setStartDate(readDateValue(event))}
                  label="Start Date"
                  name="startDate"
                />
                <FancyDatePicker
                  value={endDate}
                  onChange={(event) => setEndDate(readDateValue(event))}
                  label="End Date"
                  name="endDate"
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => handleQuickRange('last7')} className="text-[11px] px-2.5 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:border-accent-300 hover:text-accent-600 transition-colors dark:border-slate-600 dark:text-slate-300 dark:hover:border-accent-500 dark:hover:text-accent-300">Last 7 Days</button>
                <button type="button" onClick={() => handleQuickRange('last30')} className="text-[11px] px-2.5 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:border-accent-300 hover:text-accent-600 transition-colors dark:border-slate-600 dark:text-slate-300 dark:hover:border-accent-500 dark:hover:text-accent-300">Last 30 Days</button>
                <button type="button" onClick={() => handleQuickRange('thisMonth')} className="text-[11px] px-2.5 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:border-accent-300 hover:text-accent-600 transition-colors dark:border-slate-600 dark:text-slate-300 dark:hover:border-accent-500 dark:hover:text-accent-300">This Month</button>
              </div>
            </div>

              <div className="xl:col-span-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/80">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">Month Block Picker</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="ui-contrast-field text-xs rounded-lg border px-2.5 py-1.5"
                >
                  <option value="">All Years</option>
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {monthOptions.map((month) => {
                  const selected = selectedMonth === month.value;
                  return (
                    <button
                      key={month.value}
                      type="button"
                      onClick={() => {
                        setSelectedMonth((prev) => (prev === month.value ? '' : month.value));
                        if (!selectedYear) {
                          setSelectedYear(String(new Date().getFullYear()));
                        }
                      }}
                      className={`text-xs font-semibold px-2 py-2 rounded-lg border transition-all duration-200 ${selected
                        ? 'border-accent-500 bg-accent-500 text-white shadow-md shadow-accent-500/30'
                        : 'border-gray-200 text-gray-600 hover:border-accent-300 hover:text-accent-600 dark:border-slate-600 dark:text-slate-300 dark:hover:border-accent-500 dark:hover:text-accent-300'
                      }`}
                    >
                      {month.label}
                    </button>
                  );
                })}
              </div>
            </div>

              <div className="xl:col-span-3 rounded-2xl border border-gray-200 bg-gradient-to-b from-white to-accent-50/40 p-4 shadow-sm dark:border-slate-700 dark:from-slate-800 dark:to-slate-900">
              <label className="flex flex-col gap-2 relative">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">Search Stores</span>
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                  <input
                    type="text"
                    value={omniSearch}
                    onFocus={() => setShowOmniSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowOmniSuggestions(false), 120)}
                    onChange={(e) => {
                      setOmniSearch(e.target.value);
                      setShowOmniSuggestions(true);
                    }}
                    placeholder="Find and select a store..."
                    className="ui-contrast-field w-full rounded-xl border pl-10 pr-9 py-2.5 text-sm outline-none transition-all duration-200 focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20"
                  />
                  {selectedStoreId && (
                    <button
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        setSelectedStoreId(null);
                        setOmniSearch('');
                        setShowOmniSuggestions(false);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:text-slate-500 dark:hover:text-slate-200 dark:hover:bg-slate-700"
                      aria-label="Clear selected store"
                    >
                      <X size={14} />
                    </button>
                  )}
                  {showOmniSuggestions && omniSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 w-full mt-1 z-50 ui-contrast-panel shadow-2xl rounded-xl border max-h-[300px] overflow-y-auto">
                      {omniSuggestions.map((store) => (
                        <button
                          key={store.id}
                          type="button"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            setSelectedStoreId(store.id);
                            setOmniSearch(store.name || '');
                            setShowOmniSuggestions(false);
                          }}
                          className="w-full rounded-lg px-3 py-2.5 text-left hover:bg-accent-50 dark:hover:bg-accent-900/30"
                        >
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{store.name || 'Unnamed Store'}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{store.route || 'No route assigned'}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </label>
              <div className="mt-3">
                <button onClick={handleResetFilters} className="btn-secondary w-full text-xs">
                  <Filter size={14} />
                  Reset All Filters
                </button>
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-accent-600 dark:text-accent-400" />
              </div>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent-50 text-accent-700 border border-accent-200 dark:bg-accent-900/30 dark:text-accent-300 dark:border-accent-700">
                Market Total
              </span>
            </div>
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Total Market Outstanding</p>
            <p className="text-2xl font-bold text-accent-600 dark:text-accent-400">{formatCurrency(Math.round(sharedTotalMarketOutstanding))}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Store className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700">
                Active
              </span>
            </div>
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Active Debtors</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{summary.shopsWithOutstandingCount}</p>
            <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-1">
              out of {activeShopsCount} active stores
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700">
                Total
              </span>
            </div>
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Outstanding Invoices</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{summary.totalInvoiceCount}</p>
            <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-1">
              totaling {formatCurrency(Math.round(summary.totalInvoiceAmount))}
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700">
                Avg
              </span>
            </div>
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Avg Outstanding / Debtor</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{formatCurrency(Math.round(summary.avgOutstanding))}</p>
            <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-1">
              Highest: {formatCurrency(Math.round(summary.highestOutstanding))}
            </p>
          </div>
        </div>
      </div>

      {/* The Report Content */}
      <div id="print-content" className="w-full space-y-4">
        {olderThan60Days && (
          <div className="text-red-600 text-2xl font-bold mb-4">60 day Overdue</div>
        )}
        {loadingReport ? (
          <div className="glass-card p-12 text-center">
            <FileText size={48} className="mx-auto mb-4 text-gray-300 dark:text-slate-600" />
            <p className="text-gray-500 dark:text-slate-400">Loading outstanding data for selected date filters...</p>
          </div>
        ) : shopGroups.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <FileText size={48} className="mx-auto mb-4 text-gray-300 dark:text-slate-600" />
            <p className="text-gray-500 dark:text-slate-400">No transactions found for the selected criteria</p>
          </div>
        ) : (
          groupedRouteEntries.map(([routeName, routeGroups]) => (
            <div key={routeName} className="space-y-4">
              <span className="text-blue-600 dark:text-blue-400 text-xl font-bold tracking-wide my-4 block">
                Route: {routeName}
              </span>

              {routeGroups.map((group) => {
                const sortedInvoices = getSortedInvoices(group.invoices);
                const isExpanded = expandedBuckets[group.shopId] !== false; // default expanded

                // ── Per-group pagination ──
                const groupPage = getGroupPage(group.shopId);
                const groupTotalPages = Math.ceil(sortedInvoices.length / rowsPerPage);
                const indexOfLastRow = groupPage * rowsPerPage;
                const indexOfFirstRow = indexOfLastRow - rowsPerPage;
                const paginatedInvoices = sortedInvoices.slice(indexOfFirstRow, indexOfLastRow);

                return (
                  <div key={group.shopId} className="glass-card overflow-hidden">
                    {/* Shop Header */}
                    <div
                      className="flex items-center justify-between p-4 sm:px-5 sm:py-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors dark:border-slate-700 dark:hover:bg-slate-700/30"
                      onClick={() => toggleBucket(group.shopId)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-100 to-orange-50 dark:from-accent-900/40 dark:to-orange-900/30 flex items-center justify-center text-sm font-bold text-accent-600 dark:text-accent-400">
                          {group.shopName[0]}
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">{group.shopName}</h3>
                          <div className="flex items-center gap-3 text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">
                            {group.shop?.route && (
                              <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                                <MapPin size={10} />
                                <span className="font-medium">{group.shop.route}</span>
                              </span>
                            )}
                            {group.shop?.contact && (
                              <span className="flex items-center gap-1">
                                <Phone size={10} />
                                {group.shop.contact}
                              </span>
                            )}
                            {getSalesPersonName(group.shop) && (
                              <span className="flex items-center gap-1">
                                <User size={10} />
                                {getSalesPersonName(group.shop)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium uppercase tracking-wider">Outstanding</p>
                          <p className="text-lg font-bold text-accent-600 dark:text-accent-400">{formatCurrency(group.totalOutstanding)}</p>
                        </div>
                        <ChevronDown
                          size={16}
                          className={`text-gray-400 dark:text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </div>
                    </div>

                    {/* Invoices Table */}
                    {isExpanded && (
                      <>
                        <div className="px-5 pb-4">
                          <div className="overflow-x-auto">
                            <table className="w-full table-auto">
                            <thead>
                              <tr className="table-header-row">
                                <th className="table-header w-8">#</th>
                                <th className="table-header group cursor-pointer select-none w-28" onClick={() => handleSort('date')}>
                                  <div className="flex items-center">
                                    Date
                                    <SortIcon field="date" />
                                  </div>
                                </th>
                                <th className="table-header group cursor-pointer select-none" onClick={() => handleSort('docNo')}>
                                  <div className="flex items-center">
                                    Invoice No
                                    <SortIcon field="docNo" />
                                  </div>
                                </th>
                                <th className="table-header w-24">Doc Type</th>
                                <th className="table-header">Description</th>
                                <th className="table-header group cursor-pointer select-none text-right w-28" onClick={() => handleSort('amount')}>
                                  <div className="flex items-center justify-end">
                                    Amount
                                    <SortIcon field="amount" />
                                  </div>
                                </th>
                                <th className="table-header group cursor-pointer select-none text-right w-28" onClick={() => handleSort('received')}>
                                  <div className="flex items-center justify-end">
                                    Received
                                    <SortIcon field="received" />
                                  </div>
                                </th>
                                <th className="table-header group cursor-pointer select-none text-right w-28" onClick={() => handleSort('balanceDue')}>
                                  <div className="flex items-center justify-end">
                                    Balance Due
                                    <SortIcon field="balanceDue" />
                                  </div>
                                </th>
                                <th className="table-header group cursor-pointer select-none text-center w-24" onClick={() => handleSort('ageDays')}>
                                  <div className="flex items-center justify-center">
                                    Age (Days)
                                    <SortIcon field="ageDays" />
                                  </div>
                                </th>
                              </tr>
                            </thead>
                            <tbody className="table-divide">
                              {paginatedInvoices.length === 0 ? (
                                <tr>
                                  <td colSpan={9} className="text-center py-8 text-gray-500 dark:text-slate-400 text-sm">
                                    No invoices found
                                  </td>
                                </tr>
                              ) : (
                                paginatedInvoices.map((inv, idx) => {
                                  const dynamicAgeDays = computeElapsedDays(inv.date);
                                  const displayReceived = toMoneyNumber(inv.received);
                                  const displayBalanceDue = toMoneyNumber(inv.balanceDue);
                                  const rowTypographyClassName = getScreenRowTypographyClassName(dynamicAgeDays);
                                  const receivedCellTypographyClassName = 'text-black font-bold dark:text-white dark:font-bold';
                                  const receivedDisplayText = displayReceived > 0
                                    ? `- ${formatCurrency(displayReceived)}`
                                    : '-';
                                  return (
                                    <tr
                                      key={inv.id || `${inv.docNo}-${idx}`}
                                      className="table-body-row"
                                    >
                                      <td className={`table-cell text-xs ${rowTypographyClassName}`}>
                                        {indexOfFirstRow + idx + 1}
                                      </td>
                                      <td className={`table-cell ${rowTypographyClassName}`}>
                                        <div className="flex items-center gap-2">
                                          <CalendarDays size={13} className="flex-shrink-0" />
                                          <span>{formatDate(inv.date)}</span>
                                        </div>
                                      </td>
                                      <td className={`table-cell font-mono text-xs ${rowTypographyClassName}`}>
                                        {normalizeInvoiceNo(inv.docNo)}
                                      </td>
                                      <td className={`table-cell ${rowTypographyClassName}`}>
                                        <span className="text-xs px-2 py-0.5 rounded-full border border-current/40">
                                          {inv.docType || 'Invoice'}
                                        </span>
                                      </td>
                                      <td className={`table-cell text-xs max-w-[180px] truncate ${rowTypographyClassName}`} title={inv.description}>
                                        {inv.description || '—'}
                                      </td>
                                      <td className={`table-cell text-right font-mono text-sm ${rowTypographyClassName}`}>
                                        {formatCurrency(inv.amount)}
                                      </td>
                                      <td className={`table-cell text-right font-mono text-sm ${receivedCellTypographyClassName}`}>
                                        {receivedDisplayText}
                                      </td>
                                      <td className={`table-cell text-right font-mono text-sm ${rowTypographyClassName}`}>
                                        {formatCurrency(displayBalanceDue)}
                                      </td>
                                      <td className={`table-cell text-center ${rowTypographyClassName}`}>
                                        {dynamicAgeDays}d
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Per-group Pagination — only if invoices exceed rowsPerPage */}
                        {sortedInvoices.length > rowsPerPage && (
                          <Pagination
                            currentPage={groupPage}
                            totalPages={groupTotalPages}
                            rowsPerPage={rowsPerPage}
                            onPageChange={(page) => setGroupPage(group.shopId, page)}
                            onRowsPerPageChange={setRowsPerPage}
                          />
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}

        {/* Total Market Outstanding Footer */}
        {summary.shopsWithOutstandingCount > 0 && (
          <div className="glass-card border-accent-200 dark:border-accent-700 bg-gradient-to-r from-accent-50 to-orange-50 dark:from-accent-900/30 dark:to-accent-800/20 overflow-hidden">
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-accent-600 dark:text-accent-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-slate-400">Total Market Outstanding</p>
                  <p className="text-xs text-gray-500 mt-0.5 dark:text-slate-500">
                    Across {summary.shopsWithOutstandingCount} debtor stores • {summary.totalInvoiceCount} outstanding invoices
                  </p>
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-accent-600 dark:text-accent-400">
                {formatCurrency(Math.round(sharedTotalMarketOutstanding))}
              </p>
            </div>
            <div className="h-1 bg-gradient-to-r from-accent-500 via-orange-500 to-rose-500" />
          </div>
        )}
      </div>

      {/* Print-only footer */}
      <div className="hidden print:block mt-8 text-xs text-gray-500 text-center">
        Generated by Liyanage Distributors — Outstanding Management System | {formatDateYMD(new Date())}
      </div>

      {/* Inline hidden print overlay */}
      <PrintFullReport
        isFullReport={true}
        olderThan60Days={olderThan60Days}
        reportRowsOverride={filteredReportRows}
        marketOutstandingTotalOverride={sharedTotalMarketOutstanding}
      />
    </div>
  );
}