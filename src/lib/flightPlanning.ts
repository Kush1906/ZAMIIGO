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
 * Parses a flight capacity CSV into DepartureScheduleDef[].
 * Expected columns: departure_id, departure_date, available_totes, available_payload_lb, available_volume_cuft
 */
export function parseFlightCapacityCsv(csvText: string): DepartureScheduleDef[] {
  const lines = csvText.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) return [];

  const header = lines[0].toLowerCase().split(',').map(h => h.trim());
  const idxId = header.findIndex(h => h.includes('departure_id') || h === 'id');
  const idxDate = header.findIndex(h => h.includes('departure_date') || h === 'date');
  const idxTotes = header.findIndex(h => h.includes('available_totes') || h === 'totes');
  const idxPayload = header.findIndex(h => h.includes('available_payload_lb') || h.includes('payload'));
  const idxVolume = header.findIndex(h => h.includes('available_volume_cuft') || h.includes('volume'));

  if (idxDate === -1 || idxTotes === -1 || idxPayload === -1 || idxVolume === -1) return [];

  const schedules: DepartureScheduleDef[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim());
    const rawId = idxId >= 0 ? cols[idxId] : String(i);
    const depId = rawId.startsWith('DEP') ? rawId : `DEP-${String(rawId).padStart(2, '0')}`;

    const totes = parseInt(cols[idxTotes], 10);
    const payload = parseFloat(cols[idxPayload]);
    const volume = parseFloat(cols[idxVolume]);

    if (isNaN(totes) || isNaN(payload) || isNaN(volume)) continue;

    schedules.push({
      departure_id: depId,
      departure_date: cols[idxDate] || `2026-06-0${i + 3}`,
      destination: 'Webequie (CYWP)',
      available_totes: totes,
      available_payload_lb: payload,
      available_volume_cuft: volume,
    });
  }

  return schedules;
}

/**
 * Plans flight loading across scheduled departures.
 *
 * KEY INVARIANT: Assigns **complete household orders** atomically.
 * All totes belonging to an order group travel on the same departure.
 * An order is only eligible for a departure if its order_date <= departure_date.
 * If the full order group doesn't fit, the entire group rolls to the next departure.
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

  // Build a lookup: orderId -> list of totes that carry items from that order
  const orderToTotes = new Map<string, Tote[]>();
  for (const tote of updatedTotes) {
    for (const ordId of tote.assigned_order_ids) {
      if (!orderToTotes.has(ordId)) orderToTotes.set(ordId, []);
      orderToTotes.get(ordId)!.push(tote);
    }
  }

  // Build order groups: a group is a set of orders that share at least one tote.
  // All orders and their totes in a group must travel together.
  const orderIdToGroup = new Map<string, number>();
  let nextGroupId = 0;

  function findGroupRoot(gid: number, parents: Map<number, number>): number {
    while (parents.has(gid) && parents.get(gid) !== gid) {
      gid = parents.get(gid)!;
    }
    return gid;
  }

  const groupParents = new Map<number, number>();

  for (const tote of updatedTotes) {
    if (tote.assigned_order_ids.length === 0) continue;

    // Ensure all orders in this tote belong to the same group
    let mergedGroup: number | null = null;
    for (const ordId of tote.assigned_order_ids) {
      if (orderIdToGroup.has(ordId)) {
        const existingGroup = findGroupRoot(orderIdToGroup.get(ordId)!, groupParents);
        if (mergedGroup === null) {
          mergedGroup = existingGroup;
        } else if (mergedGroup !== existingGroup) {
          // Merge groups
          groupParents.set(existingGroup, mergedGroup);
        }
      }
    }

    if (mergedGroup === null) {
      mergedGroup = nextGroupId++;
      groupParents.set(mergedGroup, mergedGroup);
    }

    for (const ordId of tote.assigned_order_ids) {
      orderIdToGroup.set(ordId, mergedGroup);
    }
  }

  // Also ensure any order whose totes span multiple groups gets merged
  for (const order of updatedOrders) {
    if (!orderIdToGroup.has(order.order_id)) {
      // Order with no totes (unpackable) — skip flight assignment
      continue;
    }
  }

  // Collect groups
  interface OrderGroup {
    groupId: number;
    orders: HouseholdOrder[];
    totes: Tote[];
    totalWeightLb: number;
    totalVolumeCuFt: number;
    totalTotes: number;
    earliestOrderDate: string;
    latestOrderDate: string;
  }

  const groupMap = new Map<number, OrderGroup>();

  for (const order of updatedOrders) {
    if (!orderIdToGroup.has(order.order_id)) continue;
    const gid = findGroupRoot(orderIdToGroup.get(order.order_id)!, groupParents);
    orderIdToGroup.set(order.order_id, gid); // path compress

    if (!groupMap.has(gid)) {
      groupMap.set(gid, {
        groupId: gid,
        orders: [],
        totes: [],
        totalWeightLb: 0,
        totalVolumeCuFt: 0,
        totalTotes: 0,
        earliestOrderDate: '9999-99-99',
        latestOrderDate: '0000-00-00',
      });
    }
    groupMap.get(gid)!.orders.push(order);
    if (order.order_date < groupMap.get(gid)!.earliestOrderDate) {
      groupMap.get(gid)!.earliestOrderDate = order.order_date;
    }
    if (order.order_date > groupMap.get(gid)!.latestOrderDate) {
      groupMap.get(gid)!.latestOrderDate = order.order_date;
    }
  }

  // Add totes to their groups (deduplicated)
  const toteAssignedToGroup = new Set<string>();
  for (const tote of updatedTotes) {
    if (tote.assigned_order_ids.length === 0) continue;
    const firstOrd = tote.assigned_order_ids[0];
    if (!orderIdToGroup.has(firstOrd)) continue;
    const gid = findGroupRoot(orderIdToGroup.get(firstOrd)!, groupParents);
    if (toteAssignedToGroup.has(tote.tote_id)) continue;
    toteAssignedToGroup.add(tote.tote_id);

    const group = groupMap.get(gid)!;
    group.totes.push(tote);
    group.totalWeightLb += tote.total_weight_lb;
    group.totalVolumeCuFt += tote.total_volume_cuin / 1728;
    group.totalTotes += 1;
  }

  // Sort groups: earliest order date first, then by group size (smaller first for better packing)
  const sortedGroups = Array.from(groupMap.values()).sort((a, b) => {
    if (a.earliestOrderDate !== b.earliestOrderDate) return a.earliestOrderDate.localeCompare(b.earliestOrderDate);
    return a.totalTotes - b.totalTotes;
  });

  // Assign groups to departures
  const departures: FlightDeparture[] = [];
  const assignedGroupIds = new Set<number>();
  let pendingGroups = [...sortedGroups];

  for (let sIdx = 0; sIdx < schedules.length; sIdx++) {
    const sched = schedules[sIdx];
    const depDate = sched.departure_date;

    const depToteIds: string[] = [];
    const depOrderIds: string[] = [];
    const rolledOverOrderIds: string[] = [];

    let currentPayloadLb = 0;
    let currentVolCuFt = 0;

    const eligibleGroups: OrderGroup[] = [];
    const futureGroups: OrderGroup[] = [];

    for (const group of pendingGroups) {
      // A group is eligible if ALL its orders have order_date <= departure_date
      const allOrdersEligible = group.orders.every(o => o.order_date <= depDate);
      if (allOrdersEligible) {
        eligibleGroups.push(group);
      } else {
        futureGroups.push(group);
      }
    }

    const unplacedFromEligible: OrderGroup[] = [];

    for (const group of eligibleGroups) {
      // Check if the ENTIRE group fits atomically
      const canFitTotes = (depToteIds.length + group.totalTotes) <= sched.available_totes;
      const canFitWeight = (currentPayloadLb + group.totalWeightLb) <= sched.available_payload_lb;
      const canFitVol = (currentVolCuFt + group.totalVolumeCuFt) <= sched.available_volume_cuft;

      if (canFitTotes && canFitWeight && canFitVol) {
        // Assign entire group to this departure
        for (const tote of group.totes) {
          depToteIds.push(tote.tote_id);
          tote.assigned_flight_id = sched.departure_id;
        }
        currentPayloadLb += group.totalWeightLb;
        currentVolCuFt += group.totalVolumeCuFt;

        for (const order of group.orders) {
          depOrderIds.push(order.order_id);
          order.assigned_flight_id = sched.departure_id;
        }
        assignedGroupIds.add(group.groupId);
      } else {
        // Entire group rolls over — do NOT split it
        unplacedFromEligible.push(group);

        let failReason = 'Aircraft capacity limit reached';
        if (!canFitTotes) failReason = `Exceeded flight tote slot limit (${sched.available_totes} totes)`;
        else if (!canFitWeight) failReason = `Exceeded allowable flight payload (${sched.available_payload_lb} lb)`;
        else if (!canFitVol) failReason = `Exceeded flight cargo volume (${sched.available_volume_cuft} cu ft)`;

        for (const order of group.orders) {
          if (sIdx < schedules.length - 1) {
            order.is_rolled_over = true;
            order.rollover_reason = `Rolled over from ${sched.departure_id} (${sched.departure_date}): ${failReason}`;
          }
          rolledOverOrderIds.push(order.order_id);
        }
      }
    }

    // Compute utilization stats
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

    // Unplaced eligible groups roll over alongside future groups
    pendingGroups = [...unplacedFromEligible, ...futureGroups];
  }

  // Any remaining groups after all scheduled departures
  if (pendingGroups.length > 0) {
    for (const group of pendingGroups) {
      for (const order of group.orders) {
        if (!order.assigned_flight_id) {
          order.is_rolled_over = true;
          order.rollover_reason = 'Pending next scheduled charter flight';
        }
      }
    }
  }

  return { departures, updatedOrders, updatedTotes };
}
