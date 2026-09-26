import { HouseholdOrder } from './types';

export interface NutritionNorthAdvisory {
  category: string;
  advisoryLevel: 'HIGH_PRIORITY_REVIEW' | 'STANDARD_REVIEW' | 'EXCLUDED_NON_FOOD';
  notes: string;
}

// Advisory tagger based on keyword heuristics for northern staple groceries
export function getNutritionNorthAdvisory(productName: string): NutritionNorthAdvisory {
  const lower = productName.toLowerCase();

  // Dairy, Produce, Fresh Meat, Baby food
  if (lower.includes('milk') || lower.includes('formula') || lower.includes('infant') || 
      lower.includes('apple') || lower.includes('banana') || lower.includes('orange') || 
      lower.includes('potato') || lower.includes('carrot') || lower.includes('chicken') || 
      lower.includes('beef') || lower.includes('turkey') || lower.includes('egg') || 
      lower.includes('bread') || lower.includes('flour')) {
    return {
      category: 'Fresh Staples / Perishables',
      advisoryLevel: 'HIGH_PRIORITY_REVIEW',
      notes: 'Common Nutrition North Canada Level 1/2 staple candidate. Verify against official retailer subsidy code.'
    };
  }

  // Shelf-stable food
  if (lower.includes('seed') || lower.includes('cereal') || lower.includes('rice') || 
      lower.includes('pasta') || lower.includes('bean') || lower.includes('soup') || 
      lower.includes('butter') || lower.includes('cheese') || lower.includes('oat') ||
      lower.includes('snack') || lower.includes('bar')) {
    return {
      category: 'Ambient Grocery / Pantry',
      advisoryLevel: 'STANDARD_REVIEW',
      notes: 'Eligible grocery item. Subject to retailer regional Nutrition North subsidy schedule.'
    };
  }

  return {
    category: 'General Merchandise',
    advisoryLevel: 'STANDARD_REVIEW',
    notes: 'Review item classification at retailer checkout.'
  };
}

/**
 * Generate a formatted text string for a household order suitable for pasting into Superstore / PC Express notes
 */
export function formatRetailerOrderText(order: HouseholdOrder): string {
  const lines: string[] = [
    `=== ZAMIIGO HOUSEHOLD ORDER: #${order.household_id} ===`,
    `Zamiigo Order Ref: ${order.retailer_order_ref} (Original Order #${order.order_id})`,
    `Destination: ${order.destination_community}`,
    `Order Date: ${order.order_date} | Batch: ${order.batch_id}`,
    `Total Items: ${order.item_count} | Estimated Weight: ${order.total_weight_lb} lb`,
    `----------------------------------------------------`,
    `ITEMS TO ENTER:`
  ];

  order.items.forEach((item, idx) => {
    const advisory = getNutritionNorthAdvisory(item.product_name);
    lines.push(
      `${idx + 1}. [PID: ${item.product_id}] ${item.product_name} - ${item.weight_lb} lb (${item.length_in}"x${item.width_in}"x${item.height_in}") [${advisory.category}]`
    );
  });

  lines.push(`----------------------------------------------------`);
  lines.push(`* Pack in Zamiigo returnable totes. Keep household items separately bagged.`);
  return lines.join('\n');
}

/**
 * Generates a full CSV string of all household orders for retailer bulk upload / staging
 */
export function exportRetailerBatchCsv(orders: HouseholdOrder[]): string {
  const rows = [
    ['retailer_ref', 'household_id', 'order_id', 'order_date', 'destination', 'product_id', 'product_name', 'weight_lb', 'dimensions_in', 'nnc_advisory_category']
  ];

  for (const order of orders) {
    for (const item of order.items) {
      const advisory = getNutritionNorthAdvisory(item.product_name);
      rows.push([
        order.retailer_order_ref,
        order.household_id,
        order.order_id,
        order.order_date,
        order.destination_community,
        item.product_id,
        `"${item.product_name.replace(/"/g, '""')}"`,
        String(item.weight_lb),
        `"${item.length_in}x${item.width_in}x${item.height_in}"`,
        `"${advisory.category}"`
      ]);
    }
  }

  return rows.map(r => r.join(',')).join('\n');
}
