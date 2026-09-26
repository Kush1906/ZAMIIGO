import { PlanState, ValidationIssue } from './types';

/**
 * Validates the entire plan state across all tabs.
 * Checks: tote capacity, cart ordering, flight constraints, flight integrity,
 * date eligibility, item coverage, and unassigned orders.
 */
export function validatePlan(state: PlanState): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { totes, carts, departures, orders, config } = state;

  // ── 1. Tote Capacity ─────────────────────────────────────────────────────────
  for (const tote of totes) {
    if (tote.total_volume_cuin > config.toteUsableVolumeCuIn) {
      issues.push({
        type: 'ERROR',
        code: 'TOTE_VOLUME_EXCEEDED',
        message: `${tote.tote_code}: Estimated volume (${tote.total_volume_cuin} cu in) exceeds tote capacity (${config.toteUsableVolumeCuIn} cu in).`,
        entityId: tote.tote_id,
        tabTarget: 'picking',
      });
    }
    if (tote.total_weight_lb > config.toteMaxWeightLb) {
      issues.push({
        type: 'WARNING',
        code: 'TOTE_WEIGHT_HIGH',
        message: `${tote.tote_code}: Weight (${tote.total_weight_lb} lb) exceeds assumed operating limit (${config.toteMaxWeightLb} lb — configurable).`,
        entityId: tote.tote_id,
        tabTarget: 'picking',
      });
    }
  }

  // ── 2. Cart Capacity & Split-Order Integrity ──────────────────────────────────
  for (const cart of carts) {
    if (cart.tote_ids.length > config.maxTotesPerCart) {
      issues.push({
        type: 'ERROR',
        code: 'CART_OVER_CAPACITY',
        message: `${cart.cart_code}: Contains ${cart.tote_ids.length} totes (maximum is ${config.maxTotesPerCart}).`,
        entityId: cart.cart_id,
        tabTarget: 'picking',
      });
    }
  }

  // All totes for a given order must share the same cart
  const orderCartsMap = new Map<string, Set<string>>();
  for (const tote of totes) {
    if (!tote.assigned_cart_id) continue;
    for (const ordId of tote.assigned_order_ids) {
      if (!orderCartsMap.has(ordId)) orderCartsMap.set(ordId, new Set());
      orderCartsMap.get(ordId)!.add(tote.assigned_cart_id);
    }
  }
  for (const [ordId, cartSet] of orderCartsMap.entries()) {
    if (cartSet.size > 1) {
      const order = orders.find(o => o.order_id === ordId);
      issues.push({
        type: 'ERROR',
        code: 'SPLIT_ORDER_ACROSS_CARTS',
        message: `Order #${ordId} (Household #${order?.household_id ?? '?'}) has split totes on multiple carts (${Array.from(cartSet).join(', ')}). All totes must stay on the same cart.`,
        entityId: ordId,
        tabTarget: 'picking',
      });
    }
  }

  // ── 3. Flight Capacity Limits ─────────────────────────────────────────────────
  for (const dep of departures) {
    if (dep.total_totes_count > dep.available_totes) {
      issues.push({
        type: 'ERROR',
        code: 'FLIGHT_TOTES_EXCEEDED',
        message: `${dep.departure_id} (${dep.departure_date}): ${dep.total_totes_count} totes assigned, exceeding ${dep.available_totes} available slots.`,
        entityId: dep.departure_id,
        tabTarget: 'flight',
      });
    }
    if (dep.total_weight_lb > dep.available_payload_lb) {
      issues.push({
        type: 'ERROR',
        code: 'FLIGHT_PAYLOAD_EXCEEDED',
        message: `${dep.departure_id} (${dep.departure_date}): Weight ${dep.total_weight_lb} lb exceeds payload limit ${dep.available_payload_lb} lb.`,
        entityId: dep.departure_id,
        tabTarget: 'flight',
      });
    }
    if (dep.totes_volume_cuft > dep.available_volume_cuft) {
      issues.push({
        type: 'ERROR',
        code: 'FLIGHT_VOLUME_EXCEEDED',
        message: `${dep.departure_id} (${dep.departure_date}): Tote volume occupancy ${dep.totes_volume_cuft} cu ft exceeds cargo space ${dep.available_volume_cuft} cu ft.`,
        entityId: dep.departure_id,
        tabTarget: 'flight',
      });
    }
  }

  // ── 4. Flight Integrity ───────────────────────────────────────────────────────

  // 4a. Each order must appear on exactly one departure
  const orderFlightCount = new Map<string, string[]>();
  for (const dep of departures) {
    for (const ordId of dep.assigned_order_ids) {
      if (!orderFlightCount.has(ordId)) orderFlightCount.set(ordId, []);
      orderFlightCount.get(ordId)!.push(dep.departure_id);
    }
  }
  for (const [ordId, flights] of orderFlightCount.entries()) {
    if (flights.length > 1) {
      issues.push({
        type: 'ERROR',
        code: 'ORDER_ON_MULTIPLE_FLIGHTS',
        message: `Order #${ordId} appears on multiple departures: ${flights.join(', ')}. Each order must travel on exactly one flight.`,
        entityId: ordId,
        tabTarget: 'flight',
      });
    }
  }

  // 4b. Tote's assigned flight must match all its orders' assigned flights
  const orderFlightMap = new Map<string, string>();
  for (const dep of departures) {
    for (const ordId of dep.assigned_order_ids) {
      orderFlightMap.set(ordId, dep.departure_id);
    }
  }
  for (const tote of totes) {
    if (!tote.assigned_flight_id) continue;
    for (const ordId of tote.assigned_order_ids) {
      const orderFlight = orderFlightMap.get(ordId);
      if (orderFlight && orderFlight !== tote.assigned_flight_id) {
        issues.push({
          type: 'ERROR',
          code: 'TOTE_ORDER_FLIGHT_MISMATCH',
          message: `${tote.tote_code} is on ${tote.assigned_flight_id} but order #${ordId} is on ${orderFlight}.`,
          entityId: tote.tote_id,
          tabTarget: 'flight',
        });
      }
    }
  }

  // 4c. No order should depart before its order_date
  for (const dep of departures) {
    for (const ordId of dep.assigned_order_ids) {
      const order = orders.find(o => o.order_id === ordId);
      if (order && order.order_date > dep.departure_date) {
        issues.push({
          type: 'ERROR',
          code: 'ORDER_DATE_AFTER_DEPARTURE',
          message: `Order #${ordId} (date ${order.order_date}) assigned to ${dep.departure_id} (${dep.departure_date}) — order was placed after departure date.`,
          entityId: ordId,
          tabTarget: 'flight',
        });
      }
    }
  }

  // 4d. Flag every order with no flight assignment (not rolled-over — genuinely unassigned)
  const assignedOrderIds = new Set<string>();
  for (const dep of departures) {
    for (const ordId of dep.assigned_order_ids) assignedOrderIds.add(ordId);
  }
  for (const order of orders) {
    if (order.held_from_flight) {
      // Held orders are intentionally kept off manifests — surface as a WARNING, not ERROR
      // (the UNPACKABLE_ITEMS error in buildPlan.ts already describes what needs resolving)
      issues.push({
        type: 'WARNING',
        code: 'HELD_ORDER_NOT_DISPATCHED',
        message: `Order #${order.order_id} (Household #${order.household_id}) is held pending staff resolution and will not appear in any flight manifest. ${order.held_reason ?? ''}`,
        entityId: order.order_id,
        tabTarget: 'picking',
      });
    } else if (!assignedOrderIds.has(order.order_id) && !order.is_rolled_over) {
      issues.push({
        type: 'ERROR',
        code: 'ORDER_NOT_ASSIGNED_TO_FLIGHT',
        message: `Order #${order.order_id} (Household #${order.household_id}) has totes packed but is not assigned to any departure and is not flagged as rolled over.`,
        entityId: order.order_id,
        tabTarget: 'flight',
      });
    }
  }

  // ── 5. Item Coverage ──────────────────────────────────────────────────────────
  // Every packable item (items[], not all_items) must appear in exactly one tote
  const itemInToteCount = new Map<string, number>();
  for (const tote of totes) {
    for (const item of tote.items) {
      itemInToteCount.set(item.id, (itemInToteCount.get(item.id) ?? 0) + 1);
    }
  }

  let missingItemCount = 0;
  let dupeItemCount = 0;
  for (const order of orders) {
    for (const item of order.items) { // items[] = packable only
      const count = itemInToteCount.get(item.id) ?? 0;
      if (count === 0) missingItemCount++;
      if (count > 1) dupeItemCount++;
    }
  }

  if (missingItemCount > 0) {
    issues.push({
      type: 'ERROR',
      code: 'ITEMS_NOT_IN_TOTES',
      message: `${missingItemCount} packable item(s) are not assigned to any tote. Every packable item must appear in exactly one tote.`,
      tabTarget: 'picking',
    });
  }
  if (dupeItemCount > 0) {
    issues.push({
      type: 'ERROR',
      code: 'ITEMS_DUPLICATED_IN_TOTES',
      message: `${dupeItemCount} item(s) appear in more than one tote. Each item must be in exactly one tote.`,
      tabTarget: 'picking',
    });
  }

  // ── 6. Tote Destination Segregation ───────────────────────────────────────────
  // A tote must never mix items from different destination communities.
  for (const tote of totes) {
    const destinations = new Set<string>();
    for (const ordId of tote.assigned_order_ids) {
      const order = orders.find(o => o.order_id === ordId);
      if (order) destinations.add(order.destination_community);
    }
    if (destinations.size > 1) {
      issues.push({
        type: 'ERROR',
        code: 'TOTE_MIXED_DESTINATIONS',
        message: `${tote.tote_code}: Contains orders for multiple destinations (${Array.from(destinations).join(', ')}). Each tote must serve a single community.`,
        entityId: tote.tote_id,
        tabTarget: 'picking',
      });
    }
  }

  // ── 7. Flight-Order Destination Match ─────────────────────────────────────────
  // An order must never be loaded onto a departure bound for a different community.
  function normalizeDest(s: string): string {
    return s.replace(/\s*\([^)]*\)\s*/g, '').trim().toLowerCase();
  }
  const uniqueFlightDests = new Set(departures.map(d => normalizeDest(d.destination)));
  const multiDest = uniqueFlightDests.size > 1;

  if (multiDest) {
    for (const dep of departures) {
      const depDest = normalizeDest(dep.destination);
      for (const ordId of dep.assigned_order_ids) {
        const order = orders.find(o => o.order_id === ordId);
        if (order && normalizeDest(order.destination_community) !== depDest) {
          issues.push({
            type: 'ERROR',
            code: 'ORDER_WRONG_DESTINATION_FLIGHT',
            message: `Order #${ordId} (${order.destination_community}) loaded on ${dep.departure_id} bound for ${dep.destination}. Orders must only fly to their own community.`,
            entityId: ordId,
            tabTarget: 'flight',
          });
        }
      }
    }
  }

  return issues;
}
