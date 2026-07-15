import { Search, Plus, Store, MapPin, Phone, ChevronRight, Filter } from 'lucide-react';
import { useState } from 'react';

const formatCurrency = (val) => val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export default function ShopList({
  shops,
  shopOutstanding,
  onSelectShop,
  onAddShop,
  searchQuery,
  setSearchQuery,
  allShops,
}) {
  const [routeFilter, setRouteFilter] = useState('all');
  const routes = [...new Set(allShops.map(s => s.route))];

  const filtered = routeFilter === 'all'
    ? shops
    : shops.filter(s => s.route === routeFilter);

  const searched = searchQuery
    ? filtered.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.route.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filtered;

  return (
    <div className="glass-card overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 sm:p-5 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-xs w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search stores..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-9"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <select
                value={routeFilter}
                onChange={(e) => setRouteFilter(e.target.value)}
                className="input-field pr-8 appearance-none cursor-pointer"
              >
                <option value="all">All Routes</option>
                {routes.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <button onClick={onAddShop} className="btn-primary whitespace-nowrap">
              <Plus size={16} />
              <span className="hidden sm:inline">Add Store</span>
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-gray-100">
        {searched.map((shop) => {
          const outstanding = shopOutstanding[shop.id] || 0;
          return (
            <button
              key={shop.id}
              onClick={() => onSelectShop(shop.id)}
              className="w-full flex items-center gap-4 px-4 sm:px-5 py-4 hover:bg-gray-50 transition-all duration-200 text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center flex-shrink-0 border border-gray-200">
                <Store size={18} className="text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-800 truncate group-hover:text-accent-600 transition-colors">
                    {shop.name}
                  </span>
                  {outstanding > 0 && (
                    <span className="badge-red text-[10px] px-1.5 py-0.5">Due</span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-0.5">
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <MapPin size={11} />
                    {shop.route}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Phone size={11} />
                    {shop.contact}
                  </span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`text-sm font-semibold ${outstanding > 0 ? 'text-accent-600' : 'text-gray-400'}`}>
                  Rs. {formatCurrency(outstanding)}
                </p>
                <p className="text-[10px] text-gray-500">Outstanding</p>
              </div>
              <ChevronRight size={16} className="text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0" />
            </button>
          );
        })}
        {searched.length === 0 && (
          <div className="text-center py-12">
            <Store size={36} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No stores found</p>
            <button onClick={onAddShop} className="btn-primary mt-4">
              <Plus size={16} />
              Add Your First Store
            </button>
          </div>
        )}
      </div>
    </div>
  );
}