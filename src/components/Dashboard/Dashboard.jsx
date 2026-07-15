import DashboardStats from './DashboardStats';
import MonthlyTrendChart from './MonthlyTrendChart';
import MonthlyBreakdownGrid from './MonthlyBreakdownGrid';
import TopOutstandingShops from './TopOutstandingShops';

export default function Dashboard({ data }) {
  const {
    grandTotalOutstanding,
    thisMonthRecovered,
    totalActiveDebtors,
    monthlyBreakdown,
    shops,
    shopOutstanding,
    paymentDistribution,
  } = data;

  // Always use live backend monthlyBreakdown - no hardcoded fallback
  const chartData = monthlyBreakdown || [];

  return (
    <div className="space-y-4 px-5">
      {/* ── Stat Cards + Payment Distribution ── */}
      <DashboardStats
        grandTotal={grandTotalOutstanding}
        recovered={thisMonthRecovered}
        debtors={totalActiveDebtors}
        paymentDistribution={paymentDistribution}
      />

      {/* ── Chart + Top Debtors ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <MonthlyTrendChart data={chartData} />
        </div>
        <div>
          <TopOutstandingShops shops={shops} shopOutstanding={shopOutstanding} />
        </div>
      </div>

      {/* ── Monthly Breakdown Grid ── */}
      <MonthlyBreakdownGrid data={chartData} />
    </div>
  );
}
