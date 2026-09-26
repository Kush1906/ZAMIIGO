import { PlanState, FlightDeparture } from './types';

export interface DispatchBriefResponse {
  briefMarkdown: string;
  source: 'gemini' | 'deterministic-fallback';
  requestsRemaining?: number;
}

/**
 * Calls the backend `/api/dispatch` endpoint to generate an operational dispatch brief with Gemini.
 * Includes instant deterministic fallback if API is unavailable or quota is exceeded.
 */
export async function generateDispatchBrief(
  state: PlanState,
  activeDeparture?: FlightDeparture
): Promise<DispatchBriefResponse> {
  const dep = activeDeparture || state.departures[0];
  const totalOrders = state.orders.length;
  const totalTotes = state.totes.length;
  const rolledOverCount = state.orders.filter(o => o.is_rolled_over).length;

  const promptContext = `
You are the Lead Aviation Dispatcher and Operations Officer for Wilderness North / Zamiigo Cargo Operations (Nakina CYQN to Webequie CYWP).
Review the following flight load plan for Departure ${dep.departure_id} on ${dep.departure_date}:
- Destination: ${dep.destination} (Aircraft: Cessna 208 Caravan freighter)
- Assigned Totes: ${dep.total_totes_count} / ${dep.available_totes} max slots (${dep.tote_utilization_pct}%)
- Assigned Payload: ${dep.total_weight_lb} lb / ${dep.available_payload_lb} lb max payload (${dep.payload_utilization_pct}%)
- Assigned Volume: ${dep.total_volume_cuft} cu ft / ${dep.available_volume_cuft} cu ft cargo space (${dep.volume_utilization_pct}%)
- Binding Constraint on this flight: ${dep.binding_constraint}
- Total Batch Orders: ${totalOrders} (${totalTotes} totes)
- Orders Rolled Over to subsequent departures: ${rolledOverCount} orders

Write a concise, professional operational briefing with these 3 sections:
1. Flight Status & Binding Constraint Summary (explain clearly why ${dep.binding_constraint} is the limiting factor)
2. Staging & Loading Advisory for Nakina ground crew (tote handling, balance, ambient vs perishables)
3. Rollover & Community Dispatch Notice for Webequie partner (expected arrival timeline and deferred batches)
Keep it direct, professional, and practical for northern bush aviation operations.
`.trim();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const res = await fetch('/api/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: promptContext,
        model: 'gemini-3-flash-preview',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.text) {
        return {
          briefMarkdown: data.text,
          source: 'gemini',
          requestsRemaining: data.requests_remaining,
        };
      }
    }
  } catch (err) {
    console.warn('Gemini dispatch call failed or timed out, using deterministic operational brief.', err);
  }

  // Deterministic high-quality fallback brief
  const fallbackBrief = `
### ✈️ Operational Dispatch Brief: ${dep.departure_id} (${dep.departure_date})
**Route:** Nakina (CYQN) ➔ Webequie (CYWP) | **Aircraft:** Cessna 208 Caravan Freighter

#### 1. Flight Status & Capacity Metrics
- **Load Status:** ${dep.total_totes_count} of ${dep.available_totes} totes assigned (${dep.tote_utilization_pct}% capacity).
- **Cargo Weight:** ${dep.total_weight_lb} lb of ${dep.available_payload_lb} lb payload (${dep.payload_utilization_pct}% utilization).
- **Cargo Space:** ${dep.total_volume_cuft} cu ft of ${dep.available_volume_cuft} cu ft (${dep.volume_utilization_pct}% space used).
- **Binding Constraint:** **${dep.binding_constraint}** — ${
    dep.binding_constraint === 'TOTE_SLOTS'
      ? `Aircraft tote slot limit of ${dep.available_totes} totes has been fully reached before weight limit.`
      : dep.binding_constraint === 'WEIGHT'
      ? `Maximum structural/fuel payload limit (${dep.available_payload_lb} lb) binds this departure.`
      : 'Cargo cabin volume limit binds this departure.'
  }

#### 2. Ground Crew Staging & Loading Advisory (Nakina Hub)
- **Carts Staging:** Ensure all ${state.carts.length} picking carts are staged sequentially at Nakina hangar bay.
- **Tote Integrity:** Confirm high-fill totes (>80% volume) are stacked on the bottom tiers of the Cessna 208 cabin grid.
- **Household Bagging:** Verify household items remain in their separate internal bags within shared totes to accelerate door-to-door distribution.

#### 3. Webequie Community Receiving & Rollover Advisory
- **Delivered Orders:** ${dep.assigned_order_ids.length} household orders are manifest on this flight.
- **Rollover Notice:** ${rolledOverCount} orders exceeded this flight's capacity and are scheduled for rollover to the next confirmed departure.
- **Local Partner Handover:** Webequie ground coordinator should prepare returnable tote return staging upon cargo offload.
`.trim();

  return {
    briefMarkdown: fallbackBrief,
    source: 'deterministic-fallback',
  };
}
