import React from 'react';
import { Plane, Package, ShoppingCart, AlertTriangle, CheckCircle, Upload, Smartphone, Sliders } from 'lucide-react';
import { PlanState } from '../lib/types';

interface HeaderProps {
  state: PlanState;
  activeTab: 'entry' | 'picking' | 'flight';
  setActiveTab: (tab: 'entry' | 'picking' | 'flight') => void;
  onSelectStage: (stage: 'stage1' | 'stage2') => void;
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
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Operational Route */}
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Plane className="h-5 w-5 text-white transform -rotate-45" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-sky-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">
                  ZAMIIGO CARGO OPS
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-sky-950/80 text-sky-400 border border-sky-800">
                  Wilderness North
                </span>
              </div>
              <div className="text-xs text-slate-400 flex items-center space-x-1 font-mono">
                <span>CYQN (Nakina)</span>
                <span>➔</span>
                <span className="text-emerald-400 font-medium">CYWP (Webequie)</span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-400">Cessna 208 Caravan</span>
              </div>
            </div>
          </div>

          {/* Dataset Stage Switcher */}
          <div className="hidden md:flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => onSelectStage('stage1')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                state.activeStage === 'stage1'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Stage 1 (30 Orders Base)
            </button>
            <button
              onClick={() => onSelectStage('stage2')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                state.activeStage === 'stage2'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Stage 2 (120 Orders Multi-Day)
            </button>
            <button
              onClick={onOpenUpload}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                state.activeStage === 'custom'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-amber-400'
              }`}
              title="Upload judge's unseen CSV file"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Upload CSV</span>
            </button>
          </div>

          {/* Quick Action Tools: Handheld Mode, Config, Status */}
          <div className="flex items-center space-x-2">
            {/* Live System Health Badge */}
            <div className="flex items-center">
              {errorCount === 0 && warningCount === 0 ? (
                <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 text-xs font-medium">
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Plan Valid</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-amber-950/60 border border-amber-800/80 text-amber-300 text-xs font-medium">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>{errorCount} errors, {warningCount} warns</span>
                </div>
              )}
            </div>

            {/* Handheld Picker Simulation Button */}
            <button
              onClick={onToggleHandheld}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 border border-slate-700 transition"
              title="Open Mobile Handheld Scanner View"
            >
              <Smartphone className="h-4 w-4" />
            </button>

            {/* Settings Button */}
            <button
              onClick={onOpenSettings}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
              title="Adjust Parameters (Totes per Cart, limits)"
            >
              <Sliders className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 3 Connected Tabs Navigation */}
        <div className="flex space-x-1 -mb-px">
          <button
            onClick={() => setActiveTab('entry')}
            className={`flex items-center space-x-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'entry'
                ? 'border-sky-500 text-sky-400 bg-sky-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <ShoppingCart className="h-4 w-4" />
            <span>1. Order Entry & Retailer Staging</span>
            <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-slate-800 text-slate-300 font-mono">
              {state.orders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('picking')}
            className={`flex items-center space-x-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'picking'
                ? 'border-sky-500 text-sky-400 bg-sky-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Package className="h-4 w-4" />
            <span>2. Order Picking & Totes</span>
            <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-slate-800 text-slate-300 font-mono">
              {state.totes.length} totes
            </span>
          </button>

          <button
            onClick={() => setActiveTab('flight')}
            className={`flex items-center space-x-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'flight'
                ? 'border-sky-500 text-sky-400 bg-sky-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Plane className="h-4 w-4" />
            <span>3. Flight Management</span>
            <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-slate-800 text-slate-300 font-mono">
              {state.departures.length} flights
            </span>
          </button>
        </div>

      </div>
    </header>
  );
};
