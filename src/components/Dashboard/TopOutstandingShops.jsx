import { Store, TrendingUp, MapPin } from 'lucide-react';
import useAppStore from '../../hooks/useAppStore';

const formatCurrency = (val) => (val || 0).toLocaleString('en-US');

const ageBadge = (days) => {
  if (days <= 15) return { label: 'Current',  color: 'badge-green' };
  if (days <= 30) return { label: 'Watch',    color: 'badge-amber' };
  if (days <= 60) return { label: 'Overdue',  color: 'badge-red'   };
  return           { label: 'Critical', color: 'badge-red'   };
};

/** Returns the age in days of the oldest unpaid invoice for a given shop */
function oldestInvoiceAge(transactions, shopId) {
  const shopTx = transactions.filter(
    (t) => t.shopId === shopId && t.docType === 'Invoice',
  );
  if (!shopTx.length) return 0;
  const oldest = shopTx.reduce((min, t) =>
    new Date(t.date) < new Date(min.date) ? t : min,
  );
  return Math.floor((Date.now() - new Date(oldest.date).getTime()) / 86400000);
}

export default function TopOutstandingShops({ shops, shopOutstanding }) {
  const transactions = useAppStore((s) => s.transactions);

  const ranked = shops
    .map((s) => ({ ...s, outstanding: shopOutstanding[s.id] || 0 }))
    .filter((s) => s.outstanding > 0)
    .sort((a, b) => b.outstanding - a.outstanding);

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-200">Top Outstanding Stores</h3>
        <TrendingUp size={16} className="text-accent-500" />
      </div>
      <div className="space-y-2">
        {ranked.slice(0, 6).map((shop) => {
          const maxOutstanding = ranked[0]?.outstanding || 1;
          const barWidth = (shop.outstanding / maxOutstanding) * 100;
          const ageDays = oldestInvoiceAge(transactions, shop.id);
          const { label, color } = ageBadge(ageDays);

          return (
            <div
              key={shop.id}
              className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-all duration-200 cursor-default dark:hover:bg-slate-700/50"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-100 to-orange-50 flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-accent-600">
                {shop.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-gray-800 truncate dark:text-slate-200">{shop.name}</span>
                  <span className="text-sm font-semibold text-accent-600 whitespace-nowrap font-mono">
                    Rs. {formatCurrency(shop.outstanding)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-0.5 text-[10px] text-gray-500">
                    <MapPin size={9} /> {shop.route}
                  </span>
                  <span className={color} style={{ fontSize: '10px', padding: '1px 6px' }}>{label}</span>
                  {ageDays > 0 && (
                    <span className="text-[10px] text-gray-400">{ageDays}d</span>
                  )}
                </div>
                <div className="mt-1.5 h-1 bg-gray-100 rounded-full overflow-hidden dark:bg-slate-700">
                  <div
                    className="h-full bg-gradient-to-r from-accent-500 to-accent-400 rounded-full transition-all duration-500"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
        {ranked.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-6">
            <Store size={24} className="mx-auto mb-2 text-gray-300" />
            No outstanding balances
          </p>
        )}
      </div>
    </div>
  );
}