import { HouseholdOrder, Tote, FlightDeparture, PlanConfig } from './types';

export interface DepartureScheduleDef {
  departure_id: string;
  departure_date: string;
  destination: string;
  available_totes: number;
  available_payload_lb: number;
  available_volume_cuft: number;
}

export const TOTE_VOLUME_CUFT = 3600 / 1728; // ~2.083 cu ft — one tote's volume footprint

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

export interface CapacityParseResult {
  schedules: DepartureScheduleDef[];
  errors: string[];
}

/**
 * Parses a flight capacity CSV into DepartureScheduleDef[].
 * Required columns: departure_date, available_totes, available_payload_lb, available_volume_cuft
 * Optional: departure_id, destination
 * Rejects: nonpositive capacities, invalid dates, duplicate departure IDs
 */
export function parseFlightCapacityCsv(csvText: string): CapacityParseResult {
  const errors: string[] = [];
  const lines = csvText.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);

  if (lines.length < 2) {
    return { schedules: [], errors: ['Flight capacity CSV must have a header row and at least one data row.'] };
  }

  const header = lines[0].split(',').map(h => h.trim().toLowerCase());
  const idxId = header.findIndex(h => h.includes('departure_id') || h === 'id');
  const idxDate = header.findIndex(h => h.includes('departure_date') || h === 'date');
  const idxTotes = header.findIndex(h => h.includes('available_totes') || h === 'totes');
  const idxPayload = header.findIndex(h => h.includes('available_payload_lb') || h.includes('payload'));
  const idxVolume = header.findIndex(h => h.includes('available_volume_cuft') || h.includes('volume'));
  const idxDest = header.findIndex(h => h.includes('destination'));

  const missing: string[] = [];
  if (idxDate === -1) missing.push('departure_date');
  if (idxTotes === -1) missing.push('available_totes');
  if (idxPayload === -1) missing.push('available_payload_lb');
  if (idxVolume === -1) missing.push('available_volume_cuft');

  if (missing.length > 0) {
    return {
      schedules: [],
      errors: [`Missing required capacity CSV columns: ${missing.join(', ')}. Found: ${header.join(', ')}`]
    };
  }

  const schedules: DepartureScheduleDef[] = [];
  const seenIds = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1;
    const cols = lines[i].split(',').map(c => c.trim());

    const rawDate = cols[idxDate] ?? '';
    const rawId = idxId >= 0 ? cols[idxId] : String(i);
    const depId = rawId.match(/^DEP-/i) ? rawId.toUpperCase() : `DEP-${String(rawId).padStart(2, '0')}`;

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      errors.push(`Row ${rowNum}: Invalid departure_date "${rawDate}" — must be YYYY-MM-DD format.`);
      continue;
    }

    const totes = parseInt(cols[idxTotes] ?? '', 10);
    const payload = parseFloat(cols[idxPayload] ?? '');
    const volume = parseFloat(cols[idxVolume] ?? '');

    if (!isFinite(totes) || totes <= 0) {
      errors.push(`Row ${rowNum}: available_totes must be a positive integer, got "${cols[idxTotes]}".`);
      continue;
    }
    if (!isFinite(payload) || payload <= 0) {
      errors.push(`Row ${rowNum}: available_payload_lb must be a positive number, got "${cols[idxPayload]}".`);
      continue;
    }
    if (!isFinite(volume) || volume <= 0) {
      errors.push(`Row ${rowNum}: available_volume_cuft must be a positive number, got "${cols[idxVolume]}".`);
      continue;
    }

    if (seenIds.has(depId)) {
      errors.push(`Row ${rowNum}: Duplicate departure_id "${depId}" — each departure must have a unique ID.`);
      continue;
    }
    seenIds.add(depId);

    schedules.push({
      departure_id: depId,
      departure_date: rawDate,
      destination: idxDest >= 0 && cols[idxDest] ? cols[idxDest] : 'Webequie (CYWP)',
      available_totes: totes,
      available_payload_lb: payload,
      available_volume_cuft: volume,
    });
  }

  return { schedules, errors };
}

/**
 * Plans flight loading across scheduled departures.
 *
 * KEY INVARIANTS:
 * 1. Assigns complete household order groups atomically (union-find groups orders sharing totes).
 * 2. A group is only eligible for a departure if every order's order_date <= departure_date.
 * 3. If the full group doesn't fit, the entire group rolls to the next departure.
 * 4. Aircraft space used = number of assigned totes × tote volume (not sum of item volumes).
 *    Item volume sum is tracked separately as total_volume_cuft (labelled as estimate).
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

  // Build order groups using union-find: orders sharing a tote must travel together
  const orderIdToGroup = new Map<string, number>();
  let nextGroupId = 0;
  const groupParents = new Map<number, number>();

  function findRoot(gid: number): number {
    while (groupParents.get(gid) !== gid) {
      const parent = groupParents.get(gid)!;
      groupParents.set(gid, groupParents.get(parent) ?? parent); // path compression
      gid = parent;
    }
    return gid;
  }

  function union(a: number, b: number) {
    a = findRoot(a); b = findRoot(b);
    if (a !== b) groupParents.set(b, a);
  }

  for (const tote of updatedTotes) {
    if (tote.assigned_order_ids.length === 0) continue;
    let groupForTote: number | null = null;

    for (const ordId of tote.assigned_order_ids) {
      if (!orderIdToGroup.has(ordId)) {
        const gid = nextGroupId++;
        groupParents.set(gid, gid);
        orderIdToGroup.set(ordId, gid);
      }
      const gid = findRoot(orderIdToGroup.get(ordId)!);
      if (groupForTote === null) {
        groupForTote = gid;
      } else {
        union(groupForTote, gid);
        groupForTote = findRoot(groupForTote);
      }
    }
  }

  // Path-compress all
  for (const [ordId, gid] of orderIdToGroup.entries()) {
    orderIdToGroup.set(ordId, findRoot(gid));
  }

  interface OrderGroup {
    groupId: number;
    orders: HouseholdOrder[];
    totes: Tote[];
    totalWeightLb: number;
    totalItemsVolumeCuFt: number; // sum of item volumes (estimate)
    totalTotes: number;
    earliestOrderDate: string;
  }

  const groupMap = new Map<number, OrderGroup>();

  for (const order of updatedOrders) {
    if (!orderIdToGroup.has(order.order_id)) continue;
    const gid = orderIdToGroup.get(order.order_id)!;

    if (!groupMap.has(gid)) {
      groupMap.set(gid, {
        groupId: gid,
        orders: [],
        totes: [],
        totalWeightLb: 0,
        totalItemsVolumeCuFt: 0,
        totalTotes: 0,
        earliestOrderDate: '9999-99-99',
      });
    }
    const group = groupMap.get(gid)!;
    group.orders.push(order);
    if (order.order_date < group.earliestOrderDate) {
      group.earliestOrderDate = order.order_date;
    }
  }

  const toteAddedToGroup = new Set<string>();
  for (const tote of updatedTotes) {
    if (tote.assigned_order_ids.length === 0 || toteAddedToGroup.has(tote.tote_id)) continue;
    const firstOrd = tote.assigned_order_ids[0];
    if (!orderIdToGroup.has(firstOrd)) continue;
    const gid = orderIdToGroup.get(firstOrd)!;
    if (!groupMap.has(gid)) continue;

    toteAddedToGroup.add(tote.tote_id);
    const group = groupMap.get(gid)!;
    group.totes.push(tote);
    group.totalWeightLb += tote.total_weight_lb;
    group.totalItemsVolumeCuFt += tote.total_volume_cuin / 1728;
    group.totalTotes += 1;
  }

  // Sort groups: earliest order date first, then smallest first (better bin packing)
  const sortedGroups = Array.from(groupMap.values()).sort((a, b) => {
    if (a.earliestOrderDate !== b.earliestOrderDate) return a.earliestOrderDate.localeCompare(b.earliestOrderDate);
    return a.totalTotes - b.totalTotes;
  });

  const departures: FlightDeparture[] = [];
  let pendingGroups = [...sortedGroups];

  for (let sIdx = 0; sIdx < schedules.length; sIdx++) {
    const sched = schedules[sIdx];
    const depDate = sched.departure_date;
    const isLastDeparture = sIdx === schedules.length - 1;

    const depToteIds: string[] = [];
    const depOrderIds: string[] = [];
    const rolledOverOrderIds: string[] = [];

    let currentPayloadLb = 0;
    let currentItemsVolCuFt = 0;

    const eligibleGroups: OrderGroup[] = [];
    const futureGroups: OrderGroup[] = [];

    for (const group of pendingGroups) {
      // A group is eligible only if ALL its orders were placed on or before this departure
      const allEligible = group.orders.every(o => o.order_date <= depDate);
      if (allEligible) {
        eligibleGroups.push(group);
      } else {
        futureGroups.push(group);
      }
    }

    const unplacedFromEligible: OrderGroup[] = [];

    for (const group of eligibleGroups) {
      // P1 FIX: Use tote count × tote volume for aircraft space constraint
      // (not sum of item volumes — 22 partly-filled totes still occupy 22 tote slots)
      const groupTotesVolCuFt = group.totalTotes * TOTE_VOLUME_CUFT;
      const canFitTotes = (depToteIds.length + group.totalTotes) <= sched.available_totes;
      const canFitWeight = (currentPayloadLb + group.totalWeightLb) <= sched.available_payload_lb;
      const canFitVol = (currentItemsVolCuFt + groupTotesVolCuFt) <= sched.available_volume_cuft;

      if (canFitTotes && canFitWeight && canFitVol) {
        // Assign entire group atomically
        for (const tote of group.totes) {
          depToteIds.push(tote.tote_id);
          tote.assigned_flight_id = sched.departure_id;
        }
        currentPayloadLb += group.totalWeightLb;
        currentItemsVolCuFt += groupTotesVolCuFt;

        for (const order of group.orders) {
          depOrderIds.push(order.order_id);
          order.assigned_flight_id = sched.departure_id;
        }
      } else {
        // Entire group rolls over — do NOT split
        unplacedFromEligible.push(group);

        let failReason = 'Aircraft capacity limit reached';
        if (!canFitTotes) failReason = `Exceeded flight tote slot limit (${sched.available_totes} totes)`;
        else if (!canFitWeight) failReason = `Exceeded allowable flight payload (${sched.available_payload_lb} lb)`;
        else if (!canFitVol) failReason = `Exceeded flight cargo volume (${sched.available_volume_cuft} cu ft)`;

        for (const order of group.orders) {
          rolledOverOrderIds.push(order.order_id);
          if (!isLastDeparture) {
            order.is_rolled_over = true;
            order.rollover_reason = `Rolled over from ${sched.departure_id} (${sched.departure_date}): ${failReason}`;
          }
        }
      }
    }

    // Aircraft space = number of assigned totes × tote volume (what actually fills the cabin)
    const totesVolCuFt = depToteIds.length * TOTE_VOLUME_CUFT;

    const totePct = sched.available_totes > 0 ? (depToteIds.length / sched.available_totes) * 100 : 0;
    const payloadPct = sched.available_payload_lb > 0 ? (currentPayloadLb / sched.available_payload_lb) * 100 : 0;
    // Volume utilization based on totes occupying aircraft cabin space
    const volPct = sched.available_volume_cuft > 0 ? (totesVolCuFt / sched.available_volume_cuft) * 100 : 0;

    let binding: 'WEIGHT' | 'SPACE' | 'TOTE_SLOTS' | 'NONE' = 'NONE';
    if (unplacedFromEligible.length > 0 || Math.max(totePct, payloadPct, volPct) >= 90) {
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
      total_volume_cuft: Math.round(currentItemsVolCuFt * 10) / 10, // item volume estimate
      totes_volume_cuft: Math.round(totesVolCuFt * 10) / 10,        // aircraft space occupied
      total_totes_count: depToteIds.length,
      payload_utilization_pct: Math.min(100, Math.round(payloadPct * 10) / 10),
      volume_utilization_pct: Math.min(100, Math.round(volPct * 10) / 10),
      tote_utilization_pct: Math.min(100, Math.round(totePct * 10) / 10),
      binding_constraint: binding,
      is_over_capacity: currentPayloadLb > sched.available_payload_lb || totesVolCuFt > sched.available_volume_cuft || depToteIds.length > sched.available_totes,
      assigned_order_ids: depOrderIds,
      rolled_over_order_ids: rolledOverOrderIds,
    });

    pendingGroups = [...unplacedFromEligible, ...futureGroups];
  }

  // Orders with no assigned flight after all departures
  if (pendingGroups.length > 0) {
    for (const group of pendingGroups) {
      for (const order of group.orders) {
        if (!order.assigned_flight_id) {
          order.is_rolled_over = true;
          order.rollover_reason = 'Awaiting a future charter flight — not scheduled in the current departure plan';
        }
      }
    }
  }

  return { departures, updatedOrders, updatedTotes };
}
