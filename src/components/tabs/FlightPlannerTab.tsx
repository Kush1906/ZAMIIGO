import React, { useState } from 'react';
import { PlanState, FlightDeparture, Tote } from '../../lib/types';
import { generateDispatchBrief, DispatchBriefResponse } from '../../lib/geminiAssistant';
import { Plane, AlertTriangle, ArrowRight, Printer, Sparkles, Scale, Box } from 'lucide-react';

interface FlightPlannerTabProps {
  state: PlanState;
}

export const FlightPlannerTab: React.FC<FlightPlannerTabProps> = ({ state }) => {
  const [selectedDepId, setSelectedDepId] = useState<string>(state.departures[0]?.departure_id || 'DEP-01');
  const [aiBrief, setAiBrief] = useState<DispatchBriefResponse | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const selectedDep: FlightDeparture = state.departures.find(d => d.departure_id === selectedDepId) || state.departures[0];

  // Totes assigned to this flight
  const flightTotes: Tote[] = state.totes.filter(t => selectedDep.assigned_tote_ids.includes(t.tote_id));

  // Orders rolled over from this flight or currently deferred
  const rolledOverOrders = state.orders.filter(o => selectedDep.rolled_over_order_ids.includes(o.order_id));

  const handleGenerateBrief = async () => {
    setIsGeneratingAi(true);
    try {
      const res = await generateDispatchBrief(state, selectedDep);
      setAiBrief(res);
    } catch (err) {
      console.error('Error generating dispatch brief', err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handlePrintManifest = () => {
    window.print();
  };

  const remainingPayloadLb = Math.max(0, Math.round((selectedDep.available_payload_lb - selectedDep.total_weight_lb) * 10) / 10);
  const remainingVolumeCuFt = Math.max(0, Math.round((selectedDep.available_volume_cuft - selectedDep.total_volume_cuft) * 10) / 10);
  const remainingToteSlots = Math.max(0, selectedDep.available_totes - selectedDep.total_totes_count);

  return (
    <div className="space-y-6">

      {/* Top Banner & Multi-Flight Selector */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Cessna 208 Caravan Flight Load Planner</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                CYQN ➔ CYWP
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Calculates payload weight balance and cargo hold space for Nakina to Webequie freight runs. In Stage 2, handles partial aircraft availability across multiple scheduled departures and tracks order rollovers.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleGenerateBrief}
              disabled={isGeneratingAi}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-slate-900 text-xs font-semibold shadow-sm transition disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              <span>{isGeneratingAi ? 'Synthesizing with Gemini...' : 'AI Dispatch Brief'}</span>
            </button>
            <button
              onClick={handlePrintManifest}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-semibold transition"
            >
              <Printer className="h-4 w-4" />
              <span>Print Flight Manifest</span>
            </button>
          </div>
        </div>

        {/* Departure Flight Selector Tabs */}
        <div className="flex items-center space-x-3 mt-5 overflow-x-auto pb-1">
          {state.departures.map(dep => (
            <button
              key={dep.departure_id}
              onClick={() => { setSelectedDepId(dep.departure_id); setAiBrief(null); }}
              className={`p-3 rounded-xl border text-left min-w-[210px] transition-all ${
                selectedDep.departure_id === dep.departure_id
                  ? 'border-zamiigo-teal bg-zamiigo-ice/40 ring-1 ring-zamiigo-teal'
                  : 'border-slate-200 bg-slate-50 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900 font-mono">{dep.departure_id}</span>
                <span className="text-slate-400 font-mono">{dep.departure_date}</span>
              </div>
              <div className="mt-1 text-xs text-slate-700">
                {dep.total_totes_count} / {dep.available_totes} totes | {dep.total_weight_lb} lb
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px]">
                <span className={`font-semibold ${
                  dep.binding_constraint === 'NONE' ? 'text-slate-400' : 'text-amber-600'
                }`}>
                  Binding: {dep.binding_constraint}
                </span>
                {dep.rolled_over_order_ids.length > 0 && (
                  <span className="text-amber-600 font-medium">
                    {dep.rolled_over_order_ids.length} Rolled Over
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Schedule Notice Banner */}
      {state.customScheduleError && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start space-x-3 text-xs text-amber-800">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="font-semibold text-amber-900 font-mono">Custom Schedule Configuration Notice</strong>
            <p className="text-amber-700 leading-relaxed">{state.customScheduleError}</p>
          </div>
        </div>
      )}

      {/* Unscheduled Orders Banner (Orders exceeding all available departures) */}
      {(() => {
        const unassignedOrders = state.orders.filter(o => !o.assigned_flight_id);
        if (unassignedOrders.length === 0) return null;
        return (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start space-x-3 text-xs text-rose-800">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="font-semibold text-rose-900 font-mono">
                {unassignedOrders.length} Household Order{unassignedOrders.length > 1 ? 's' : ''} Awaiting Charter Flight
              </strong>
              <p className="text-rose-700 leading-relaxed">
                These orders could not be accommodated across the scheduled flight departures due to binding payload or tote constraints. They are preserved in the order ledger with status &quot;Awaiting future charter&quot;.
              </p>
            </div>
          </div>
        );
      })()}

      {/* Flight Capacity KPIs & Binding Constraint Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Payload KPI */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Aircraft Payload</span>
            <Scale className="h-4 w-4 text-zamiigo-teal" />
          </div>
          <div className="mt-2 flex items-baseline justify-between font-mono">
            <span className="text-2xl font-bold text-slate-900">{selectedDep.total_weight_lb}</span>
            <span className="text-xs text-slate-400">/ {selectedDep.available_payload_lb} lb</span>
          </div>
          <div className="w-full bg-slate-50 rounded-full h-2 mt-2 overflow-hidden border border-slate-200">
            <div
              className={`h-full rounded-full ${
                selectedDep.payload_utilization_pct > 95 ? 'bg-amber-500' : 'bg-zamiigo-teal'
              }`}
              style={{ width: `${Math.min(100, selectedDep.payload_utilization_pct)}%` }}
            />
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between font-mono">
            <span>Utilization: <strong>{selectedDep.payload_utilization_pct}%</strong></span>
            <span>Margin: <strong className="text-emerald-600">{remainingPayloadLb} lb</strong></span>
          </div>
        </div>

        {/* Tote Slots KPI */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Tote Slots</span>
            <Box className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between font-mono">
            <span className="text-2xl font-bold text-slate-900">{selectedDep.total_totes_count}</span>
            <span className="text-xs text-slate-400">/ {selectedDep.available_totes} slots</span>
          </div>
          <div className="w-full bg-slate-50 rounded-full h-2 mt-2 overflow-hidden border border-slate-200">
            <div
              className={`h-full rounded-full ${
                selectedDep.tote_utilization_pct >= 100 ? 'bg-purple-500' : 'bg-zamiigo-teal'
              }`}
              style={{ width: `${Math.min(100, selectedDep.tote_utilization_pct)}%` }}
            />
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between font-mono">
            <span>Utilization: <strong>{selectedDep.tote_utilization_pct}%</strong></span>
            <span>Slots Left: <strong className="text-emerald-600">{remainingToteSlots}</strong></span>
          </div>
        </div>

        {/* Cargo Volume KPI */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Cargo Space</span>
            <Plane className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between font-mono">
            <span className="text-2xl font-bold text-slate-900">{selectedDep.total_volume_cuft}</span>
            <span className="text-xs text-slate-400">/ {selectedDep.available_volume_cuft} cu ft</span>
          </div>
          <div className="w-full bg-slate-50 rounded-full h-2 mt-2 overflow-hidden border border-slate-200">
            <div
              className="h-full rounded-full bg-cyan-500"
              style={{ width: `${Math.min(100, selectedDep.volume_utilization_pct)}%` }}
            />
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between font-mono">
            <span>Space Used: <strong>{selectedDep.volume_utilization_pct}%</strong></span>
            <span>Space Left: <strong className="text-emerald-600">{remainingVolumeCuFt} cu ft</strong></span>
          </div>
        </div>

        {/* Binding Constraint Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <span className="text-xs text-slate-400">Active Binding Constraint</span>
            <div className="mt-2 font-mono font-extrabold text-lg text-amber-600 flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <span>{selectedDep.binding_constraint}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {selectedDep.binding_constraint === 'TOTE_SLOTS' && 'Maximum tote slot ceiling reached before weight or volumetric limits.'}
              {selectedDep.binding_constraint === 'WEIGHT' && 'Maximum allowable payload weight (lb) reached for Nakina-Webequie fuel profile.'}
              {selectedDep.binding_constraint === 'SPACE' && 'Volumetric hold capacity reached.'}
              {selectedDep.binding_constraint === 'NONE' && 'All available orders fit within structural and volumetric limits.'}
            </p>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-200 text-[10px] text-slate-400 font-mono">
            Avg Tote Weight: {selectedDep.total_totes_count > 0 ? (selectedDep.total_weight_lb / selectedDep.total_totes_count).toFixed(1) : 0} lb
          </div>
        </div>
      </div>

      {/* AI Dispatch Briefing Output Box (if generated) */}
      {aiBrief && (
        <div className="bg-white/90 border border-zamiigo-teal/20/80 rounded-2xl p-5 shadow-lg relative">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-4 w-4 text-zamiigo-teal" />
              <h3 className="font-bold text-slate-900 text-sm">
                AI Dispatcher & Operational Briefing ({selectedDep.departure_id})
              </h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono border ${
                aiBrief.source === 'gemini'
                  ? 'bg-zamiigo-ice text-sky-300 border-zamiigo-teal/20'
                  : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}>
                {aiBrief.source === 'gemini' ? `Google Gemini (${aiBrief.requestsRemaining ?? '?'} quota left)` : 'Deterministic Operations Engine'}
              </span>
            </div>
            <button
              onClick={() => setAiBrief(null)}
              className="text-xs text-slate-400 hover:text-slate-900"
            >
              Dismiss
            </button>
          </div>
          <div className="text-xs text-slate-700 whitespace-pre-line leading-relaxed font-sans">
            {aiBrief.briefMarkdown}
          </div>
        </div>
      )}

      {/* Schematic Cabin Grid & Tote Load Visualization */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-slate-900 text-sm font-mono">
                Cessna 208 Caravan Cabin Cargo Layout (Schematic)
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-400 font-mono">
                Estimate
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Cabin dimensions: 64" W × 54" H × 12.5' L. Modeled as empty freighter with 90-tote stacked ceiling.
            </p>
          </div>
          <div className="text-[11px] text-amber-600/90 font-mono">
            * Schematic Layout Estimate (Non-certified loading configuration)
          </div>
        </div>

        {/* Visual 90-Slot Cargo Hold Representation */}
        <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-mono">
            <span>FORWARD (Cockpit Bulkhead)</span>
            <span>AFT (Cargo Door 50"×49")</span>
          </div>

          {/* Grid representing stacks */}
          <div className="grid grid-cols-10 gap-1.5 sm:gap-2">
            {Array.from({ length: selectedDep.available_totes }).map((_, idx) => {
              const tote = flightTotes[idx];
              const isFilled = !!tote;

              return (
                <div
                  key={idx}
                  className={`h-12 rounded-lg border flex flex-col items-center justify-center transition-all ${
                    isFilled
                      ? tote.volume_fill_pct > 90
                        ? 'bg-amber-50/80 border-amber-700 text-amber-200'
                        : 'bg-zamiigo-ice/80 border-sky-700 text-sky-200'
                      : 'bg-white/40 border-slate-200/80 text-slate-600'
                  }`}
                  title={isFilled ? `${tote.tote_code}: ${tote.total_weight_lb} lb (${tote.volume_fill_pct}% vol)` : `Empty Slot #${idx + 1}`}
                >
                  {isFilled ? (
                    <>
                      <span className="text-[10px] font-mono font-bold">{tote.tote_code.replace('TOTE-', 'T')}</span>
                      <span className="text-[9px] text-slate-400 font-mono">{tote.total_weight_lb}lb</span>
                    </>
                  ) : (
                    <span className="text-[9px] font-mono text-slate-700">{idx + 1}</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-200/60">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1.5">
                <div className="w-3 h-3 rounded bg-zamiigo-ice border border-sky-700" />
                <span>Standard Tote</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="w-3 h-3 rounded bg-amber-50 border border-amber-700" />
                <span>Heavy/High-Fill Tote</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="w-3 h-3 rounded bg-white/40 border border-slate-200" />
                <span>Unused Slot</span>
              </div>
            </div>
            <span>Aircraft Model: Cessna 208 Caravan 675</span>
          </div>
        </div>
      </div>

      {/* Stage 2 Rollover Management Table */}
      {selectedDep.rolled_over_order_ids.length > 0 && (
        <div className="bg-white border border-amber-200/60 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 bg-amber-50/30 border-b border-amber-200/60 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <h3 className="font-bold text-amber-200 text-sm font-mono">
                Stage 2 Rollover Ledger ({selectedDep.rolled_over_order_ids.length} Orders Deferred)
              </h3>
            </div>
            <span className="text-xs text-amber-700 font-mono">
              Binding Constraint: {selectedDep.binding_constraint}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 font-mono uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Household & Order ID</th>
                  <th className="py-2.5 px-4">Order Date</th>
                  <th className="py-2.5 px-4">Weight & Volume</th>
                  <th className="py-2.5 px-4">Item Count</th>
                  <th className="py-2.5 px-4">Rollover Rationale</th>
                  <th className="py-2.5 px-4">Next Flight Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-sans">
                {rolledOverOrders.map(order => (
                  <tr key={order.order_id} className="hover:bg-slate-100/40">
                    <td className="py-3 px-4 font-mono font-bold text-zamiigo-teal">
                      HH #{order.household_id} <span className="text-xs font-normal text-slate-400">(Order #{order.order_id})</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">{order.order_date}</td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {order.total_weight_lb} lb | {order.total_volume_cuin} cu in
                    </td>
                    <td className="py-3 px-4 text-slate-700">{order.item_count} items</td>
                    <td className="py-3 px-4 text-amber-700">
                      {order.rollover_reason || 'Exceeded flight capacity limit'}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-emerald-600 flex items-center space-x-1">
                      <span>Rolls to Next Departure</span>
                      <ArrowRight className="h-3 w-3" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Proposed Flight Manifest (Print Ready) */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm font-mono">
              Proposed Cargo Flight Manifest: {selectedDep.departure_id}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Draft load sheet — requires pilot and ground crew verification before dispatch.
            </p>
          </div>
          <button
            onClick={handlePrintManifest}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Manifest</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 font-mono uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Tote Code</th>
                <th className="py-3 px-4">Contained Household Orders</th>
                <th className="py-3 px-4">Items Count</th>
                <th className="py-3 px-4">Total Weight (lb)</th>
                <th className="py-3 px-4">Estimated Volume</th>
                <th className="py-3 px-4">Assigned Cart</th>
                <th className="py-3 px-4">Destination</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-sans">
              {flightTotes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No totes assigned to this flight departure.
                  </td>
                </tr>
              ) : (
                flightTotes.map(tote => (
                  <tr key={tote.tote_id} className="hover:bg-slate-100/40">
                    <td className="py-3 px-4 font-mono font-bold text-zamiigo-teal">
                      {tote.tote_code}
                      {tote.is_oversized_split && (
                        <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-sans">
                          Part {tote.split_part_index}/{tote.split_total_parts}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-800">
                      {tote.assigned_household_ids.map(h => `Household #${h}`).join(', ')}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{tote.items.length} items</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-100">{tote.total_weight_lb} lb</td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {tote.volume_fill_pct}% ({tote.total_volume_cuin} cu in)
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">{tote.assigned_cart_id || 'Pending Cart'}</td>
                    <td className="py-3 px-4 text-emerald-600 font-semibold">Webequie (CYWP)</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-slate-50 font-mono font-bold text-xs border-t border-slate-200 text-slate-800">
              <tr>
                <td className="py-3 px-4">TOTALS:</td>
                <td className="py-3 px-4">{selectedDep.assigned_order_ids.length} Orders</td>
                <td className="py-3 px-4">{flightTotes.reduce((sum, t) => sum + t.items.length, 0)} Items</td>
                <td className="py-3 px-4 text-zamiigo-teal">{selectedDep.total_weight_lb} lb</td>
                <td className="py-3 px-4 text-cyan-400">{selectedDep.total_volume_cuft} cu ft</td>
                <td colSpan={2} className="py-3 px-4 text-right text-emerald-600">
                  {flightTotes.length} Totes Dispatched
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

    </div>
  );
};
