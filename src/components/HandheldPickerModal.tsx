import React, { useState } from 'react';
import { PlanState } from '../lib/types';
import { X, Check, Smartphone, Package, RotateCcw } from 'lucide-react';

interface HandheldPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: PlanState;
}

export const HandheldPickerModal: React.FC<HandheldPickerModalProps> = ({ isOpen, onClose, state }) => {
  const [selectedCartId, setSelectedCartId] = useState<string>(state.carts[0]?.cart_id || 'CART-01');
  const [pickedItemIds, setPickedItemIds] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const currentCart = state.carts.find(c => c.cart_id === selectedCartId) || state.carts[0];
  const cartTotes = state.totes.filter(t => t.assigned_cart_id === currentCart?.cart_id);

  const toggleItemPicked = (itemId: string) => {
    setPickedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const resetPicks = () => {
    setPickedItemIds(new Set());
  };

  const totalCartItems = cartTotes.reduce((sum, t) => sum + t.items.length, 0);
  const pickedCartItemsCount = cartTotes.reduce(
    (sum, t) => sum + t.items.filter(i => pickedItemIds.has(i.id)).length,
    0
  );
  const progressPct = totalCartItems > 0 ? Math.round((pickedCartItemsCount / totalCartItems) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in no-print">
      <div className="glass-panel border-2 border-zamiigo-teal-light rounded-3xl w-full max-w-md h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-fade-in">
        
        {/* Handheld Device Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <Smartphone className="h-5 w-5 text-zamiigo-teal" />
            <div>
              <div className="font-extrabold text-sm text-slate-900 tracking-tight">Zamiigo Handheld Picker</div>
              <div className="text-[10px] text-slate-400 font-mono">Store Warehouse Scanner Mode</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Cart Switcher Bar */}
        <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 overflow-x-auto">
            {state.carts.map(c => (
              <button
                key={c.cart_id}
                onClick={() => setSelectedCartId(c.cart_id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition ${
                  selectedCartId === c.cart_id
                    ? 'bg-zamiigo-teal text-slate-900'
                    : 'bg-slate-100 text-slate-400 hover:text-slate-800'
                }`}
              >
                {c.cart_code}
              </button>
            ))}
          </div>

          <button
            onClick={resetPicks}
            className="p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:text-slate-900"
            title="Reset picked status"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="flex items-center justify-between text-xs font-mono mb-1">
            <span className="text-slate-400">Cart Progress</span>
            <span className="text-zamiigo-teal font-bold">{pickedCartItemsCount} / {totalCartItems} ({progressPct}%)</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Scrollable Pick List organized by Tote -> Household -> Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {cartTotes.map(tote => (
            <div key={tote.tote_id} className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
              
              {/* Tote Header */}
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <div className="flex items-center space-x-2">
                  <Package className="h-4 w-4 text-zamiigo-teal" />
                  <span className="font-mono font-bold text-slate-900 text-sm">{tote.tote_code}</span>
                  {tote.is_oversized_split && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
                      P{tote.split_part_index}/{tote.split_total_parts}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {tote.total_weight_lb} lb
                </span>
              </div>

              {/* Items in Tote */}
              <div className="space-y-2 pt-1">
                {tote.items.map(item => {
                  const isPicked = pickedItemIds.has(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleItemPicked(item.id)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isPicked
                          ? 'bg-emerald-50 border-emerald-200 text-slate-400'
                          : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="pr-3">
                        <div className={`font-semibold text-xs leading-snug ${isPicked ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                          {item.product_name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-1 flex items-center space-x-2">
                          <span className="text-zamiigo-teal font-bold">HH #{item.household_id}</span>
                          <span>|</span>
                          <span>PID: {item.product_id}</span>
                          <span>|</span>
                          <span>{item.weight_lb} lb</span>
                        </div>
                      </div>

                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                        isPicked
                          ? 'bg-emerald-600 border-emerald-500 text-slate-900'
                          : 'bg-slate-100 border-slate-300 text-transparent'
                      }`}>
                        <Check className="h-4 w-4" />
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          ))}
        </div>

        {/* Handheld Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 shrink-0 text-center text-[11px] text-slate-400 font-mono">
          Tap item to mark as picked into designated household bag
        </div>

      </div>
    </div>
  );
};
