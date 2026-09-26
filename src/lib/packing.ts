import { LineItem, HouseholdOrder, Tote, PickerCart, PlanConfig, UnpackableItem } from './types';

export const DEFAULT_PLAN_CONFIG: PlanConfig = {
  toteInnerLengthIn: 23.5,
  toteInnerWidthIn: 14.0,
  toteInnerHeightIn: 11.0,
  toteUsableVolumeCuIn: 3600.0, // ~2.083 cu ft
  toteMaxWeightLb: 55.0, // Assumed operational limit per tote — configurable, not a challenge-supplied value
  maxTotesPerCart: 5, // Default 5 totes per cart, configurable
  cessnaMaxTotes: 90,
  cessnaMaxPayloadLb: 2877.0, // CYQN to CYWP roundtrip payload allowance
  cessnaCargoVolumeCuFt: 187.5,
};

export interface PackingResult {
  orders: HouseholdOrder[];
  totes: Tote[];
  carts: PickerCart[];
  splitOrdersCount: number;
  unpackableItems: UnpackableItem[]; // Items that exceed tote dimensions — retained with order/household ID
}

/**
 * Group raw line items into distinct Household Orders.
 * Preserves ALL items (including those that may be unpackable) in all_items.
 */
export function groupItemsIntoOrders(items: LineItem[], usableToteVol = 3600.0): HouseholdOrder[] {
  const orderMap = new Map<string, {
    order_id: string;
    household_id: string;
    destination_community: string;
    order_date: string;
    batch_id: string;
    items: LineItem[];
    weight: number;
    volume: number;
  }>();

  for (const item of items) {
    const key = `${item.order_id}_${item.household_id}`;
    if (!orderMap.has(key)) {
      orderMap.set(key, {
        order_id: item.order_id,
        household_id: item.household_id,
        destination_community: item.destination_community,
        order_date: item.order_date,
        batch_id: item.batch_id,
        items: [],
        weight: 0,
        volume: 0,
      });
    }
    const orderObj = orderMap.get(key)!;
    orderObj.items.push(item);
    orderObj.weight += item.weight_lb;
    orderObj.volume += item.volume_cuin;
  }

  const orders: HouseholdOrder[] = [];
  for (const [, o] of orderMap.entries()) {
    const reqSplit = o.volume > usableToteVol;
    orders.push({
      order_id: o.order_id,
      household_id: o.household_id,
      destination_community: o.destination_community,
      order_date: o.order_date,
      batch_id: o.batch_id,
      items: o.items,       // will be filtered to packable-only in packing step
      all_items: [...o.items], // always the original full list from the CSV
      total_weight_lb: Math.round(o.weight * 100) / 100,
      total_volume_cuin: Math.round(o.volume * 10) / 10,
      total_volume_cuft: Math.round((o.volume / 1728) * 100) / 100,
      item_count: o.items.length,
      total_item_count: o.items.length,
      status: 'RETAILER_SUBMITTED',
      retailer_order_ref: `RCS-${o.household_id}-${o.order_id.slice(-4)}`,
      requires_split: reqSplit,
      assigned_tote_ids: [],
      has_unpackable_items: false,
      unpackable_item_count: 0,
    });
  }

  // Sort orders deterministically by date, batch, order_id
  orders.sort((a, b) => {
    if (a.order_date !== b.order_date) return a.order_date.localeCompare(b.order_date);
    if (a.batch_id !== b.batch_id) return a.batch_id.localeCompare(b.batch_id);
    return a.order_id.localeCompare(b.order_id);
  });

  return orders;
}

/**
 * Packs household orders into totes:
 * 1. Identifies individually unpackable items (exceed tote dims). Keeps them in order.all_items
 *    but removes from packing. Marks the order with has_unpackable_items = true.
 * 2. Splits oversized orders (> 3600 cu in or > toteMaxWeightLb) into sequential part totes.
 * 3. Packs standard orders into shared totes using Best-Fit Decreasing heuristic.
 * 4. Assigns totes to carts keeping all totes for an order on the same cart.
 */
export function packOrdersIntoTotesAndCarts(
  ordersInput: HouseholdOrder[],
  config: PlanConfig = DEFAULT_PLAN_CONFIG
): PackingResult {
  const orders = ordersInput.map(o => ({
    ...o,
    items: [...o.items],       // mutable copy of items
    all_items: [...o.all_items], // preserve originals
    assigned_tote_ids: [] as string[]
  }));
  const totes: Tote[] = [];
  const unpackableItems: UnpackableItem[] = [];
  let toteSeq = 1;
  let splitCount = 0;

  // Step 1: Separate individually unpackable items from packable items.
  // An unpackable item is flagged as !fits_tote_bounds AND has real dimensions.
  // IMPORTANT: We keep all_items intact; only items[] (used for packing) is filtered.
  for (const order of orders) {
    const packable: LineItem[] = [];
    for (const item of order.items) {
      if (!item.fits_tote_bounds && item.length_in > 0 && item.width_in > 0 && item.height_in > 0) {
        unpackableItems.push({
          item,
          order_id: order.order_id,
          household_id: order.household_id,
          reason: `Dimensions ${item.length_in}"×${item.width_in}"×${item.height_in}" exceed tote envelope (23.5"×14"×11") in all orientations`,
        });
      } else {
        packable.push(item);
      }
    }

    const unpackableCount = order.items.length - packable.length;
    if (unpackableCount > 0) {
      order.has_unpackable_items = true;
      order.unpackable_item_count = unpackableCount;
    }

    // Update items to packable-only; recalculate totals from packable items
    order.items = packable;
    order.total_weight_lb = Math.round(packable.reduce((s, i) => s + i.weight_lb, 0) * 100) / 100;
    order.total_volume_cuin = Math.round(packable.reduce((s, i) => s + i.volume_cuin, 0) * 10) / 10;
    order.total_volume_cuft = Math.round((order.total_volume_cuin / 1728) * 100) / 100;
    order.item_count = packable.length;
    // total_item_count stays as the original count (all_items.length)
  }

  // Separate oversized orders (requiring split) from standard single-tote orders
  const oversizedOrders: HouseholdOrder[] = [];
  const standardOrders: HouseholdOrder[] = [];

  for (const order of orders) {
    if (order.items.length === 0) continue; // skip orders with no packable items
    if (order.total_volume_cuin > config.toteUsableVolumeCuIn || order.total_weight_lb > config.toteMaxWeightLb) {
      oversizedOrders.push(order);
    } else {
      standardOrders.push(order);
    }
  }

  // Step 2: Handle oversized orders — split items across multiple dedicated totes
  for (const order of oversizedOrders) {
    splitCount++;
    order.requires_split = true;
    
    // Sort items largest volume first to pack greedily
    const sortedItems = [...order.items].sort((a, b) => b.volume_cuin - a.volume_cuin);

    let currentToteItems: LineItem[] = [];
    let currentToteVol = 0;
    let currentToteWt = 0;
    const orderToteIds: string[] = [];

    const flushTote = () => {
      if (currentToteItems.length === 0) return;
      const toteId = `TOTE-${String(toteSeq).padStart(3, '0')}`;
      toteSeq++;
      orderToteIds.push(toteId);

      totes.push({
        tote_id: toteId,
        tote_code: toteId,
        assigned_order_ids: [order.order_id],
        assigned_household_ids: [order.household_id],
        items: [...currentToteItems],
        total_weight_lb: Math.round(currentToteWt * 100) / 100,
        total_volume_cuin: Math.round(currentToteVol * 10) / 10,
        volume_fill_pct: Math.min(100, Math.round((currentToteVol / config.toteUsableVolumeCuIn) * 100)),
        is_oversized_split: true,
      });

      currentToteItems = [];
      currentToteVol = 0;
      currentToteWt = 0;
    };

    for (const item of sortedItems) {
      const wouldExceedVol = (currentToteVol + item.volume_cuin) > config.toteUsableVolumeCuIn;
      const wouldExceedWt = (currentToteWt + item.weight_lb) > config.toteMaxWeightLb;

      if ((wouldExceedVol || wouldExceedWt) && currentToteItems.length > 0) {
        flushTote();
      }

      currentToteItems.push(item);
      currentToteVol += item.volume_cuin;
      currentToteWt += item.weight_lb;
    }
    flushTote();

    // Mark split parts metadata
    order.assigned_tote_ids = orderToteIds;
    const totalParts = orderToteIds.length;
    orderToteIds.forEach((tId, idx) => {
      const t = totes.find(x => x.tote_id === tId);
      if (t) {
        t.split_part_index = idx + 1;
        t.split_total_parts = totalParts;
      }
    });
  }

  // Step 3: Handle standard orders — Best-Fit Decreasing packing into shared totes
  // CRITICAL: Only share totes between orders headed to the SAME destination community.
  standardOrders.sort((a, b) => b.total_volume_cuin - a.total_volume_cuin);

  interface OpenTote {
    tote_id: string;
    tote_code: string;
    destination_community: string; // all orders in this tote must share this destination
    orders: HouseholdOrder[];
    items: LineItem[];
    weight: number;
    volume: number;
  }

  const openTotes: OpenTote[] = [];

  for (const order of standardOrders) {
    let bestToteIdx = -1;
    let minRemainingVol = Infinity;

    for (let i = 0; i < openTotes.length; i++) {
      const t = openTotes[i];
      // P0 FIX: NEVER mix destinations inside one tote
      if (t.destination_community !== order.destination_community) continue;

      const newVol = t.volume + order.total_volume_cuin;
      const newWt = t.weight + order.total_weight_lb;

      if (newVol <= config.toteUsableVolumeCuIn && newWt <= config.toteMaxWeightLb) {
        const remaining = config.toteUsableVolumeCuIn - newVol;
        if (remaining < minRemainingVol) {
          minRemainingVol = remaining;
          bestToteIdx = i;
        }
      }
    }

    if (bestToteIdx !== -1) {
      const t = openTotes[bestToteIdx];
      t.orders.push(order);
      t.items.push(...order.items);
      t.weight += order.total_weight_lb;
      t.volume += order.total_volume_cuin;
      order.assigned_tote_ids = [t.tote_id];
    } else {
      const toteId = `TOTE-${String(toteSeq).padStart(3, '0')}`;
      toteSeq++;
      openTotes.push({
        tote_id: toteId,
        tote_code: toteId,
        destination_community: order.destination_community,
        orders: [order],
        items: [...order.items],
        weight: order.total_weight_lb,
        volume: order.total_volume_cuin,
      });
      order.assigned_tote_ids = [toteId];
    }
  }

  // Convert open totes to Tote instances
  for (const ot of openTotes) {
    totes.push({
      tote_id: ot.tote_id,
      tote_code: ot.tote_code,
      assigned_order_ids: ot.orders.map(o => o.order_id),
      assigned_household_ids: Array.from(new Set(ot.orders.map(o => o.household_id))),
      items: ot.items,
      total_weight_lb: Math.round(ot.weight * 100) / 100,
      total_volume_cuin: Math.round(ot.volume * 10) / 10,
      volume_fill_pct: Math.min(100, Math.round((ot.volume / config.toteUsableVolumeCuIn) * 100)),
      is_oversized_split: false,
    });
  }

  totes.sort((a, b) => a.tote_code.localeCompare(b.tote_code));

  // Step 4: Assign totes to Picker Carts
  // CRITICAL RULE: Keep every tote for a given order on the same cart
  const carts: PickerCart[] = [];
  let cartSeq = 1;
  const assignedToteToCart = new Map<string, string>();

  let currentCartTotes: Tote[] = [];

  const flushCart = () => {
    if (currentCartTotes.length === 0) return;
    const cartId = `CART-${String(cartSeq).padStart(2, '0')}`;
    cartSeq++;

    const cartToteIds = currentCartTotes.map(t => t.tote_id);
    const cartItems = currentCartTotes.flatMap(t => t.items);
    const cartHouseholds = Array.from(new Set(currentCartTotes.flatMap(t => t.assigned_household_ids)));
    const totalWt = currentCartTotes.reduce((sum, t) => sum + t.total_weight_lb, 0);

    currentCartTotes.forEach(t => {
      t.assigned_cart_id = cartId;
      assignedToteToCart.set(t.tote_id, cartId);
    });

    carts.push({
      cart_id: cartId,
      cart_code: cartId,
      tote_ids: cartToteIds,
      total_totes: cartToteIds.length,
      max_totes: config.maxTotesPerCart,
      total_weight_lb: Math.round(totalWt * 10) / 10,
      total_items: cartItems.length,
      household_ids: cartHouseholds,
      is_completed: false,
    });

    currentCartTotes = [];
  };

  // Build connected tote clusters for multi-tote orders
  const toteAdjacency = new Map<string, Set<string>>();
  for (const t of totes) {
    if (!toteAdjacency.has(t.tote_id)) toteAdjacency.set(t.tote_id, new Set());
    for (const ordId of t.assigned_order_ids) {
      const order = orders.find(o => o.order_id === ordId);
      if (order && order.assigned_tote_ids.length > 1) {
        order.assigned_tote_ids.forEach(siblingId => {
          toteAdjacency.get(t.tote_id)!.add(siblingId);
        });
      }
    }
  }

  const visitedTotes = new Set<string>();
  const toteClusters: Tote[][] = [];

  for (const t of totes) {
    if (visitedTotes.has(t.tote_id)) continue;
    const cluster: Tote[] = [];
    const queue = [t.tote_id];
    visitedTotes.add(t.tote_id);

    while (queue.length > 0) {
      const curId = queue.shift()!;
      const curTote = totes.find(x => x.tote_id === curId);
      if (curTote) cluster.push(curTote);

      const neighbors = toteAdjacency.get(curId) || new Set();
      for (const n of neighbors) {
        if (!visitedTotes.has(n)) {
          visitedTotes.add(n);
          queue.push(n);
        }
      }
    }
    toteClusters.push(cluster);
  }

  for (const cluster of toteClusters) {
    if (currentCartTotes.length + cluster.length > config.maxTotesPerCart && currentCartTotes.length > 0) {
      flushCart();
    }
    currentCartTotes.push(...cluster);
  }
  flushCart();

  return {
    orders,
    totes,
    carts,
    splitOrdersCount: splitCount,
    unpackableItems,
  };
}
