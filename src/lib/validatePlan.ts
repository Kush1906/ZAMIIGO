import { PlanState, ValidationIssue } from './types';

/**
 * Validates the entire plan state across all tabs.
 * Flags any rule violations (weight overages, split-order cart separations, flight limits).
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
        message: `${tote.tote_code}: Weight (${tote.total_weight_lb} lb) exceeds recommended operating limit (${config.toteMaxWeightLb} lb).`,
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

  return issues;
}
