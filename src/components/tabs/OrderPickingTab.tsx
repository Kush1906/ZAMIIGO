import React, { useState } from 'react';
import { PlanState } from '../../lib/types';
import { Package, ShoppingBag, Printer, AlertTriangle, Split, Info } from 'lucide-react';

interface OrderPickingTabProps {
  state: PlanState;
  onMoveToteToCart: (toteId: string, targetCartId: string) => { error?: string };
  onOpenHandheld: () => void;
  onUpdateCartToteLimit: (limit: number) => void;
}

export const OrderPickingTab: React.FC<OrderPickingTabProps> = ({
  state,
  onMoveToteToCart,
  onOpenHandheld,
  onUpdateCartToteLimit,
}) => {
  const [selectedCartId, setSelectedCartId] = useState<string>(state.carts[0]?.cart_id || 'CART-01');
  const [moveError, setMoveError] = useState<string | null>(null);

  const selectedCart = state.carts.find(c => c.cart_id === selectedCartId) || state.carts[0];
  const cartTotes = state.totes.filter(t => t.assigned_cart_id === selectedCart?.cart_id);

  const handlePrint = () => {
    window.print();
  };

  const handleToteCartChange = (toteId: string, targetCartId: string) => {
    setMoveError(null);
    const result = onMoveToteToCart(toteId, targetCartId);
    if (result.error) {
      setMoveError(result.error);
      setTimeout(() => setMoveError(null), 5000);
    }
  };

  // Oversized split totes count
  const splitTotesCount = state.totes.filter(t => t.is_oversized_split).length;
  const avgToteFill = state.totes.length > 0
    ? Math.round(state.totes.reduce((sum, t) => sum + t.volume_fill_pct, 0) / state.totes.length)
    : 0;

  return (
    <div className="space-y-6">

      {/* Top Controls & Metrics */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-white tracking-tight">Returnable Tote & Cart Optimization</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-950 text-sky-400 border border-sky-800">
                Stage {state.activeStage === 'stage1' ? '1 (Base)' : '2 (Multi-Day)'}
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Household orders are packed into Zamiigo returnable totes (23.5" × 14" × 11", ~3,600 cu in working capacity). Oversized household orders exceeding tote dimensions are split into sequenced parts. All totes for an order are constrained to the same cart.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onOpenHandheld}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Launch Handheld Scanner</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
            >
              <Printer className="h-4 w-4" />
              <span>Print Pick Lists</span>
            </button>
          </div>
        </div>

        {/* Operational Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-xs text-slate-400">Total Returnable Totes</div>
            <div className="text-xl font-bold text-sky-400 mt-0.5 font-mono">
              {state.totes.length} <span className="text-xs font-normal text-slate-500">totes</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">From {state.orders.length} household orders</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-xs text-slate-400">Oversized Split Totes</div>
            <div className="text-xl font-bold text-amber-400 mt-0.5 font-mono flex items-center space-x-1.5">
              <Split className="h-4 w-4" />
              <span>{splitTotesCount}</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Orders exceeding 3,600 cu in</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-xs text-slate-400">Average Volume Fill</div>
            <div className="text-xl font-bold text-emerald-400 mt-0.5 font-mono">
              {avgToteFill}%
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Estimated packing volume</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>Configured Carts</span>
              <span className="text-[10px] text-sky-400">({state.config.maxTotesPerCart} totes/cart)</span>
            </div>
            <div className="text-xl font-bold text-purple-400 mt-0.5 font-mono">
              {state.carts.length} <span className="text-xs font-normal text-slate-500">carts</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Sequential store walking paths</div>
          </div>
        </div>

        {/* Warning notification banner if error exists */}
        {moveError && (
          <div className="mt-4 p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
            <span><strong>Movement Blocked:</strong> {moveError}</span>
          </div>
        )}
      </div>

      {/* Cart Selector Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center space-x-2 overflow-x-auto py-1">
          {state.carts.map(cart => (
            <button
              key={cart.cart_id}
              onClick={() => setSelectedCartId(cart.cart_id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition ${
                selectedCart?.cart_id === cart.cart_id
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span>{cart.cart_code}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                selectedCart?.cart_id === cart.cart_id ? 'bg-sky-700 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {cart.tote_ids.length} totes
              </span>
            </button>
          ))}
        </div>

        {/* Configurable Totes per Cart selector */}
        <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-400">
          <span>Totes per Cart:</span>
          <select
            value={state.config.maxTotesPerCart}
            onChange={e => onUpdateCartToteLimit(parseInt(e.target.value, 10))}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value={3}>3 Totes</option>
            <option value={4}>4 Totes</option>
            <option value={5}>5 Totes (Standard)</option>
            <option value={6}>6 Totes</option>
            <option value={8}>8 Totes</option>
          </select>
        </div>
      </div>

      {/* Active Cart & Totes Breakdown */}
      {selectedCart && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs">
            <div className="flex items-center space-x-3">
              <span className="font-bold text-white text-sm font-mono">{selectedCart.cart_code}</span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-300 font-mono">Weight: <strong>{selectedCart.total_weight_lb} lb</strong></span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-300 font-mono">Total Items: <strong>{selectedCart.total_items}</strong></span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-300">Households: <strong>{selectedCart.household_ids.map(h => `#${h}`).join(', ')}</strong></span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center space-x-1">
              <Info className="h-3.5 w-3.5 text-sky-400" />
              <span>All totes for any shared order reside on this cart</span>
            </div>
          </div>

          {/* Totes Grid for Selected Cart */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cartTotes.map(tote => {
              const householdsText = tote.assigned_household_ids.map(h => `#${h}`).join(', ');

              return (
                <div
                  key={tote.tote_id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Tote Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="p-2 rounded-lg bg-sky-950/80 border border-sky-800 text-sky-400">
                          <Package className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-bold text-white font-mono flex items-center space-x-2">
                            <span>{tote.tote_code}</span>
                            {tote.is_oversized_split && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">
                                Part {tote.split_part_index}/{tote.split_total_parts}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400">
                            Household {householdsText}
                          </div>
                        </div>
                      </div>

                      {/* Manual Move to another Cart */}
                      <div className="flex items-center space-x-1">
                        <select
                          value={tote.assigned_cart_id || ''}
                          onChange={e => handleToteCartChange(tote.tote_id, e.target.value)}
                          className="text-[11px] bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
                          title="Reassign tote to another cart"
                        >
                          {state.carts.map(c => (
                            <option key={c.cart_id} value={c.cart_id}>
                              Move ➔ {c.cart_code}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Volume Fill & Weight Bar */}
                    <div className="space-y-1.5 pt-2">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400">Volume Fill (Est.)</span>
                        <span className={tote.volume_fill_pct > 90 ? 'text-amber-400 font-bold' : 'text-slate-200'}>
                          {tote.volume_fill_pct}% ({tote.total_volume_cuin} cu in)
                        </span>
                      </div>
                      <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                        <div
                          className={`h-full rounded-full transition-all ${
                            tote.volume_fill_pct > 90 ? 'bg-amber-500' : 'bg-sky-500'
                          }`}
                          style={{ width: `${Math.min(100, tote.volume_fill_pct)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                        <span>Weight: <strong className="text-slate-300">{tote.total_weight_lb} lb</strong></span>
                        <span>Items: <strong className="text-slate-300">{tote.items.length}</strong></span>
                      </div>
                    </div>

                    {/* Packed Items Preview */}
                    <div className="mt-3 pt-3 border-t border-slate-800/80">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                        Packed Items:
                      </div>
                      <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                        {tote.items.map((item, idx) => (
                          <div
                            key={item.id}
                            className="text-[11px] flex items-center justify-between py-0.5 text-slate-300 hover:text-white"
                          >
                            <span className="truncate pr-2">
                              {idx + 1}. {item.product_name}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono shrink-0">
                              HH#{item.household_id} ({item.weight_lb}lb)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 text-[10px] text-slate-500 text-center font-mono border-t border-slate-800/60">
                    Working envelope: 23.5"×14"×11" (3,600 cu in)
                  </div>
                </div>
              );
            })}
          </div>

          {/* Printable Pick List Table (Active Cart) */}
          <div className="mt-8 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-sm font-mono">
                  Pick List: {selectedCart.cart_code} ({selectedCart.total_items} items)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Organized by Tote ➔ Household Order ➔ Product for optimized single-pass store walking path.
                </p>
              </div>
              <button
                onClick={handlePrint}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-1.5 transition"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print This Cart</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-mono uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3 w-8">Pick</th>
                    <th className="py-2.5 px-3">Tote #</th>
                    <th className="py-2.5 px-3">Household #</th>
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-3">Product ID</th>
                    <th className="py-2.5 px-3">Weight</th>
                    <th className="py-2.5 px-3">Dimensions</th>
                    <th className="py-2.5 px-3">Bagging Instruction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {cartTotes.flatMap(tote =>
                    tote.items.map((item) => (
                      <tr key={`${tote.tote_id}-${item.id}`} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 text-center">
                          <input type="checkbox" className="rounded bg-slate-800 border-slate-700 text-sky-600 focus:ring-0 cursor-pointer" />
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-sky-400">
                          {tote.tote_code}
                          {tote.is_oversized_split && (
                            <span className="ml-1 text-[9px] text-amber-400">P{tote.split_part_index}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-200">
                          HH #{item.household_id}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-100">
                          {item.product_name}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-400">
                          {item.product_id}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-300">
                          {item.weight_lb} lb
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-400">
                          {item.length_in}" × {item.width_in}" × {item.height_in}"
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">
                          Bag in Household #{item.household_id} bag
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
