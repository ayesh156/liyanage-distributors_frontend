import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const fmt = (v) => `Rs. ${(v || 0).toLocaleString('en-US')}`;
const fmtK = (v) => {
  if (!v) return '—';
  if (v >= 1000000) return `Rs. ${(v / 1000000).toFixed(2)}M`;
  if (v >= 1000)    return `Rs. ${(v / 1000).toFixed(1)}k`;
  return fmt(v);
};

export default function MonthlyBreakdownGrid({ data }) {
  if (!data || data.length === 0) return null;

  const maxInvoiced = Math.max(...data.map((d) => d.invoiced || 0), 1);

  return (
    <div className="glass-card overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between dark:border-slate-700">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-200">Monthly Breakdown</h3>
        <span className="text-[10px] text-gray-500 uppercase tracking-wider dark:text-slate-400">
          Last {data.length} months
        </span>
      </div>
      <div className="px-5 pb-4">
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
          <thead>
            <tr className="table-header-row">
              <th className="table-header w-20">Month</th>
              <th className="table-header text-right">Invoiced</th>
              <th className="table-header text-right">Recovered</th>
              <th className="table-header text-right">Outstanding</th>
              <th className="table-header w-32">Collection %</th>
            </tr>
          </thead>
          <tbody className="table-divide">
            {data.map((row, idx) => {
              const invoiced    = row.invoiced    || row.outstanding + row.recovered || 0;
              const recovered   = row.recovered   || 0;
              const outstanding = row.outstanding || 0;
              const collectionPct = invoiced > 0 ? Math.round((recovered / invoiced) * 100) : 0;
              const barWidth = invoiced > 0 ? (invoiced / maxInvoiced) * 100 : 0;
              const isLast = idx === data.length - 1;

              const trend =
                idx === 0 ? null
                : outstanding > (data[idx - 1]?.outstanding || 0) ? 'up'
                : outstanding < (data[idx - 1]?.outstanding || 0) ? 'down'
                : 'flat';

              return (
                <tr
                  key={row.month}
                   className={`table-body-row ${isLast ? 'bg-accent-50/30 dark:bg-accent-900/20' : ''}`}
                >
                  <td className="table-cell font-semibold text-gray-800 dark:text-slate-200">
                    {row.month}
                    {isLast && (
                      <span className="ml-1.5 text-[9px] bg-accent-100 text-accent-700 px-1.5 py-0.5 rounded-full dark:bg-accent-900/30 dark:text-accent-300">
                        Current
                      </span>
                    )}
                  </td>
                  <td className="table-cell text-right font-mono text-sm text-gray-600 dark:text-slate-300">
                    {fmtK(invoiced)}
                  </td>
                  <td className="table-cell text-right font-mono text-sm text-emerald-600 dark:text-emerald-400">
                    {fmtK(recovered)}
                  </td>
                  <td className="table-cell text-right font-mono text-sm font-semibold">
                    <span className={outstanding > 0 ? 'text-accent-600 dark:text-accent-400' : 'text-emerald-600 dark:text-emerald-400'}>
                      {fmtK(outstanding)}
                    </span>
                    {trend === 'up'   && <TrendingUp  size={12} className="inline ml-1 text-red-500" />}
                    {trend === 'down' && <TrendingDown size={12} className="inline ml-1 text-emerald-500" />}
                    {trend === 'flat' && <Minus        size={12} className="inline ml-1 text-gray-400 dark:text-slate-500" />}
                  </td>
                  <td className="table-cell w-32">
                    <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden dark:bg-slate-700">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            collectionPct >= 80 ? 'bg-emerald-500'
                            : collectionPct >= 50 ? 'bg-amber-500'
                            : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(collectionPct, 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-500 dark:text-slate-400 w-8 text-right font-mono">
                        {collectionPct}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="table-footer-row">
              <td className="table-cell text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-slate-400">
                Total
              </td>
              <td className="table-cell text-right font-mono text-sm font-semibold text-gray-800 dark:text-slate-200">
                {fmtK(data.reduce((s, r) => s + (r.invoiced || 0), 0))}
              </td>
              <td className="table-cell text-right font-mono text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {fmtK(data.reduce((s, r) => s + (r.recovered || 0), 0))}
              </td>
              <td className="table-cell text-right font-mono text-sm font-bold text-accent-600 dark:text-accent-400">
                {fmtK(data[data.length - 1]?.outstanding || 0)}
              </td>
              <td className="table-cell" />
            </tr>
          </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}