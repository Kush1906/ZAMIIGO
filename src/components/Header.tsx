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
    <header className="glass-header sticky top-0 z-40 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-24 gap-4">
          
          {/* Logo & Operational Route */}
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-zamiigo-amber to-amber-600 flex items-center justify-center shadow-lg shadow-zamiigo-amber/20">
              <Plane className="h-7 w-7 text-white transform -rotate-45" />
            </div>
            <div>
              <div className="flex items-center space-x-3 mb-1">
                <span className="font-extrabold text-2xl tracking-tight text-white drop-shadow-sm">
                  ZAMIIGO CARGO OPS
                </span>
                <span className="text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full bg-white/10 text-white border border-white/20 backdrop-blur-md">
                  Wilderness North
                </span>
              </div>
              <div className="text-xs text-zamiigo-ice/80 flex items-center space-x-1.5 font-mono">
                <span className="bg-black/20 px-1.5 py-0.5 rounded text-white border border-white/5">CYQN (Nakina)</span>
                <span className="text-zamiigo-amber/70">➔</span>
                <span className="bg-zamiigo-amber/10 text-zamiigo-amber font-semibold px-1.5 py-0.5 rounded border border-zamiigo-amber/20">
                  {state.activeStage === 'bonus' ? 'CYWP / CJV7 / CYLH (3 Hubs)' : 'CYWP (Webequie)'}
                </span>
                <span className="text-white/20">|</span>
                <span className="text-white/60">Cessna 208 Caravan</span>
              </div>
            </div>
          </div>

          {/* Dataset Stage Switcher */}
          <div className="hidden lg:flex items-center bg-black/20 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md shadow-inner">
            <button
              onClick={() => onSelectStage('stage1')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300 ${
                state.activeStage === 'stage1'
                  ? 'bg-white text-zamiigo-teal-dark shadow-md scale-95'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Stage 1 (30 Orders)
            </button>
            <button
              onClick={() => onSelectStage('stage2')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300 ${
                state.activeStage === 'stage2'
                  ? 'bg-white text-zamiigo-teal-dark shadow-md scale-95'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Stage 2 (120 Orders)
            </button>
            <button
              onClick={() => onSelectStage('bonus')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300 ${
                state.activeStage === 'bonus'
                  ? 'bg-white text-zamiigo-teal-dark shadow-md scale-95'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Bonus (3 Communities)
            </button>
            <div className="w-px h-5 bg-white/10 mx-2"></div>
            <button
              onClick={onOpenUpload}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all duration-300 ${
                state.activeStage === 'custom'
                  ? 'bg-gradient-to-r from-zamiigo-amber to-amber-500 text-white shadow-md scale-95'
                  : 'text-zamiigo-amber hover:bg-white/10'
              }`}
              title="Upload judge's unseen CSV file"
            >
              <Upload className="h-4 w-4" />
              <span>Upload CSV</span>
            </button>
          </div>

          {/* Quick Action Tools: Handheld Mode, Config, Status */}
          <div className="flex items-center space-x-4">
            {/* Live System Health Badge */}
            <div className="flex items-center">
              {errorCount === 0 && warningCount === 0 ? (
                <div className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold backdrop-blur-md shadow-sm">
                  <CheckCircle className="h-4 w-4" />
                  <span className="hidden xl:inline">System Healthy</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-bold backdrop-blur-md shadow-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{errorCount} err, {warningCount} warn</span>
                </div>
              )}
            </div>

            <div className="flex space-x-2">
              {/* Handheld Picker Simulation Button */}
              <button
                onClick={onToggleHandheld}
                className="p-3 rounded-xl bg-white/5 hover:bg-white/15 text-white border border-white/10 transition-all duration-300 shadow-sm hover:shadow-md hover:scale-105"
                title="Open Mobile Handheld Scanner View"
              >
                <Smartphone className="h-4 w-4" />
              </button>

              {/* Settings Button */}
              <button
                onClick={onOpenSettings}
                className="p-3 rounded-xl bg-white/5 hover:bg-white/15 text-white border border-white/10 transition-all duration-300 shadow-sm hover:shadow-md hover:scale-105"
                title="Adjust Parameters (Totes per Cart, limits)"
              >
                <Sliders className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 3 Connected Tabs Navigation */}
        <div className="flex space-x-2 -mb-px mt-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('entry')}
            className={`group flex items-center space-x-3 py-3.5 px-6 text-sm font-bold border-b-[3px] transition-all duration-300 rounded-t-xl ${
              activeTab === 'entry'
                ? 'border-zamiigo-amber text-zamiigo-amber bg-white/10 backdrop-blur-md'
                : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <ShoppingCart className={`h-4 w-4 transition-transform ${activeTab === 'entry' ? 'scale-110' : 'group-hover:scale-110'}`} />
            <span className="whitespace-nowrap">Order Staging</span>
            <span className={`ml-2 px-2.5 py-0.5 text-xs rounded-full font-mono shadow-inner transition-colors ${activeTab === 'entry' ? 'bg-zamiigo-amber/20 text-zamiigo-amber' : 'bg-black/30 text-white/80'}`}>
              {state.orders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('picking')}
            className={`group flex items-center space-x-3 py-3.5 px-6 text-sm font-bold border-b-[3px] transition-all duration-300 rounded-t-xl ${
              activeTab === 'picking'
                ? 'border-zamiigo-amber text-zamiigo-amber bg-white/10 backdrop-blur-md'
                : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Package className={`h-4 w-4 transition-transform ${activeTab === 'picking' ? 'scale-110' : 'group-hover:scale-110'}`} />
            <span className="whitespace-nowrap">Tote Fulfillment</span>
            <span className={`ml-2 px-2.5 py-0.5 text-xs rounded-full font-mono shadow-inner transition-colors ${activeTab === 'picking' ? 'bg-zamiigo-amber/20 text-zamiigo-amber' : 'bg-black/30 text-white/80'}`}>
              {state.totes.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('flight')}
            className={`group flex items-center space-x-3 py-3.5 px-6 text-sm font-bold border-b-[3px] transition-all duration-300 rounded-t-xl ${
              activeTab === 'flight'
                ? 'border-zamiigo-amber text-zamiigo-amber bg-white/10 backdrop-blur-md'
                : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Plane className={`h-4 w-4 transition-transform ${activeTab === 'flight' ? 'scale-110' : 'group-hover:scale-110'}`} />
            <span className="whitespace-nowrap">Flight Operations</span>
            <span className={`ml-2 px-2.5 py-0.5 text-xs rounded-full font-mono shadow-inner transition-colors ${activeTab === 'flight' ? 'bg-zamiigo-amber/20 text-zamiigo-amber' : 'bg-black/30 text-white/80'}`}>
              {state.departures.length}
            </span>
          </button>
        </div>

      </div>
    </header>
  );
};
