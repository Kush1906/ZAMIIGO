import React, { useState } from 'react';
import { PlanState, HouseholdOrder, OrderStatus } from '../../lib/types';
import { getNutritionNorthAdvisory, formatRetailerOrderText, exportRetailerBatchCsv } from '../../lib/retailerExport';
import { Search, Copy, Download, Check, ChevronDown, ChevronRight, Filter, AlertCircle } from 'lucide-react';

interface OrderEntryTabProps {
  state: PlanState;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
}

export const OrderEntryTab: React.FC<OrderEntryTabProps> = ({ state, onUpdateStatus }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  // Status counters
  const statusCounts = state.orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const filteredOrders = state.orders.filter(order => {
    const matchesSearch =
      order.household_id.includes(searchQuery) ||
      order.order_id.includes(searchQuery) ||
      order.retailer_order_ref.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.items.some(i => i.product_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCopyText = (order: HouseholdOrder) => {
    const text = formatRetailerOrderText(order);
    navigator.clipboard.writeText(text);
    setCopiedOrderId(order.order_id);
    setTimeout(() => setCopiedOrderId(null), 2000);
  };

  const handleDownloadCsv = () => {
    const csvContent = exportRetailerBatchCsv(state.orders);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zamiigo_retailer_batch_${state.activeStage}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusOptions: { value: OrderStatus; label: string; color: string }[] = [
    { value: 'PENDING', label: 'Pending Staging', color: 'bg-slate-700 text-slate-300' },
    { value: 'RETAILER_SUBMITTED', label: 'Submitted to Superstore', color: 'bg-sky-950 text-sky-300 border-sky-800' },
    { value: 'PICKING', label: 'In-Store Picking', color: 'bg-amber-950 text-amber-300 border-amber-800' },
    { value: 'PACKED', label: 'Packed in Totes', color: 'bg-indigo-950 text-indigo-300 border-indigo-800' },
    { value: 'STAGED', label: 'Staged for Flight', color: 'bg-purple-950 text-purple-300 border-purple-800' },
    { value: 'DISPATCHED', label: 'Flown / Dispatched', color: 'bg-emerald-950 text-emerald-300 border-emerald-800' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Context */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-white tracking-tight">Retailer Order Staging & Fulfillment Layer</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                Fulfillment Bridge
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Takes individual Zamiigo customer household orders and generates formatted entries for the retailer’s consumer portal (Real Canadian Superstore). Keeps household orders strictly segregated for accurate door-to-door delivery in Webequie.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleDownloadCsv}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
            >
              <Download className="h-4 w-4" />
              <span>Export Retailer CSV</span>
            </button>
          </div>
        </div>

        {/* Status Lifecycle KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-5">
          {statusOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(statusFilter === opt.value ? 'ALL' : opt.value)}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                statusFilter === opt.value
                  ? 'border-sky-500 bg-sky-950/40 ring-1 ring-sky-500'
                  : 'border-slate-800 bg-slate-950 hover:border-slate-700'
              }`}
            >
              <div className="text-xs text-slate-400 truncate">{opt.label}</div>
              <div className="text-lg font-bold text-white mt-0.5 font-mono">
                {statusCounts[opt.value] || 0}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Household #, Order #, or Item..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
          >
            <option value="ALL">All Statuses ({state.orders.length})</option>
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label} ({statusCounts[opt.value] || 0})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400 font-mono">
              <tr>
                <th className="py-3 px-4 w-10"></th>
                <th className="py-3 px-4">Household & Order ID</th>
                <th className="py-3 px-4">Retailer Reference</th>
                <th className="py-3 px-4">Order Date</th>
                <th className="py-3 px-4">Weight & Volume</th>
                <th className="py-3 px-4">Items</th>
                <th className="py-3 px-4">Fulfillment Status</th>
                <th className="py-3 px-4 text-right">Superstore Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No orders match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => {
                  const isExpanded = expandedOrderId === order.order_id;
                  const isCopied = copiedOrderId === order.order_id;
                  const currentStatusOpt = statusOptions.find(s => s.value === order.status);

                  return (
                    <React.Fragment key={order.order_id}>
                      <tr className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => setExpandedOrderId(isExpanded ? null : order.order_id)}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400"
                            title="Expand items"
                          >
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        </td>

                        <td className="py-3.5 px-4 font-mono">
                          <div className="font-bold text-sky-400 flex items-center space-x-1.5">
                            <span>HH #{order.household_id}</span>
                            {order.requires_split && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800 uppercase font-sans">
                                Oversized Split
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500">Order #{order.order_id}</div>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-xs text-slate-300">
                          {order.retailer_order_ref}
                        </td>

                        <td className="py-3.5 px-4 text-xs text-slate-400 font-mono">
                          {order.order_date}
                          <div className="text-[10px] text-slate-500">Batch {order.batch_id}</div>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-xs">
                          <div className="text-slate-200 font-medium">{order.total_weight_lb} lb</div>
                          <div className="text-slate-500">{order.total_volume_cuin} cu in ({order.total_volume_cuft} cu ft)</div>
                        </td>

                        <td className="py-3.5 px-4 text-xs text-slate-300">
                          <span className="font-semibold text-slate-200">{order.item_count}</span> items
                        </td>

                        <td className="py-3.5 px-4">
                          <select
                            value={order.status}
                            onChange={e => onUpdateStatus(order.order_id, e.target.value as OrderStatus)}
                            className={`text-xs px-2.5 py-1 rounded-lg font-medium border focus:outline-none ${currentStatusOpt?.color || 'bg-slate-800'}`}
                          >
                            {statusOptions.map(opt => (
                              <option key={opt.value} value={opt.value} className="bg-slate-900 text-slate-200">
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleCopyText(order)}
                            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                              isCopied
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700'
                            }`}
                            title="Copy formatted text to enter into Real Canadian Superstore order notes"
                          >
                            {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            <span>{isCopied ? 'Copied' : 'Copy Entry'}</span>
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Item Breakdown with Nutrition North Advisory */}
                      {isExpanded && (
                        <tr className="bg-slate-950/60">
                          <td colSpan={8} className="p-4 pl-12 border-t border-slate-800/80">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                                  Line Items for Household #{order.household_id} ({order.items.length} items)
                                </span>
                                <span className="text-xs text-slate-400 font-mono">
                                  Destination: <span className="text-emerald-400 font-semibold">{order.destination_community}</span> | Assigned Totes: {order.assigned_tote_ids.join(', ') || 'Auto-packing'}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {order.items.map((item, idx) => {
                                  const nnc = getNutritionNorthAdvisory(item.product_name);
                                  return (
                                    <div
                                      key={item.id}
                                      className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-start justify-between text-xs"
                                    >
                                      <div>
                                        <div className="font-medium text-slate-200">
                                          {idx + 1}. {item.product_name}
                                        </div>
                                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                          PID: {item.product_id} | {item.weight_lb} lb | {item.length_in}" × {item.width_in}" × {item.height_in}" ({item.volume_cuin} cu in)
                                        </div>
                                      </div>

                                      {/* Advisory Nutrition North Label */}
                                      <div className="text-right ml-2 shrink-0">
                                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium border ${
                                          nnc.advisoryLevel === 'HIGH_PRIORITY_REVIEW'
                                            ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                                            : 'bg-slate-800 text-slate-300 border-slate-700'
                                        }`}>
                                          {nnc.category}
                                        </span>
                                        <div className="text-[9px] text-slate-500 mt-0.5">Advisory Review</div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-center space-x-2">
                                <AlertCircle className="h-4 w-4 text-sky-400 shrink-0" />
                                <span>
                                  <strong>Nutrition North Canada Notice:</strong> Eligibility categories are advisory recommendations. Check official retailer product schedule at point-of-sale.
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
