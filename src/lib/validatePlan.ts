import { PlanState, ValidationIssue } from './types';

/**
 * Validates the entire plan state across all tabs.
 * Flags any rule violations (weight overages, split-order cart separations,
 * flight integrity, date eligibility).
 */
export function validatePlan(state: PlanState): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { totes, carts, departures, orders, config } = state;

  // 1. Tote Capacity Checks
  for (const tote of totes) {
    if (tote.total_volume_cuin > config.toteUsableVolumeCuIn) {
      issues.push({
        type: 'ERROR',
        code: 'TOTE_VOLUME_EXCEEDED',
        message: `${tote.tote_code}: Estimated volume (${tote.total_volume_cuin} cu in) exceeds tote capacity (${config.toteUsableVolumeCuIn} cu in).`,
        entityId: tote.tote_id,
        tabTarget: 'picking'
      });
    }

    if (tote.total_weight_lb > config.toteMaxWeightLb) {
      issues.push({
        type: 'WARNING',
        code: 'TOTE_WEIGHT_HIGH',
        message: `${tote.tote_code}: Weight (${tote.total_weight_lb} lb) exceeds assumed operating limit (${config.toteMaxWeightLb} lb). This limit is configurable.`,
        entityId: tote.tote_id,
        tabTarget: 'picking'
      });
    }
  }

  // 2. Cart Configuration & Order Separation Checks
  for (const cart of carts) {
    if (cart.tote_ids.length > config.maxTotesPerCart) {
      issues.push({
        type: 'ERROR',
        code: 'CART_OVER_CAPACITY',
        message: `${cart.cart_code}: Contains ${cart.tote_ids.length} totes (configured maximum is ${config.maxTotesPerCart}).`,
        entityId: cart.cart_id,
        tabTarget: 'picking'
      });
    }
  }

  // CRITICAL RULE CHECK: Every tote for a given order MUST be on the same cart
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
        message: `Order #${ordId} (Household #${order?.household_id || '?'}) has split totes assigned to multiple carts (${Array.from(cartSet).join(', ')}). All totes for an order must stay on the same cart.`,
        entityId: ordId,
        tabTarget: 'picking'
      });
    }
  }

  // 3. Flight Constraints Checks
  for (const dep of departures) {
    if (dep.total_totes_count > dep.available_totes) {
      issues.push({
        type: 'ERROR',
        code: 'FLIGHT_TOTES_EXCEEDED',
        message: `${dep.departure_id} (${dep.departure_date}): Contains ${dep.total_totes_count} totes, exceeding available aircraft slots (${dep.available_totes}).`,
        entityId: dep.departure_id,
        tabTarget: 'flight'
      });
    }

    if (dep.total_weight_lb > dep.available_payload_lb) {
      issues.push({
        type: 'ERROR',
        code: 'FLIGHT_PAYLOAD_EXCEEDED',
        message: `${dep.departure_id} (${dep.departure_date}): Weight (${dep.total_weight_lb} lb) exceeds available payload (${dep.available_payload_lb} lb).`,
        entityId: dep.departure_id,
        tabTarget: 'flight'
      });
    }

    if (dep.total_volume_cuft > dep.available_volume_cuft) {
      issues.push({
        type: 'ERROR',
        code: 'FLIGHT_VOLUME_EXCEEDED',
        message: `${dep.departure_id} (${dep.departure_date}): Volume (${dep.total_volume_cuft} cu ft) exceeds cargo space (${dep.available_volume_cuft} cu ft).`,
        entityId: dep.departure_id,
        tabTarget: 'flight'
      });
    }
  }

  // 4. FLIGHT INTEGRITY CHECKS (P0 — new)

  // 4a. Every order must appear on exactly one departure (or be explicitly rolled over)
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
        message: `Order #${ordId} appears on multiple departures (${flights.join(', ')}). Each order must travel on exactly one flight.`,
        entityId: ordId,
        tabTarget: 'flight'
      });
    }
  }

  // 4b. Every tote for an assigned order must be on the same flight as the order
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
          message: `${tote.tote_code} is on ${tote.assigned_flight_id} but its order #${ordId} is on ${orderFlight}. All totes for an order must be on the same flight.`,
          entityId: tote.tote_id,
          tabTarget: 'flight'
        });
      }
    }
  }

  // 4c. No order assigned to a departure should have order_date > departure_date
  for (const dep of departures) {
    for (const ordId of dep.assigned_order_ids) {
      const order = orders.find(o => o.order_id === ordId);
      if (order && order.order_date > dep.departure_date) {
        issues.push({
          type: 'ERROR',
          code: 'ORDER_DATE_AFTER_DEPARTURE',
          message: `Order #${ordId} (date ${order.order_date}) is assigned to ${dep.departure_id} (${dep.departure_date}), but the order was placed after the departure date.`,
          entityId: ordId,
          tabTarget: 'flight'
        });
      }
    }
  }

  // 5. Item coverage check: every item in every order should appear in exactly one tote
  const itemInToteCount = new Map<string, number>();
  for (const tote of totes) {
    for (const item of tote.items) {
      itemInToteCount.set(item.id, (itemInToteCount.get(item.id) || 0) + 1);
    }
  }

  let missingItemCount = 0;
  let dupeItemCount = 0;
  for (const order of orders) {
    for (const item of order.items) {
      const count = itemInToteCount.get(item.id) || 0;
      if (count === 0) missingItemCount++;
      if (count > 1) dupeItemCount++;
    }
  }

  if (missingItemCount > 0) {
    issues.push({
      type: 'ERROR',
      code: 'ITEMS_NOT_IN_TOTES',
      message: `${missingItemCount} item(s) from orders are not assigned to any tote. Every packable item must appear in exactly one tote.`,
      tabTarget: 'picking'
    });
  }

  if (dupeItemCount > 0) {
    issues.push({
      type: 'ERROR',
      code: 'ITEMS_DUPLICATED_IN_TOTES',
      message: `${dupeItemCount} item(s) appear in more than one tote. Each item must be in exactly one tote.`,
      tabTarget: 'picking'
    });
  }

  return issues;
}
