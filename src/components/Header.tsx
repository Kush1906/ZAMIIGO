import React from 'react';
import { Plane, Package, ShoppingCart, AlertTriangle, CheckCircle, Upload, Smartphone, Sliders } from 'lucide-react';
import { PlanState } from '../lib/types';

interface HeaderProps {
  state: PlanState;
  activeTab: 'entry' | 'picking' | 'flight';
  setActiveTab: (tab: 'entry' | 'picking' | 'flight') => void;
  onSelectStage: (stage: 'stage1' | 'stage2' | 'bonus') => void;
  onOpenUpload: () => void;
  onToggleHandheld: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  state,
  activeTab,
  setActiveTab,
  onSelectStage,
  onOpenUpload,
  onToggleHandheld,
  onOpenSettings,
}) => {
  const errorCount = state.issues.filter(i => i.type === 'ERROR').length;
  const warningCount = state.issues.filter(i => i.type === 'WARNING').length;

  return (
    <header className="border-b border-slate-200 bg-zamiigo-teal sticky top-0 z-40 no-print shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          
          {/* Logo & Operational Route */}
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-lg">
              <Plane className="h-6 w-6 text-zamiigo-teal transform -rotate-45" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-2xl tracking-tight text-slate-900">
                  ZAMIIGO CARGO OPS
                </span>
                <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-white/20 text-slate-900 border border-white/30">
                  Wilderness North
                </span>
              </div>
              <div className="text-xs text-zamiigo-ice flex items-center space-x-1 font-mono mt-0.5">
                <span>CYQN (Nakina)</span>
                <span>➔</span>
                <span className="text-zamiigo-amber font-medium">
                  {state.activeStage === 'bonus' ? 'CYWP / CJV7 / CYLH (3 Hubs)' : 'CYWP (Webequie)'}
                </span>
                <span className="text-slate-900/40">|</span>
                <span className="text-slate-900/80">Cessna 208 Caravan</span>
              </div>
            </div>
          </div>

          {/* Dataset Stage Switcher */}
          <div className="hidden md:flex items-center bg-zamiigo-teal-dark p-1.5 rounded-xl border border-white/10 shadow-inner">
            <button
              onClick={() => onSelectStage('stage1')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                state.activeStage === 'stage1'
                  ? 'bg-white text-zamiigo-teal shadow-sm'
                  : 'text-slate-900/70 hover:text-slate-900 hover:bg-white/10'
              }`}
            >
              Stage 1 (30 Orders Base)
            </button>
            <button
              onClick={() => onSelectStage('stage2')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                state.activeStage === 'stage2'
                  ? 'bg-white text-zamiigo-teal shadow-sm'
                  : 'text-slate-900/70 hover:text-slate-900 hover:bg-white/10'
              }`}
            >
              Stage 2 (120 Orders Multi-Day)
            </button>
            <button
              onClick={() => onSelectStage('bonus')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                state.activeStage === 'bonus'
                  ? 'bg-amber-400 text-slate-900 shadow-sm font-bold'
                  : 'text-slate-900/70 hover:text-slate-900 hover:bg-white/10'
              }`}
            >
              Bonus (3 Communities)
            </button>
            <div className="w-px h-4 bg-white/20 mx-2"></div>
            <button
              onClick={onOpenUpload}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                state.activeStage === 'custom'
                  ? 'bg-zamiigo-amber text-zamiigo-teal-dark shadow-sm'
                  : 'text-zamiigo-amber hover:bg-white/10'
              }`}
              title="Upload judge's unseen CSV file"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Upload CSV</span>
            </button>
          </div>

          {/* Quick Action Tools: Handheld Mode, Config, Status */}
          <div className="flex items-center space-x-3">
            {/* Live System Health Badge */}
            <div className="flex items-center">
              {errorCount === 0 && warningCount === 0 ? (
                <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-700 text-xs font-bold shadow-sm">
                  <CheckCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">System Healthy</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-200 text-xs font-bold shadow-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{errorCount} err, {warningCount} warn</span>
                </div>
              )}
            </div>

            {/* Handheld Picker Simulation Button */}
            <button
              onClick={onToggleHandheld}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-900 border border-white/20 transition shadow-sm"
              title="Open Mobile Handheld Scanner View"
            >
              <Smartphone className="h-4 w-4" />
            </button>

            {/* Settings Button */}
            <button
              onClick={onOpenSettings}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-900 border border-white/20 transition shadow-sm"
              title="Adjust Parameters (Totes per Cart, limits)"
            >
              <Sliders className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 3 Connected Tabs Navigation */}
        <div className="flex space-x-1 -mb-px mt-2">
          <button
            onClick={() => setActiveTab('entry')}
            className={`flex items-center space-x-2 py-3 px-5 text-sm font-bold border-b-[3px] transition-all rounded-t-lg ${
              activeTab === 'entry'
                ? 'border-zamiigo-amber text-zamiigo-amber bg-white/10'
                : 'border-transparent text-slate-900/70 hover:text-slate-900 hover:bg-white/5'
            }`}
          >
            <ShoppingCart className="h-4 w-4" />
            <span>1. Order Entry & Retailer Staging</span>
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-zamiigo-teal-dark text-slate-900/90 font-mono shadow-inner">
              {state.orders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('picking')}
            className={`flex items-center space-x-2 py-3 px-5 text-sm font-bold border-b-[3px] transition-all rounded-t-lg ${
              activeTab === 'picking'
                ? 'border-zamiigo-amber text-zamiigo-amber bg-white/10'
                : 'border-transparent text-slate-900/70 hover:text-slate-900 hover:bg-white/5'
            }`}
          >
            <Package className="h-4 w-4" />
            <span>2. Order Picking & Totes</span>
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-zamiigo-teal-dark text-slate-900/90 font-mono shadow-inner">
              {state.totes.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('flight')}
            className={`flex items-center space-x-2 py-3 px-5 text-sm font-bold border-b-[3px] transition-all rounded-t-lg ${
              activeTab === 'flight'
                ? 'border-zamiigo-amber text-zamiigo-amber bg-white/10'
                : 'border-transparent text-slate-900/70 hover:text-slate-900 hover:bg-white/5'
            }`}
          >
            <Plane className="h-4 w-4" />
            <span>3. Flight Management</span>
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-zamiigo-teal-dark text-slate-900/90 font-mono shadow-inner">
              {state.departures.length}
            </span>
          </button>
        </div>

      </div>
    </header>
  );
};
