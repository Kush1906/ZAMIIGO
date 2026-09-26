import React, { useState, useMemo } from 'react';
import { PlanState, FlightDeparture, Tote } from '../../lib/types';
import { generateDispatchBrief, DispatchBriefResponse } from '../../lib/geminiAssistant';
import { Plane, AlertTriangle, ArrowRight, Printer, Sparkles, Scale, Box, CheckCircle2, ShieldCheck, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { analyzeCircuitVsDirect } from '../../lib/circuitAnalysis';

interface FlightPlannerTabProps {
  state: PlanState;
}

export const FlightPlannerTab: React.FC<FlightPlannerTabProps> = ({ state }) => {
  const [selectedDepId, setSelectedDepId] = useState<string>(state.departures[0]?.departure_id || 'DEP-01');
  const [aiBrief, setAiBrief] = useState<DispatchBriefResponse | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [showAssumptions, setShowAssumptions] = useState(false);

  const circuitComparison = useMemo(() => {
    return state.activeStage === 'bonus' ? analyzeCircuitVsDirect(state) : null;
  }, [state]);

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
      <div className="glass-panel rounded-3xl p-6">
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

      {/* Main Reactive Flight Data Area */}
      <div key={selectedDepId} className="space-y-6 animate-fade-in">
        {/* Custom Schedule Notice Banner */}
        {state.customScheduleError && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start space-x-3 text-xs text-amber-800 shadow-sm">
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

      {/* Bonus Objective: Multi-Community Route Payload & Triangular Flight Analysis */}
      {state.activeStage === 'bonus' && circuitComparison && (
        <div className="glass-panel rounded-3xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <h3 className="font-extrabold text-base tracking-tight text-slate-900 font-mono">
                Advanced Optimization: 3-Community Routing & Multi-Leg Circuit Analysis
              </h3>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> DYNAMIC FLIGHT OPTIMIZATION
            </span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            The advanced network simulation extends cargo ops from Webequie across three First Nations communities served from the Nakina Hub (CYQN). Each community route has a distinct maximum payload dictated by round-trip fuel requirements (Cessna 208 Caravan, 3,923 lb operational empty weight):
          </p>

          {/* Route payload reference cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs">
              <div className="font-bold text-amber-600 font-mono flex items-center justify-between">
                <span>Neskantaga (CYLH)</span>
                <span className="text-[10px] bg-amber-100 px-1.5 py-0.5 rounded text-amber-700">130 NM</span>
              </div>
              <div className="text-slate-500 text-[11px] mt-1 font-mono">299 mi RT | 1.96 hrs | 861 lb fuel</div>
              <div className="text-slate-800 font-mono font-bold mt-1 text-sm">3,062 lb Max Payload</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs">
              <div className="font-bold text-emerald-600 font-mono flex items-center justify-between">
                <span>Summer Beaver (CJV7)</span>
                <span className="text-[10px] bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-700">167 NM</span>
              </div>
              <div className="text-slate-500 text-[11px] mt-1 font-mono">384 mi RT | 2.46 hrs | 1,036 lb fuel</div>
              <div className="text-slate-800 font-mono font-bold mt-1 text-sm">2,887 lb Max Payload</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs">
              <div className="font-bold text-sky-600 font-mono flex items-center justify-between">
                <span>Webequie (CYWP)</span>
                <span className="text-[10px] bg-sky-100 px-1.5 py-0.5 rounded text-sky-700">169 NM</span>
              </div>
              <div className="text-slate-500 text-[11px] mt-1 font-mono">389 mi RT | 2.49 hrs | 1,046 lb fuel</div>
              <div className="text-slate-800 font-mono font-bold mt-1 text-sm">2,877 lb Max Payload</div>
            </div>
          </div>

          {/* Side-by-Side Comparison: Direct vs Circuit */}
          <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <div>
                <span className="text-xs font-mono font-bold text-amber-600 uppercase tracking-wider">
                  Sponsor Evaluation: 2 Separate Direct Flights vs. Single Multi-Leg Circuit
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Tests whether combining Neskantaga (CYLH) and Summer Beaver (CJV7) into a triangular round trip beats two separate flights.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 font-mono flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" /> {circuitComparison.verdict === 'CIRCUIT_WINS' ? 'CIRCUIT BEATS 2 FLIGHTS' : 'DIRECT PREFERRED'}
                </span>
              </div>
            </div>

            {/* Verdict Callout */}
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong>Executive Result:</strong> {circuitComparison.verdict_explanation}
              </div>
            </div>

            {/* Comparison Metrics Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-left">
                    <th className="py-2 px-3">Operational Metric</th>
                    <th className="py-2 px-3 bg-white rounded-t-lg">Option A: 2 Separate Flights</th>
                    <th className="py-2 px-3 bg-emerald-50 rounded-t-lg text-emerald-700">Option B: Single Triangular Circuit</th>
                    <th className="py-2 px-3 text-right">Net Operational Savings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  <tr>
                    <td className="py-2 px-3 font-sans font-medium text-slate-700">Aircraft Sorties</td>
                    <td className="py-2 px-3 bg-white">{circuitComparison.directCombined.total_flights} round trips</td>
                    <td className="py-2 px-3 bg-emerald-50 font-bold text-emerald-700">{circuitComparison.circuit.flights_required} round trip</td>
                    <td className="py-2 px-3 text-right text-emerald-600 font-bold">1 flight sortie saved</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-sans font-medium text-slate-700">Total Route Distance</td>
                    <td className="py-2 px-3 bg-white">{circuitComparison.directCombined.total_roundtrip_miles} statute mi (594 NM)</td>
                    <td className="py-2 px-3 bg-emerald-50 font-bold text-emerald-700">{circuitComparison.circuit.total_distance_statute_mi} statute mi ({circuitComparison.circuit.total_distance_nm} NM)</td>
                    <td className="py-2 px-3 text-right text-emerald-600 font-bold">-{circuitComparison.savings.miles_saved} mi (-{circuitComparison.savings.miles_saved_pct}%)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-sans font-medium text-slate-700">Total Flight Time</td>
                    <td className="py-2 px-3 bg-white">{circuitComparison.directCombined.total_flight_hours} hours</td>
                    <td className="py-2 px-3 bg-emerald-50 font-bold text-emerald-700">{circuitComparison.circuit.total_flight_hours} hours</td>
                    <td className="py-2 px-3 text-right text-emerald-600 font-bold">-{circuitComparison.savings.flight_hours_saved} hrs (-{circuitComparison.savings.flight_hours_saved_pct}%)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-sans font-medium text-slate-700">Estimated Fuel Burn</td>
                    <td className="py-2 px-3 bg-white">{circuitComparison.directCombined.total_fuel_burn_lb} lb</td>
                    <td className="py-2 px-3 bg-emerald-50 font-bold text-emerald-700">~{circuitComparison.circuit.estimated_fuel_burn_lb} lb</td>
                    <td className="py-2 px-3 text-right text-emerald-600 font-bold">~{circuitComparison.savings.fuel_saved_lb} lb fuel (-{circuitComparison.savings.fuel_saved_pct}%)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-sans font-medium text-slate-700">Orders Delivered</td>
                    <td className="py-2 px-3 bg-white">{circuitComparison.directCombined.total_orders_delivered} orders (0 deferred)</td>
                    <td className="py-2 px-3 bg-emerald-50 font-bold text-emerald-700">{circuitComparison.circuit.orders_delivered} orders (0 deferred)</td>
                    <td className="py-2 px-3 text-right text-emerald-600">100% On-Time Delivery</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-sans font-medium text-slate-700">Takeoff Cargo Payload</td>
                    <td className="py-2 px-3 bg-white">CYLH: {circuitComparison.directA.payload_used_lb} lb / CJV7: {circuitComparison.directB.payload_used_lb} lb</td>
                    <td className="py-2 px-3 bg-emerald-50 font-bold text-emerald-700">{circuitComparison.circuit.initial_payload_lb} lb (Limit: {circuitComparison.circuit.max_allowable_payload_lb} lb)</td>
                    <td className="py-2 px-3 text-right text-emerald-600 font-bold">+{circuitComparison.circuit.max_allowable_payload_lb - circuitComparison.circuit.initial_payload_lb} lb margin</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-sans font-medium text-slate-700">Cabin Totes Occupied</td>
                    <td className="py-2 px-3 bg-white">CYLH: {circuitComparison.directA.totes_count} totes / CJV7: {circuitComparison.directB.totes_count} totes</td>
                    <td className="py-2 px-3 bg-emerald-50 font-bold text-emerald-700">{circuitComparison.circuit.initial_totes_count} / {circuitComparison.circuit.max_totes_capacity} totes</td>
                    <td className="py-2 px-3 text-right text-emerald-600 font-bold">+{circuitComparison.circuit.max_totes_capacity - circuitComparison.circuit.initial_totes_count} slots free</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Sequential Leg Offloading Visual */}
            <div className="pt-2 border-t border-slate-700/60">
              <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Circuit Sequential Cargo Offloading (Leg by Leg)
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                {circuitComparison.circuit.legs.map((leg) => (
                  <div key={leg.leg_index} className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-700 text-xs">
                    <div className="flex items-center justify-between font-mono text-[11px] font-bold text-amber-300">
                      <span>Leg {leg.leg_index}: {leg.origin_code} ➔ {leg.destination_code}</span>
                      <span className="text-slate-400">{leg.distance_statute_mi} mi ({leg.flight_hours} hr)</span>
                    </div>
                    <div className="text-slate-300 text-[11px] font-mono mt-1">
                      Onboard: <strong className="text-white">{leg.totes_onboard} totes</strong> ({leg.cargo_onboard_lb} lb)
                    </div>
                    <div className="mt-1.5 text-[10px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded">
                      {leg.action_at_destination}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Assumptions & Methodology Drawer */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowAssumptions(!showAssumptions)}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 font-mono transition-colors"
              >
                <Info className="h-3.5 w-3.5" />
                <span>{showAssumptions ? 'Hide calculation assumptions & formulas' : 'Show calculation assumptions & route methodology'}</span>
                {showAssumptions ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
              {showAssumptions && (
                <div className="mt-2 p-3 bg-slate-900 rounded-lg border border-slate-700/60 text-[11px] text-slate-300 space-y-1 font-mono">
                  {circuitComparison.circuit.assumptions.map((assump, idx) => (
                    <div key={idx} className="flex items-start gap-1.5">
                      <span className="text-emerald-400">•</span>
                      <span>{assump}</span>
                    </div>
                  ))}
                  <div className="pt-1 text-slate-400 text-[10px]">
                    * Note: Flight times and distances are calculated based on sponsor-provided airport coordinates and 170 mph Caravan cruising speed. Fuel consumption uses 421 lb/hr based on sponsor flight test data.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Flight Capacity KPIs & Binding Constraint Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Payload KPI */}
        <div className="glass-panel hover-lift rounded-2xl p-5">
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
        <div className="glass-panel hover-lift rounded-2xl p-5">
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
        <div className="glass-panel hover-lift rounded-2xl p-5">
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
        <div className="glass-panel hover-lift rounded-2xl p-5 flex flex-col justify-between">
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
        <div className="glass-panel border-zamiigo-amber/50 rounded-3xl p-6 relative animate-fade-in">
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
      <div className="glass-panel rounded-3xl p-6">
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
        <div className="glass-panel border-amber-200/60 rounded-3xl overflow-hidden">
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
      <div className="glass-panel rounded-3xl overflow-hidden mt-8">
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
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{tote.total_weight_lb} lb</td>
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

    </div>
  );
};
