import { LineItem, PlanConfig, PlanState, OrderStatus } from './types';
import { DEFAULT_PLAN_CONFIG, groupItemsIntoOrders, packOrdersIntoTotesAndCarts } from './packing';
import { planFlightDepartures, STAGE_1_FLIGHT, STAGE_2_FLIGHTS, DepartureScheduleDef, parseFlightCapacityCsv } from './flightPlanning';
import { validatePlan } from './validatePlan';

export function buildPlanFromItems(
  items: LineItem[],
  stage: 'stage1' | 'stage2' | 'custom' = 'stage1',
  customConfig?: Partial<PlanConfig>,
  customSchedules?: DepartureScheduleDef[]
): PlanState {
  const config: PlanConfig = { ...DEFAULT_PLAN_CONFIG, ...customConfig };

  // 1. Group items into distinct Household Orders
  const rawOrders = groupItemsIntoOrders(items, config.toteUsableVolumeCuIn);

  // 2. Pack orders into returnable totes and assign to picker carts
  const packingResult = packOrdersIntoTotesAndCarts(rawOrders, config);

  // 3. Determine flight schedule based on stage
  let schedules: DepartureScheduleDef[];
  if (customSchedules && customSchedules.length > 0) {
    schedules = customSchedules;
  } else if (stage === 'stage2') {
    schedules = STAGE_2_FLIGHTS;
  } else if (stage === 'custom') {
    // For custom uploads without explicit schedules, detect multi-day by looking at
    // distinct order dates. If there are multiple dates spanning >1 day, use Stage 2
    // schedule as default; otherwise use Stage 1 single flight.
    const dates = new Set(items.map(i => i.order_date));
    if (dates.size > 1) {
      schedules = STAGE_2_FLIGHTS;
    } else {
      schedules = STAGE_1_FLIGHT;
    }
  } else {
    schedules = STAGE_1_FLIGHT;
  }

  // 4. Plan flight loads & rollovers (whole-order atomic assignment)
  const flightResult = planFlightDepartures(packingResult.orders, packingResult.totes, schedules, config);

  // 5. Construct draft plan state
  const draftState: PlanState = {
    rawItems: items,
    orders: flightResult.updatedOrders,
    totes: flightResult.updatedTotes,
    carts: packingResult.carts,
    departures: flightResult.departures,
    config,
    issues: [],
    activeStage: stage,
    lastUpdated: Date.now(),
  };

  // 6. Run live validation checks across all tabs
  draftState.issues = validatePlan(draftState);

  // Add warnings for unpackable items
  if (packingResult.unpackableItems.length > 0) {
    draftState.issues.push({
      type: 'WARNING',
      code: 'UNPACKABLE_ITEMS',
      message: `${packingResult.unpackableItems.length} item(s) exceed tote dimensions in all orientations and could not be packed. These items require special handling.`,
      tabTarget: 'picking',
    });
  }

  return draftState;
}

/**
 * Revalidates and updates state after a manual tote move to a different cart.
 * P1 FIX: Validates that split-order totes remain on the same cart BEFORE committing.
 */
export function moveToteToCart(state: PlanState, toteId: string, targetCartId: string): { newState: PlanState; error?: string } {
  const tote = state.totes.find(t => t.tote_id === toteId);
  if (!tote) return { newState: state, error: 'Tote not found' };

  const sourceCartId = tote.assigned_cart_id;
  if (sourceCartId === targetCartId) return { newState: state };

  const targetCart = state.carts.find(c => c.cart_id === targetCartId);
  if (!targetCart) return { newState: state, error: 'Target cart not found' };

  // Check cart tote capacity
  if (targetCart.tote_ids.length >= state.config.maxTotesPerCart) {
    return {
      newState: state,
      error: `Cannot move tote: Cart ${targetCart.cart_code} is already at maximum capacity (${state.config.maxTotesPerCart} totes).`
    };
  }

  // P1 FIX: Check if moving this tote would separate a split order across carts.
  // All totes belonging to the same order MUST stay on the same cart.
  for (const orderId of tote.assigned_order_ids) {
    const order = state.orders.find(o => o.order_id === orderId);
    if (!order) continue;

    // Find all sibling totes for this order
    for (const siblingToteId of order.assigned_tote_ids) {
      if (siblingToteId === toteId) continue; // skip the tote we're moving
      const siblingTote = state.totes.find(t => t.tote_id === siblingToteId);
      if (siblingTote && siblingTote.assigned_cart_id !== targetCartId) {
        return {
          newState: state,
          error: `Cannot move tote: Order #${orderId} (Household #${order.household_id}) has split totes. Tote ${siblingTote.tote_code} is on ${siblingTote.assigned_cart_id}. All totes for an order must stay on the same cart.`
        };
      }
    }
  }

  // Clone and apply
  const updatedTotes = state.totes.map(t => {
    if (t.tote_id === toteId) {
      return { ...t, assigned_cart_id: targetCartId };
    }
    return t;
  });

  const updatedCarts = state.carts.map(c => {
    let tIds = [...c.tote_ids];
    if (c.cart_id === sourceCartId) {
      tIds = tIds.filter(id => id !== toteId);
    } else if (c.cart_id === targetCartId) {
      tIds.push(toteId);
    }

    const cTotes = updatedTotes.filter(t => tIds.includes(t.tote_id));
    const totalWt = cTotes.reduce((sum, t) => sum + t.total_weight_lb, 0);
    const totalItems = cTotes.reduce((sum, t) => sum + t.items.length, 0);
    const hIds = Array.from(new Set(cTotes.flatMap(t => t.assigned_household_ids)));

    return {
      ...c,
      tote_ids: tIds,
      total_totes: tIds.length,
      total_weight_lb: Math.round(totalWt * 10) / 10,
      total_items: totalItems,
      household_ids: hIds,
    };
  });

  const draftState: PlanState = {
    ...state,
    totes: updatedTotes,
    carts: updatedCarts,
    lastUpdated: Date.now(),
  };

  draftState.issues = validatePlan(draftState);
  return { newState: draftState };
}

/**
 * Update an order's status across the system
 */
export function updateOrderStatus(state: PlanState, orderId: string, status: OrderStatus): PlanState {
  const updatedOrders = state.orders.map(o => {
    if (o.order_id === orderId) {
      return { ...o, status };
    }
    return o;
  });

  return {
    ...state,
    orders: updatedOrders,
    lastUpdated: Date.now(),
  };
}

// Re-export for convenience
export { parseFlightCapacityCsv };
