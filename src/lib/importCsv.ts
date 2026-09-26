import Papa from 'papaparse';
import { LineItem } from './types';

export const DEFAULT_TOTE_DIMS = [23.5, 14.0, 11.0].sort((a, b) => b - a);

export interface ParseResult {
  success: boolean;
  items: LineItem[];
  errors: string[];
  warnings: string[];
  rejectedRows: { rowNum: number; reason: string }[];
  stats: {
    rowCount: number;
    orderCount: number;
    householdCount: number;
    totalWeightLb: number;
    totalVolumeCuFt: number;
    oversizedItemCount: number;
    rejectedRowCount: number;
  };
}

export function parseOrdersCsv(csvText: string): ParseResult {
  const result = Papa.parse<Record<string, any>>(csvText.trim(), {
    header: true,
    skipEmptyLines: 'greedy',
    dynamicTyping: false,
  });

  const errors: string[] = [];
  const warnings: string[] = [];
  const items: LineItem[] = [];
  const rejectedRows: { rowNum: number; reason: string }[] = [];

  if (result.errors && result.errors.length > 0) {
    result.errors.forEach(err => {
      errors.push(`Row ${err.row ?? '?'}: ${err.message}`);
    });
  }

  if (!result.data || result.data.length === 0) {
    return {
      success: false,
      items: [],
      errors: ['The uploaded CSV file contains no data rows.'],
      warnings: [],
      rejectedRows: [],
      stats: { rowCount: 0, orderCount: 0, householdCount: 0, totalWeightLb: 0, totalVolumeCuFt: 0, oversizedItemCount: 0, rejectedRowCount: 0 }
    };
  }

  const sampleRow = result.data[0];

  // Detect key column names with tolerance for variants
  const findKey = (candidates: string[]): string | undefined => {
    return Object.keys(sampleRow).find(orig => candidates.includes(orig.trim().toLowerCase()));
  };

  const colOrderId = findKey(['order_id', 'orderid', 'order #', 'order_number']);
  const colHouseholdId = findKey(['household_id', 'householdid', 'household #', 'customer_id', 'client_id']);
  const colWeight = findKey(['weight_lb', 'weight', 'weight_lbs', 'weight(lb)', 'weight(lbs)']);
  const colLength = findKey(['length_in', 'length', 'length(in)', 'len_in']);
  const colWidth = findKey(['width_in', 'width', 'width(in)', 'wid_in']);
  const colHeight = findKey(['height_in', 'height', 'height(in)', 'hgt_in']);
  const colProdName = findKey(['product_name', 'product', 'item_name', 'item', 'description']);
  const colProdId = findKey(['product_id', 'productid', 'sku', 'item_id']);
  const colBatchId = findKey(['batch_id', 'batch', 'batchid']);
  const colOrderDate = findKey(['order_date', 'date', 'orderdate']);
  const colDest = findKey(['destination_community', 'destination', 'community']);

  // Required columns check
  const missingCols: string[] = [];
  if (!colOrderId) missingCols.push('order_id');
  if (!colHouseholdId) missingCols.push('household_id');
  if (!colWeight) missingCols.push('weight_lb');
  // All three dimension columns must be present if any one is present
  const hasSomeDimCol = colLength || colWidth || colHeight;
  const hasAllDimCols = colLength && colWidth && colHeight;
  if (hasSomeDimCol && !hasAllDimCols) {
    missingCols.push('all three dimension columns (length_in, width_in, height_in)');
  }

  if (missingCols.length > 0) {
    return {
      success: false,
      items: [],
      errors: [`Missing required CSV columns: ${missingCols.join(', ')}. Found columns: ${Object.keys(sampleRow).join(', ')}`],
      warnings: [],
      rejectedRows: [],
      stats: { rowCount: 0, orderCount: 0, householdCount: 0, totalWeightLb: 0, totalVolumeCuFt: 0, oversizedItemCount: 0, rejectedRowCount: 0 }
    };
  }

  const hasDimensions = !!(colLength && colWidth && colHeight);

  const uniqueOrders = new Set<string>();
  const uniqueHouseholds = new Set<string>();
  let totalWeight = 0;
  let totalVolumeCuIn = 0;
  let oversizedItems = 0;

  result.data.forEach((row, idx) => {
    const rowNum = idx + 2; // 1-indexed header is row 1
    const orderId = String(row[colOrderId!] ?? '').trim();
    const householdId = String(row[colHouseholdId!] ?? '').trim();

    // Reject rows with missing IDs
    if (!orderId || !householdId) {
      rejectedRows.push({ rowNum, reason: 'Missing order_id or household_id' });
      return;
    }

    // Validate weight: must be a finite positive number
    const rawWeight = row[colWeight!];
    const weightLb = parseFloat(rawWeight);
    if (!isFinite(weightLb) || weightLb <= 0) {
      rejectedRows.push({ rowNum, reason: `Invalid or non-positive weight_lb: "${rawWeight}" — must be a positive number` });
      return;
    }

    // Validate dimensions: must be finite positive numbers when dimension columns exist
    let lengthIn = 0, widthIn = 0, heightIn = 0;
    if (hasDimensions) {
      const rawL = row[colLength!], rawW = row[colWidth!], rawH = row[colHeight!];
      lengthIn = parseFloat(rawL);
      widthIn = parseFloat(rawW);
      heightIn = parseFloat(rawH);

      if (!isFinite(lengthIn) || !isFinite(widthIn) || !isFinite(heightIn) ||
          lengthIn <= 0 || widthIn <= 0 || heightIn <= 0) {
        rejectedRows.push({ rowNum, reason: `Invalid or non-positive dimensions: L="${rawL}" W="${rawW}" H="${rawH}" — all three must be positive numbers` });
        return;
      }
    }

    const volumeCuIn = lengthIn * widthIn * heightIn;
    const volumeCuFt = volumeCuIn / 1728;

    // Check orientation fit inside tote (23.5 x 14.0 x 11.0 in)
    let fitsToteBounds = true;
    if (hasDimensions) {
      const itemDimsSorted = [lengthIn, widthIn, heightIn].sort((a, b) => b - a);
      fitsToteBounds = (
        itemDimsSorted[0] <= DEFAULT_TOTE_DIMS[0] &&
        itemDimsSorted[1] <= DEFAULT_TOTE_DIMS[1] &&
        itemDimsSorted[2] <= DEFAULT_TOTE_DIMS[2]
      );

      if (!fitsToteBounds) {
        oversizedItems++;
        if (oversizedItems <= 5) {
          warnings.push(`Row ${rowNum} (${row[colProdName!] || 'Item'}): Dimensions ${lengthIn}"x${widthIn}"x${heightIn}" exceed tote inner envelope (${DEFAULT_TOTE_DIMS.join('"x')}") in all orientations. Item will be flagged as individually unpackable.`);
        }
      }
    }

    const lineItem: LineItem = {
      id: `item-${idx + 1}`,
      batch_id: colBatchId ? String(row[colBatchId] ?? '1').trim() : '1',
      order_date: colOrderDate ? String(row[colOrderDate] ?? '2026-06-01').trim() : '2026-06-01',
      order_id: orderId,
      household_id: householdId,
      destination_community: colDest ? String(row[colDest] ?? 'Webequie').trim() : 'Webequie',
      product_id: colProdId ? String(row[colProdId] ?? '').trim() : String(idx + 1),
      product_name: colProdName ? String(row[colProdName] ?? 'Grocery Item').trim() : 'Grocery Item',
      weight_lb: Math.round(weightLb * 10000) / 10000,
      length_in: lengthIn,
      width_in: widthIn,
      height_in: heightIn,
      volume_cuin: Math.round(volumeCuIn * 10) / 10,
      volume_cuft: Math.round(volumeCuFt * 1000) / 1000,
      fits_tote_bounds: fitsToteBounds,
    };

    items.push(lineItem);
    uniqueOrders.add(orderId);
    uniqueHouseholds.add(householdId);
    totalWeight += weightLb;
    totalVolumeCuIn += volumeCuIn;
  });

  // Surface rejected rows as errors (blocking — not just notices)
  if (rejectedRows.length > 0) {
    errors.push(`${rejectedRows.length} row(s) rejected due to invalid data:`);
    for (const rr of rejectedRows.slice(0, 8)) {
      errors.push(`  Row ${rr.rowNum}: ${rr.reason}`);
    }
    if (rejectedRows.length > 8) {
      errors.push(`  ... and ${rejectedRows.length - 8} more rejected rows.`);
    }
  }

  const hasBlockingErrors = errors.length > 0;

  return {
    // success only if no blocking errors AND at least one item parsed
    success: !hasBlockingErrors && items.length > 0,
    items,
    errors: items.length === 0 && errors.length === 0
      ? ['All rows were rejected. No valid items could be parsed.']
      : errors,
    warnings,
    rejectedRows,
    stats: {
      rowCount: items.length,
      orderCount: uniqueOrders.size,
      householdCount: uniqueHouseholds.size,
      totalWeightLb: Math.round(totalWeight * 10) / 10,
      totalVolumeCuFt: Math.round((totalVolumeCuIn / 1728) * 10) / 10,
      oversizedItemCount: oversizedItems,
      rejectedRowCount: rejectedRows.length,
    }
  };
}
