import React from 'react';
import { Plane, Package, ShoppingCart, AlertTriangle, CheckCircle, Upload, Smartphone, Sliders } from 'lucide-react';
import { PlanState } from '../lib/types';

interface HeaderProps {
  state: PlanState;
  activeTab: 'entry' | 'picking' | 'flight';
  setActiveTab: (tab: 'entry' | 'picking' | 'flight') => void;
  onSelectStage: (stage: 'stage1' | 'stage2' | 'bonus' | 'custom') => void;
  onOpenUpload: () => void;
  onToggleHandheld: () => void;
  onOpenSettings: () => void;
  hasCustomData: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  state,
  activeTab,
  setActiveTab,
  onSelectStage,
  onOpenUpload,
  onToggleHandheld,
  onOpenSettings,
  hasCustomData,
}) => {
  const errorCount = state.issues.filter(i => i.type === 'ERROR').length;
  const warningCount = state.issues.filter(i => i.type === 'WARNING').length;

  return (
    <header className="glass-header sticky top-0 z-40 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between py-4 gap-4 lg:gap-6">
          
          {/* Logo & Operational Route */}
          <div className="flex items-center space-x-4 shrink-0">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-zamiigo-amber to-amber-500 flex items-center justify-center shadow-[0_0_20px_rgba(255,182,0,0.4)] border border-white/20 transition-transform duration-500 hover:scale-105 hover:rotate-3 shrink-0">
              <Plane className="h-7 w-7 text-white transform -rotate-45 drop-shadow-md" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-3 mb-1">
                <span className="font-extrabold text-xl lg:text-2xl tracking-tight text-white drop-shadow-sm whitespace-nowrap">
                  ZAMIIGO CARGO OPS
                </span>
                <span className="hidden xl:inline-flex text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full bg-white/10 text-white border border-white/20 backdrop-blur-md whitespace-nowrap">
                  Wilderness North
                </span>
              </div>
              <div className="text-[11px] text-zamiigo-ice/80 flex items-center space-x-1.5 font-mono whitespace-nowrap overflow-hidden text-ellipsis">
                <span className="text-white/90">CYQN (Nakina)</span>
                <span className="text-zamiigo-amber/70">➔</span>
                <span className="text-zamiigo-amber font-semibold">
                  {state.activeStage === 'bonus' ? '3 Hubs (CYWP, CJV7, CYLH)' : 'CYWP (Webequie)'}
                </span>
                <span className="text-white/20">|</span>
                <span className="text-white/60 hidden sm:inline">Cessna 208 Caravan</span>
              </div>
            </div>
          </div>

          {/* Dataset Stage Switcher (Segmented Control) — Desktop */}
          <div className="hidden lg:flex items-center bg-black/30 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md shadow-inner shrink-0">
            <button
              onClick={() => onSelectStage('stage1')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300 whitespace-nowrap ${
                state.activeStage === 'stage1'
                  ? 'bg-white text-zamiigo-teal-dark shadow-md'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Stage 1
            </button>
            <button
              onClick={() => onSelectStage('stage2')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300 whitespace-nowrap ${
                state.activeStage === 'stage2'
                  ? 'bg-white text-zamiigo-teal-dark shadow-md'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Stage 2
            </button>
            <button
              onClick={() => onSelectStage('bonus')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300 whitespace-nowrap ${
                state.activeStage === 'bonus'
                  ? 'bg-gradient-to-r from-zamiigo-amber to-amber-500 text-slate-900 shadow-md'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Advanced Routing
            </button>
            {hasCustomData && (
              <button
                onClick={() => onSelectStage('custom')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300 whitespace-nowrap ${
                  state.activeStage === 'custom'
                    ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 text-slate-900 shadow-md'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                Custom Dataset
              </button>
            )}
          </div>

          {/* Dataset Stage Switcher — Mobile/Tablet Dropdown */}
          <div className="flex lg:hidden shrink-0">
            <select
              value={state.activeStage}
              onChange={(e) => onSelectStage(e.target.value as 'stage1' | 'stage2' | 'bonus')}
              className="bg-white/10 text-white text-xs font-semibold rounded-xl px-3 py-2 border border-white/20 focus:outline-none focus:ring-1 focus:ring-zamiigo-amber/50 backdrop-blur-md"
            >
              <option value="stage1" className="bg-zamiigo-teal-dark text-white">Stage 1</option>
              <option value="stage2" className="bg-zamiigo-teal-dark text-white">Stage 2</option>
              <option value="bonus" className="bg-zamiigo-teal-dark text-white">Bonus Round</option>
              {state.activeStage === 'custom' && <option value="custom" className="bg-zamiigo-teal-dark text-white">Custom CSV</option>}
            </select>
          </div>

          {/* Quick Action Tools */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            {/* Upload CSV — always visible */}
            <button
              onClick={onOpenUpload}
              className={`flex px-2.5 sm:px-3.5 py-2 rounded-xl text-xs font-bold items-center space-x-1.5 transition-all duration-300 ${
                state.activeStage === 'custom'
                  ? 'bg-gradient-to-r from-zamiigo-amber to-amber-400 text-slate-900 shadow-[0_0_15px_rgba(255,182,0,0.3)] border border-zamiigo-amber/50 scale-95'
                  : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
              }`}
              title="Upload custom CSV"
            >
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">CSV</span>
            </button>

            {/* Live System Health Badge */}
            <div className="flex items-center">
              {errorCount === 0 && warningCount === 0 ? (
                <div className="flex items-center space-x-1.5 px-2 sm:px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-bold backdrop-blur-md shadow-sm whitespace-nowrap">
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span className="hidden xl:inline">Healthy</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1.5 px-2 sm:px-3 py-2 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-300 text-[11px] font-bold backdrop-blur-md shadow-sm whitespace-nowrap">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>{errorCount} err, {warningCount} warn</span>
                </div>
              )}
            </div>

            <div className="flex space-x-1.5">
              {/* Handheld Picker Button */}
              <button
                onClick={onToggleHandheld}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white border border-white/10 transition-all duration-300 hover:scale-105 min-w-[36px]"
                title="Open Mobile Handheld Scanner View"
              >
                <Smartphone className="h-4 w-4" />
                <span className="text-[9px] mt-0.5 hidden sm:block">Scan</span>
              </button>

              {/* Settings Button */}
              <button
                onClick={onOpenSettings}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white border border-white/10 transition-all duration-300 hover:scale-105 min-w-[36px]"
                title="Adjust Parameters"
              >
                <Sliders className="h-4 w-4" />
                <span className="text-[9px] mt-0.5 hidden sm:block">Config</span>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 sm:space-x-2 -mb-px mt-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('entry')}
            className={`group relative flex items-center space-x-1.5 sm:space-x-3 py-3 sm:py-3.5 px-3 sm:px-6 text-xs sm:text-sm font-bold transition-all duration-300 rounded-t-xl overflow-hidden flex-shrink-0 ${
              activeTab === 'entry'
                ? 'text-zamiigo-amber bg-white/10 backdrop-blur-xl'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            {activeTab === 'entry' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-zamiigo-amber to-amber-300 shadow-[0_-2px_10px_rgba(255,182,0,0.5)]" />}
            <ShoppingCart className={`h-4 w-4 relative z-10 transition-transform duration-300 shrink-0 ${activeTab === 'entry' ? 'scale-110 drop-shadow-md' : 'group-hover:scale-110'}`} />
            <span className="whitespace-nowrap relative z-10">Order Staging</span>
            <span className={`relative z-10 px-2 py-0.5 text-xs rounded-full font-mono transition-colors shrink-0 ${activeTab === 'entry' ? 'bg-zamiigo-amber/20 text-zamiigo-amber shadow-[0_0_8px_rgba(255,182,0,0.3)] border border-zamiigo-amber/30' : 'bg-black/30 text-white/80 border border-white/5'}`}>
              {state.orders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('picking')}
            className={`group relative flex items-center space-x-1.5 sm:space-x-3 py-3 sm:py-3.5 px-3 sm:px-6 text-xs sm:text-sm font-bold transition-all duration-300 rounded-t-xl overflow-hidden flex-shrink-0 ${
              activeTab === 'picking'
                ? 'text-zamiigo-amber bg-white/10 backdrop-blur-xl'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            {activeTab === 'picking' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-zamiigo-amber to-amber-300 shadow-[0_-2px_10px_rgba(255,182,0,0.5)]" />}
            <Package className={`h-4 w-4 relative z-10 transition-transform duration-300 shrink-0 ${activeTab === 'picking' ? 'scale-110 drop-shadow-md' : 'group-hover:scale-110'}`} />
            <span className="whitespace-nowrap relative z-10">Tote Fulfillment</span>
            <span className={`relative z-10 px-2 py-0.5 text-xs rounded-full font-mono transition-colors shrink-0 ${activeTab === 'picking' ? 'bg-zamiigo-amber/20 text-zamiigo-amber shadow-[0_0_8px_rgba(255,182,0,0.3)] border border-zamiigo-amber/30' : 'bg-black/30 text-white/80 border border-white/5'}`}>
              {state.totes.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('flight')}
            className={`group relative flex items-center space-x-1.5 sm:space-x-3 py-3 sm:py-3.5 px-3 sm:px-6 text-xs sm:text-sm font-bold transition-all duration-300 rounded-t-xl overflow-hidden flex-shrink-0 ${
              activeTab === 'flight'
                ? 'text-zamiigo-amber bg-white/10 backdrop-blur-xl'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            {activeTab === 'flight' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-zamiigo-amber to-amber-300 shadow-[0_-2px_10px_rgba(255,182,0,0.5)]" />}
            <Plane className={`h-4 w-4 relative z-10 transition-transform duration-300 shrink-0 ${activeTab === 'flight' ? 'scale-110 drop-shadow-md' : 'group-hover:scale-110'}`} />
            <span className="whitespace-nowrap relative z-10">Flight Ops</span>
            <span className={`relative z-10 px-2 py-0.5 text-xs rounded-full font-mono transition-colors shrink-0 ${activeTab === 'flight' ? 'bg-zamiigo-amber/20 text-zamiigo-amber shadow-[0_0_8px_rgba(255,182,0,0.3)] border border-zamiigo-amber/30' : 'bg-black/30 text-white/80 border border-white/5'}`}>
              {state.departures.length}
            </span>
          </button>
        </div>

      </div>
    </header>
  );
};
