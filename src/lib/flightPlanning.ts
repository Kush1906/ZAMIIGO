import { HouseholdOrder, Tote, FlightDeparture, PlanConfig } from './types';

export interface DepartureScheduleDef {
  departure_id: string;
  departure_date: string;
  destination: string;
  available_totes: number;
  available_payload_lb: number;
  available_volume_cuft: number;
}

export const STAGE_1_FLIGHT: DepartureScheduleDef[] = [
  {
    departure_id: 'DEP-01',
    departure_date: '2026-06-01',
    destination: 'Webequie (CYWP)',
    available_totes: 90,
    available_payload_lb: 2877,
    available_volume_cuft: 187.5,
  }
];

export const STAGE_2_FLIGHTS: DepartureScheduleDef[] = [
  {
    departure_id: 'DEP-01',
    departure_date: '2026-06-04',
    destination: 'Webequie (CYWP)',
    available_totes: 22,
    available_payload_lb: 703,
    available_volume_cuft: 45.83,
  },
  {
    departure_id: 'DEP-02',
    departure_date: '2026-06-05',
    destination: 'Webequie (CYWP)',
    available_totes: 36,
    available_payload_lb: 1151,
    available_volume_cuft: 75.0,
  },
  {
    departure_id: 'DEP-03',
    departure_date: '2026-06-07',
    destination: 'Webequie (CYWP)',
    available_totes: 90,
    available_payload_lb: 2877,
    available_volume_cuft: 187.5,
  }
];

/**
 * Plans flight loading across scheduled departures.
 * Deterministically assigns complete orders and their totes.
 * Tracks payload, volume, tote count, binding constraints, and rollovers.
 */
export function planFlightDepartures(
  orders: HouseholdOrder[],
  totes: Tote[],
  schedules: DepartureScheduleDef[],
  _config: PlanConfig
): { departures: FlightDeparture[]; updatedOrders: HouseholdOrder[]; updatedTotes: Tote[] } {
  const updatedOrders: HouseholdOrder[] = orders.map(o => ({
    ...o,
    is_rolled_over: false,
    rollover_reason: undefined as string | undefined,
    assigned_flight_id: undefined as string | undefined,
  }));

  const updatedTotes: Tote[] = totes.map(t => ({
    ...t,
    assigned_flight_id: undefined as string | undefined,
  }));

  // Group totes by their primary order date (earliest order date in tote)
  const getToteDate = (t: Tote): string => {
    let earliest = '9999-99-99';
    for (const ordId of t.assigned_order_ids) {
      const ord = updatedOrders.find(o => o.order_id === ordId);
      if (ord && ord.order_date < earliest) earliest = ord.order_date;
    }
    return earliest === '9999-99-99' ? '2026-06-01' : earliest;
  };

  const departures: FlightDeparture[] = [];
  const assignedToteIds = new Set<string>();
  const assignedOrderIds = new Set<string>();

  // Queue of unassigned totes
  let pendingTotes: Tote[] = [...updatedTotes].sort((a, b) => {
    const dateA = getToteDate(a);
    const dateB = getToteDate(b);
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    return a.tote_code.localeCompare(b.tote_code);
  });

  for (let sIdx = 0; sIdx < schedules.length; sIdx++) {
    const sched = schedules[sIdx];
    const depDate = sched.departure_date;

    const depToteIds: string[] = [];
    const depOrderIds: string[] = [];
    const rolledOverOrderIds: string[] = [];

    let currentPayloadLb = 0;
    let currentVolCuFt = 0;

    // Filter totes that are ready by this departure date (order_date <= depDate) and not yet assigned
    const eligibleTotes: Tote[] = [];
    const futureTotes: Tote[] = [];

    for (const t of pendingTotes) {
      const tDate = getToteDate(t);
      if (tDate <= depDate) {
        eligibleTotes.push(t);
      } else {
        futureTotes.push(t);
      }
    }

    const unplacedFromEligible: Tote[] = [];

    for (const tote of eligibleTotes) {
      const toteVolCuFt = tote.total_volume_cuin / 1728;
      const canFitTote = (depToteIds.length + 1) <= sched.available_totes;
      const canFitWeight = (currentPayloadLb + tote.total_weight_lb) <= sched.available_payload_lb;
      const canFitVol = (currentVolCuFt + toteVolCuFt) <= sched.available_volume_cuft;

      if (canFitTote && canFitWeight && canFitVol) {
        depToteIds.push(tote.tote_id);
        currentPayloadLb += tote.total_weight_lb;
        currentVolCuFt += toteVolCuFt;
        tote.assigned_flight_id = sched.departure_id;
        assignedToteIds.add(tote.tote_id);

        for (const ordId of tote.assigned_order_ids) {
          if (!depOrderIds.includes(ordId)) {
            depOrderIds.push(ordId);
            assignedOrderIds.add(ordId);
            const ord = updatedOrders.find(o => o.order_id === ordId);
            if (ord) ord.assigned_flight_id = sched.departure_id;
          }
        }
      } else {
        unplacedFromEligible.push(tote);
        let failReason = 'Aircraft capacity limit reached';
        if (!canFitTote) failReason = `Exceeded flight tote slot limit (${sched.available_totes} totes)`;
        else if (!canFitWeight) failReason = `Exceeded allowable flight payload (${sched.available_payload_lb} lb)`;
        else if (!canFitVol) failReason = `Exceeded flight cargo volume (${sched.available_volume_cuft} cu ft)`;

        for (const ordId of tote.assigned_order_ids) {
          if (!depOrderIds.includes(ordId) && !rolledOverOrderIds.includes(ordId)) {
            rolledOverOrderIds.push(ordId);
            const ord = updatedOrders.find(o => o.order_id === ordId);
            if (ord && sIdx < schedules.length - 1) {
              ord.is_rolled_over = true;
              ord.rollover_reason = `Rolled over from ${sched.departure_id} (${sched.departure_date}): ${failReason}`;
            }
          }
        }
      }
    }

    // Determine binding constraint for this departure
    const totePct = sched.available_totes > 0 ? (depToteIds.length / sched.available_totes) * 100 : 0;
    const payloadPct = sched.available_payload_lb > 0 ? (currentPayloadLb / sched.available_payload_lb) * 100 : 0;
    const volPct = sched.available_volume_cuft > 0 ? (currentVolCuFt / sched.available_volume_cuft) * 100 : 0;

    let binding: 'WEIGHT' | 'SPACE' | 'TOTE_SLOTS' | 'NONE' = 'NONE';
    const maxPct = Math.max(totePct, payloadPct, volPct);

    if (maxPct >= 90 || unplacedFromEligible.length > 0) {
      if (totePct >= payloadPct && totePct >= volPct) binding = 'TOTE_SLOTS';
      else if (payloadPct >= volPct) binding = 'WEIGHT';
      else binding = 'SPACE';
    }

    departures.push({
      departure_id: sched.departure_id,
      departure_date: sched.departure_date,
      destination: sched.destination,
      aircraft_model: 'Cessna 208 Caravan',
      available_totes: sched.available_totes,
      available_payload_lb: sched.available_payload_lb,
      available_volume_cuft: sched.available_volume_cuft,
      assigned_tote_ids: depToteIds,
      total_weight_lb: Math.round(currentPayloadLb * 10) / 10,
      total_volume_cuft: Math.round(currentVolCuFt * 10) / 10,
      total_totes_count: depToteIds.length,
      payload_utilization_pct: Math.min(100, Math.round(payloadPct * 10) / 10),
      volume_utilization_pct: Math.min(100, Math.round(volPct * 10) / 10),
      tote_utilization_pct: Math.min(100, Math.round(totePct * 10) / 10),
      binding_constraint: binding,
      is_over_capacity: currentPayloadLb > sched.available_payload_lb || currentVolCuFt > sched.available_volume_cuft || depToteIds.length > sched.available_totes,
      assigned_order_ids: depOrderIds,
      rolled_over_order_ids: rolledOverOrderIds,
    });

    // Unplaced eligible totes roll over to next departure alongside future totes
    pendingTotes = [...unplacedFromEligible, ...futureTotes];
  }

  // Any remaining totes after all scheduled departures
  if (pendingTotes.length > 0) {
    for (const t of pendingTotes) {
      for (const ordId of t.assigned_order_ids) {
        const ord = updatedOrders.find(o => o.order_id === ordId);
        if (ord && !ord.assigned_flight_id) {
          ord.is_rolled_over = true;
          ord.rollover_reason = 'Pending next scheduled charter flight';
        }
      }
    }
  }

  return { departures, updatedOrders, updatedTotes };
}
