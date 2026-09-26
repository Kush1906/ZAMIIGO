import React from 'react';
import { PlanState, PlanConfig } from '../lib/types';
import { X, Sliders, AlertTriangle, CheckCircle } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: PlanState;
  onUpdateConfig: (config: Partial<PlanConfig>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  state,
  onUpdateConfig,
}) => {
  if (!isOpen) return null;

  const { config, issues } = state;
  const errors = issues.filter(i => i.type === 'ERROR');
  const warnings = issues.filter(i => i.type === 'WARNING');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm no-print">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sliders className="h-5 w-5 text-sky-400" />
            <h3 className="font-bold text-white text-base">Logistics Configuration & Validation Ledger</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Active Constraints */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
              Operational Limits & Specifications
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-medium">Picker Cart Tote Capacity</label>
                <select
                  value={config.maxTotesPerCart}
                  onChange={e => onUpdateConfig({ maxTotesPerCart: parseInt(e.target.value, 10) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value={3}>3 Totes / Cart</option>
                  <option value={4}>4 Totes / Cart</option>
                  <option value={5}>5 Totes / Cart (Store Default)</option>
                  <option value={6}>6 Totes / Cart</option>
                  <option value={8}>8 Totes / Cart</option>
                </select>
                <p className="text-[10px] text-slate-500">Configurable to match Superstore cart fleet.</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-medium">Tote Working Envelope</label>
                <div className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono">
                  23.5" × 14" × 11" (3,600 cu in)
                </div>
                <p className="text-[10px] text-slate-500">Internal base working volume per tote.</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-medium">Tote Safety Weight Limit</label>
                <div className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono">
                  {config.toteMaxWeightLb} lb
                </div>
                <p className="text-[10px] text-slate-500">Max operating limit before ergonomic / structural split.</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-medium">Cessna 208 Payload Allowance</label>
                <div className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono">
                  {config.cessnaMaxPayloadLb} lb (CYQN ➔ CYWP)
                </div>
                <p className="text-[10px] text-slate-500">Includes 1,046 lb fuel for 389 mi roundtrip.</p>
              </div>
            </div>
          </div>

          {/* Live Validation Ledger */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                System Health & Audit Rules
              </h4>
              <span className="text-xs text-slate-500 font-mono">
                {issues.length} audit entries
              </span>
            </div>

            {issues.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/80 text-emerald-300 text-xs flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>All operational constraints satisfied. No order splits across carts, no flight payload overages.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {errors.map((err, i) => (
                  <div key={i} className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-start space-x-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                    <div>
                      <strong className="font-mono text-rose-200">[{err.code}]:</strong> {err.message}
                    </div>
                  </div>
                ))}
                {warnings.map((warn, i) => (
                  <div key={i} className="p-3 rounded-xl bg-amber-950/40 border border-amber-800 text-amber-300 text-xs flex items-start space-x-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                    <div>
                      <strong className="font-mono text-amber-200">[{warn.code}]:</strong> {warn.message}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
