// Canonical Data Types - Single Source of Truth

export type OrderStatus = 'PENDING' | 'RETAILER_SUBMITTED' | 'PICKING' | 'PACKED' | 'STAGED' | 'DISPATCHED';

export interface LineItem {
  id: string; // generated unique row id
  batch_id: string;
  order_date: string;
  order_id: string;
  household_id: string;
  destination_community: string;
  product_id: string;
  product_name: string;
  weight_lb: number;
  length_in: number;
  width_in: number;
  height_in: number;
  volume_cuin: number;
  volume_cuft: number;
  fits_tote_bounds: boolean; // checks if dimensions fit inside 23.5 x 14.0 x 11.0 in any rotation
}

export interface UnpackableItem {
  item: LineItem;
  order_id: string;
  household_id: string;
  reason: string; // e.g. "Exceeds tote dimensions in all orientations"
}

export interface HouseholdOrder {
  order_id: string;
  household_id: string;
  destination_community: string;
  order_date: string;
  batch_id: string;
  items: LineItem[]; // packable items only (after unpackable filtering)
  all_items: LineItem[]; // original complete item list from CSV
  total_weight_lb: number;
  total_volume_cuin: number;
  total_volume_cuft: number;
  item_count: number; // count of packable items
  total_item_count: number; // count of all items including unpackable
  status: OrderStatus;
  retailer_order_ref: string;
  requires_split: boolean; // true if volume > tote volume (3600 cu in)
  assigned_tote_ids: string[];
  assigned_flight_id?: string;
  is_rolled_over?: boolean;
  rollover_reason?: string;
  has_unpackable_items: boolean; // true if any item couldn't be packed
  unpackable_item_count: number;
  held_from_flight?: boolean;  // true = order is held pending staff resolution (incomplete)
  held_reason?: string;        // reason displayed in the UI
}

export interface ToteItemAllocation {
  item: LineItem;
  quantity?: number;
}

export interface Tote {
  tote_id: string;
  tote_code: string; // e.g. "TOTE-01"
  assigned_order_ids: string[];
  assigned_household_ids: string[];
  items: LineItem[];
  total_weight_lb: number;
  total_volume_cuin: number;
  volume_fill_pct: number; // based on 3600 cu in usable volume
  is_oversized_split: boolean; // part of a multi-tote order
  split_part_index?: number;
  split_total_parts?: number;
  assigned_cart_id?: string;
  assigned_flight_id?: string;
}

export interface PickerCart {
  cart_id: string;
  cart_code: string; // e.g. "CART-01"
  tote_ids: string[];
  total_totes: number;
  max_totes: number;
  total_weight_lb: number;
  total_items: number;
  household_ids: string[];
  is_completed: boolean;
}

export interface FlightDeparture {
  departure_id: string;
  departure_date: string;
  destination: string;
  aircraft_model: string; // "Cessna 208 Caravan"
  available_totes: number;
  available_payload_lb: number;
  available_volume_cuft: number;
  assigned_tote_ids: string[];
  total_weight_lb: number;
  total_volume_cuft: number; // sum of item volumes in assigned totes (estimate)
  totes_volume_cuft: number; // aircraft space occupied: assigned tote count × tote volume
  total_totes_count: number;
  payload_utilization_pct: number;
  volume_utilization_pct: number; // based on totes_volume_cuft vs available
  tote_utilization_pct: number;
  binding_constraint: 'WEIGHT' | 'SPACE' | 'TOTE_SLOTS' | 'NONE';
  is_over_capacity: boolean;
  assigned_order_ids: string[];
  rolled_over_order_ids: string[];
}

export interface PlanConfig {
  toteInnerLengthIn: number; // 23.5
  toteInnerWidthIn: number;  // 14.0
  toteInnerHeightIn: number; // 11.0
  toteUsableVolumeCuIn: number; // 3600 (~2.083 cu ft)
  toteMaxWeightLb: number; // assumed operational limit (configurable)
  maxTotesPerCart: number; // default 5, configurable
  cessnaMaxTotes: number; // 90
  cessnaMaxPayloadLb: number; // 2877 (Nakina to Webequie CYQN -> CYWP)
  cessnaCargoVolumeCuFt: number; // 187.5
}

export interface ValidationIssue {
  type: 'ERROR' | 'WARNING' | 'INFO';
  code: string;
  message: string;
  entityId?: string;
  tabTarget?: 'entry' | 'picking' | 'flight';
}

export interface RouteSpec {
  community: string;
  airport_code: string;
  one_way_nm: number;
  statute_miles_roundtrip: number;
  flight_hours: number;
  estimated_fuel_lb: number;
  available_payload_lb: number;
}

export const COMMUNITY_ROUTE_SPECS: Record<string, RouteSpec> = {
  'Webequie': {
    community: 'Webequie',
    airport_code: 'CYWP',
    one_way_nm: 169,
    statute_miles_roundtrip: 389,
    flight_hours: 2.49,
    estimated_fuel_lb: 1046,
    available_payload_lb: 2877,
  },
  'Summer Beaver': {
    community: 'Summer Beaver',
    airport_code: 'CJV7',
    one_way_nm: 167,
    statute_miles_roundtrip: 384,
    flight_hours: 2.46,
    estimated_fuel_lb: 1036,
    available_payload_lb: 2887,
  },
  'Neskantaga': {
    community: 'Neskantaga',
    airport_code: 'CYLH',
    one_way_nm: 130,
    statute_miles_roundtrip: 299,
    flight_hours: 1.96,
    estimated_fuel_lb: 861,
    available_payload_lb: 3062,
  },
};

export interface PlanState {
  rawItems: LineItem[];
  orders: HouseholdOrder[];
  totes: Tote[];
  carts: PickerCart[];
  departures: FlightDeparture[];
  unpackableItems: UnpackableItem[]; // items that could not be packed — retained in state
  config: PlanConfig;
  issues: ValidationIssue[];
  activeStage: 'stage1' | 'stage2' | 'bonus' | 'custom';
  customScheduleError?: string; // set when a multi-flight custom upload lacks a capacity CSV
  lastUpdated: number;
}
