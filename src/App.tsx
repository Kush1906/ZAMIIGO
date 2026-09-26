import React, { useState, useEffect } from 'react';
import { PlanState, OrderStatus, PlanConfig } from './lib/types';
import { parseOrdersCsv } from './lib/importCsv';
import { buildPlanFromItems, moveToteToCart, updateOrderStatus } from './lib/buildPlan';
import { DepartureScheduleDef } from './lib/flightPlanning';
import { Header } from './components/Header';
import { OrderEntryTab } from './components/tabs/OrderEntryTab';
import { OrderPickingTab } from './components/tabs/OrderPickingTab';
import { FlightPlannerTab } from './components/tabs/FlightPlannerTab';
import { CsvUploadModal } from './components/CsvUploadModal';
import { HandheldPickerModal } from './components/HandheldPickerModal';
import { SettingsModal } from './components/SettingsModal';
import { Loader2 } from 'lucide-react';

export const App: React.FC = () => {
  const [planState, setPlanState] = useState<PlanState | null>(null);
  const [activeTab, setActiveTab] = useState<'entry' | 'picking' | 'flight'>('entry');
  const [loading, setLoading] = useState<boolean>(true);

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isHandheldOpen, setIsHandheldOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [customSchedules, setCustomSchedules] = useState<DepartureScheduleDef[] | undefined>();

  // Load dataset
  const loadDataset = async (stage: 'stage1' | 'stage2') => {
    setLoading(true);
    setCustomSchedules(undefined);
    try {
      const csvPath = stage === 'stage1' ? '/data/stage1_orders.csv' : '/data/stage2_orders.csv';
      const response = await fetch(csvPath);
      const csvText = await response.text();
      const parseResult = parseOrdersCsv(csvText);

      if (parseResult.success && parseResult.items.length > 0) {
        const plan = buildPlanFromItems(parseResult.items, stage);
        setPlanState(plan);
      } else {
        console.error('Failed to parse dataset:', parseResult.errors);
      }
    } catch (err) {
      console.error('Error loading dataset:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial load: Stage 1 Base Case
    loadDataset('stage1');
  }, []);

  const handleApplyCustomCsv = (csvText: string, schedules?: DepartureScheduleDef[]) => {
    setCustomSchedules(schedules);
    const parseResult = parseOrdersCsv(csvText);
    if (parseResult.success && parseResult.items.length > 0) {
      const plan = buildPlanFromItems(parseResult.items, 'custom', undefined, schedules);
      setPlanState(plan);
    }
  };

  const handleMoveToteToCart = (toteId: string, targetCartId: string): { error?: string } => {
    if (!planState) return {};
    const res = moveToteToCart(planState, toteId, targetCartId);
    if (res.error) {
      return { error: res.error };
    }
    setPlanState(res.newState);
    return {};
  };

  const handleUpdateOrderStatus = (orderId: string, status: OrderStatus) => {
    if (!planState) return;
    const newState = updateOrderStatus(planState, orderId, status);
    setPlanState(newState);
  };

  const handleUpdateConfig = (newConfigPartial: Partial<PlanConfig>) => {
    if (!planState) return;
    const mergedConfig = { ...planState.config, ...newConfigPartial };
    const rebuilt = buildPlanFromItems(
      planState.rawItems,
      planState.activeStage,
      mergedConfig,
      planState.activeStage === 'custom' ? customSchedules : undefined
    );
    setPlanState(rebuilt);
  };

  if (loading || !planState) {
    return (
      <div className="min-h-screen bg-zamiigo-ice-canvas flex flex-col items-center justify-center space-y-6">
        <Loader2 className="h-10 w-10 text-zamiigo-teal animate-spin" />
        <div className="text-slate-500 font-sans font-medium text-sm tracking-widest uppercase">
          Loading Zamiigo Cargo Engine...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zamiigo-ice-canvas text-slate-900 flex flex-col selection:bg-zamiigo-amber/30">
      
      {/* Persistent Navigation Header */}
      <Header
        state={planState}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSelectStage={loadDataset}
        onOpenUpload={() => setIsUploadOpen(true)}
        onToggleHandheld={() => setIsHandheldOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'entry' && (
          <OrderEntryTab state={planState} onUpdateStatus={handleUpdateOrderStatus} />
        )}

        {activeTab === 'picking' && (
          <OrderPickingTab
            state={planState}
            onMoveToteToCart={handleMoveToteToCart}
            onOpenHandheld={() => setIsHandheldOpen(true)}
            onUpdateCartToteLimit={limit => handleUpdateConfig({ maxTotesPerCart: limit })}
          />
        )}

        {activeTab === 'flight' && (
          <FlightPlannerTab state={planState} />
        )}
      </main>

      {/* Interactive Modals */}
      <CsvUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onApplyCsv={handleApplyCustomCsv}
      />

      <HandheldPickerModal
        isOpen={isHandheldOpen}
        onClose={() => setIsHandheldOpen(false)}
        state={planState}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        state={planState}
        onUpdateConfig={handleUpdateConfig}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500 no-print mt-auto shadow-sm">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-medium text-slate-700">Wilderness North & Zamiigo Northern Community Logistics Engine</span>
          <span className="font-mono text-[11px] text-slate-400">
            Route: Nakina (CYQN) ➔ Webequie (CYWP) | Cessna 208 Caravan
          </span>
        </div>
      </footer>

    </div>
  );
};

export default App;
