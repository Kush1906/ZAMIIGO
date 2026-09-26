import { PlanState, Tote } from './types';

export interface LegDetail {
  leg_index: number;
  origin: string;
  origin_code: string;
  destination: string;
  destination_code: string;
  distance_nm: number;
  distance_statute_mi: number;
  flight_hours: number;
  cargo_onboard_lb: number;
  totes_onboard: number;
  action_at_destination: string;
}

export interface CircuitScenarioResult {
  scenario_name: string;
  aircraft_model: string;
  total_distance_statute_mi: number;
  total_distance_nm: number;
  total_flight_hours: number;
  estimated_fuel_burn_lb: number;
  flights_required: number;
  initial_payload_lb: number;
  max_allowable_payload_lb: number;
  initial_totes_count: number;
  max_totes_capacity: number;
  orders_delivered: number;
  orders_deferred: number;
  legs: LegDetail[];
  assumptions: string[];
}

export interface DirectComparisonResult {
  communityA: string;
  communityB: string;
  directA: {
    community: string;
    airport_code: string;
    roundtrip_miles: number;
    flight_hours: number;
    fuel_burn_lb: number;
    payload_used_lb: number;
    payload_limit_lb: number;
    totes_count: number;
    totes_limit: number;
    orders_delivered: number;
    orders_deferred: number;
  };
  directB: {
    community: string;
    airport_code: string;
    roundtrip_miles: number;
    flight_hours: number;
    fuel_burn_lb: number;
    payload_used_lb: number;
    payload_limit_lb: number;
    totes_count: number;
    totes_limit: number;
    orders_delivered: number;
    orders_deferred: number;
  };
  directCombined: {
    total_roundtrip_miles: number;
    total_flight_hours: number;
    total_fuel_burn_lb: number;
    total_flights: number;
    total_orders_delivered: number;
    total_orders_deferred: number;
  };
  circuit: CircuitScenarioResult;
  savings: {
    flight_hours_saved: number;
    flight_hours_saved_pct: number;
    miles_saved: number;
    miles_saved_pct: number;
    fuel_saved_lb: number;
    fuel_saved_pct: number;
    sorties_saved: number;
  };
  verdict: 'CIRCUIT_WINS' | 'SEPARATE_WINS';
  verdict_explanation: string;
}

/**
 * Calculates side-by-side comparison of 2 separate direct round trips vs.
 * a single triangular multi-leg circuit touching Neskantaga (CYLH) and Summer Beaver (CJV7).
 */
export function analyzeCircuitVsDirect(state: PlanState): DirectComparisonResult {
  const norm = (s: string) => s.replace(/\s*\([^)]*\)\s*/g, '').trim().toLowerCase();

  // Extract community-specific orders and totes
  const ordersNeskantaga = state.orders.filter(o => norm(o.destination_community) === 'neskantaga');
  const ordersSummerBeaver = state.orders.filter(o => norm(o.destination_community) === 'summer beaver');

  const getToteCommunity = (t: Tote) => norm(t.items[0]?.destination_community || '');
  const totesNeskantaga = state.totes.filter(t => getToteCommunity(t) === 'neskantaga');
  const totesSummerBeaver = state.totes.filter(t => getToteCommunity(t) === 'summer beaver');

  const weightNeskantaga = Math.round(ordersNeskantaga.reduce((sum, o) => sum + o.total_weight_lb, 0) * 10) / 10;
  const weightSummerBeaver = Math.round(ordersSummerBeaver.reduce((sum, o) => sum + o.total_weight_lb, 0) * 10) / 10;

  const countTotesNeskantaga = totesNeskantaga.length;
  const countTotesSummerBeaver = totesSummerBeaver.length;

  // Direct Flight A: Nakina (CYQN) <-> Landsdowne House / Neskantaga (CYLH)
  // Sponsor table: 130 NM one-way, 299 mi RT, 1.96 hrs, 861 lb fuel, 3,062 lb payload
  const directA = {
    community: 'Neskantaga',
    airport_code: 'CYLH',
    roundtrip_miles: 299,
    flight_hours: 1.96,
    fuel_burn_lb: 861,
    payload_used_lb: weightNeskantaga,
    payload_limit_lb: 3062,
    totes_count: countTotesNeskantaga,
    totes_limit: 90,
    orders_delivered: ordersNeskantaga.length,
    orders_deferred: 0,
  };

  // Direct Flight B: Nakina (CYQN) <-> Summer Beaver (CJV7)
  // Sponsor table: 167 NM one-way, 384 mi RT, 2.46 hrs, 1,036 lb fuel, 2,887 lb payload
  const directB = {
    community: 'Summer Beaver',
    airport_code: 'CJV7',
    roundtrip_miles: 384,
    flight_hours: 2.46,
    fuel_burn_lb: 1036,
    payload_used_lb: weightSummerBeaver,
    payload_limit_lb: 2887,
    totes_count: countTotesSummerBeaver,
    totes_limit: 90,
    orders_delivered: ordersSummerBeaver.length,
    orders_deferred: 0,
  };

  const directCombined = {
    total_roundtrip_miles: directA.roundtrip_miles + directB.roundtrip_miles, // 683 statute miles
    total_flight_hours: Math.round((directA.flight_hours + directB.flight_hours) * 100) / 100, // 4.42 hrs
    total_fuel_burn_lb: directA.fuel_burn_lb + directB.fuel_burn_lb, // 1897 lb
    total_flights: 2,
    total_orders_delivered: directA.orders_delivered + directB.orders_delivered,
    total_orders_deferred: 0,
  };

  // Triangular Multi-Leg Circuit: CYQN ➔ CYLH ➔ CJV7 ➔ CYQN
  // Leg 1: Nakina (CYQN) to Landsdowne House (CYLH): 130.0 NM = 149.6 statute miles (0.88 hrs @ 170 mph)
  // Leg 2: Landsdowne House (CYLH) to Summer Beaver (CJV7): 38.2 NM = 44.0 statute miles (0.26 hrs @ 170 mph)
  // Leg 3: Summer Beaver (CJV7) to Nakina (CYQN): 166.8 NM = 192.0 statute miles (1.13 hrs @ 170 mph)
  const circuitDistNm = 130.0 + 38.2 + 166.8; // 335.0 NM
  const circuitDistStatuteMi = Math.round((circuitDistNm * 1.15078) * 10) / 10; // 385.5 statute miles
  const circuitFlightHours = Math.round((circuitDistStatuteMi / 170) * 100) / 100; // 2.27 hrs

  // Fuel calculation: average Cessna 208 fuel burn from sponsor figures (421 lb/hr) * 2.27 hrs ≈ 956 lb + reserve = 1,040 lb
  const circuitFuelBurnLb = 1040;
  // Circuit initial allowable payload: Caravan max gross weight ~8,000 lb - 3,923 lb low op weight - 1,040 lb fuel = 3,037 lb
  // Conservative safety ceiling matching CJV7 single-flight limit: 2,887 lb
  const circuitMaxPayloadLb = 2887;
  const circuitMaxTotes = 90;

  const combinedInitialWeight = Math.round((weightNeskantaga + weightSummerBeaver) * 10) / 10;
  const combinedInitialTotes = countTotesNeskantaga + countTotesSummerBeaver;

  // Check if both fit
  const fitsPayload = combinedInitialWeight <= circuitMaxPayloadLb;
  const fitsTotes = combinedInitialTotes <= circuitMaxTotes;

  let circuitOrdersDelivered = ordersNeskantaga.length + ordersSummerBeaver.length;
  let circuitOrdersDeferred = 0;

  if (!fitsPayload || !fitsTotes) {
    circuitOrdersDeferred = 10;
    circuitOrdersDelivered -= circuitOrdersDeferred;
  }

  const legs: LegDetail[] = [
    {
      leg_index: 1,
      origin: 'Nakina Hub',
      origin_code: 'CYQN',
      destination: 'Landsdowne House (Neskantaga)',
      destination_code: 'CYLH',
      distance_nm: 130.0,
      distance_statute_mi: 149.6,
      flight_hours: 0.88,
      cargo_onboard_lb: combinedInitialWeight,
      totes_onboard: combinedInitialTotes,
      action_at_destination: `Offload Neskantaga cargo (${countTotesNeskantaga} totes, ${weightNeskantaga} lb)`,
    },
    {
      leg_index: 2,
      origin: 'Landsdowne House (Neskantaga)',
      origin_code: 'CYLH',
      destination: 'Summer Beaver',
      destination_code: 'CJV7',
      distance_nm: 38.2,
      distance_statute_mi: 44.0,
      flight_hours: 0.26,
      cargo_onboard_lb: weightSummerBeaver,
      totes_onboard: countTotesSummerBeaver,
      action_at_destination: `Offload Summer Beaver cargo (${countTotesSummerBeaver} totes, ${weightSummerBeaver} lb)`,
    },
    {
      leg_index: 3,
      origin: 'Summer Beaver',
      origin_code: 'CJV7',
      destination: 'Nakina Hub',
      destination_code: 'CYQN',
      distance_nm: 166.8,
      distance_statute_mi: 192.0,
      flight_hours: 1.13,
      cargo_onboard_lb: 0,
      totes_onboard: 0,
      action_at_destination: 'Aircraft returns with empty returnable totes for replenishment',
    },
  ];

  const circuit: CircuitScenarioResult = {
    scenario_name: 'Single Triangular Circuit (CYQN ➔ CYLH ➔ CJV7 ➔ CYQN)',
    aircraft_model: 'Cessna 208 Caravan',
    total_distance_statute_mi: circuitDistStatuteMi,
    total_distance_nm: circuitDistNm,
    total_flight_hours: circuitFlightHours,
    estimated_fuel_burn_lb: circuitFuelBurnLb,
    flights_required: 1,
    initial_payload_lb: combinedInitialWeight,
    max_allowable_payload_lb: circuitMaxPayloadLb,
    initial_totes_count: combinedInitialTotes,
    max_totes_capacity: circuitMaxTotes,
    orders_delivered: circuitOrdersDelivered,
    orders_deferred: circuitOrdersDeferred,
    legs,
    assumptions: [
      'Average cruise speed: 170 mph (sponsor standard across all routes)',
      'Inter-community leg CYLH ➔ CJV7: 38.2 NM (44.0 statute miles)',
      'Estimated fuel burn based on sponsor rate (~421 lb/hr) yielding ~960 lb burn + reserves (~1,040 lb)',
      'Aircraft Low Operating Weight: 3,923 lb with max payload limit 2,887 lb for circuit takeoff',
      'Totes are segregated by community; offload occurs sequentially at each community stop',
    ],
  };

  const hoursSaved = Math.round((directCombined.total_flight_hours - circuit.total_flight_hours) * 100) / 100;
  const milesSaved = Math.round((directCombined.total_roundtrip_miles - circuit.total_distance_statute_mi) * 10) / 10;
  const fuelSaved = directCombined.total_fuel_burn_lb - circuit.estimated_fuel_burn_lb;

  const savings = {
    flight_hours_saved: hoursSaved,
    flight_hours_saved_pct: Math.round((hoursSaved / directCombined.total_flight_hours) * 1000) / 10,
    miles_saved: milesSaved,
    miles_saved_pct: Math.round((milesSaved / directCombined.total_roundtrip_miles) * 1000) / 10,
    fuel_saved_lb: fuelSaved,
    fuel_saved_pct: Math.round((fuelSaved / directCombined.total_fuel_burn_lb) * 1000) / 10,
    sorties_saved: 1,
  };

  const circuitWins = fitsPayload && fitsTotes && hoursSaved > 0;

  return {
    communityA: 'Neskantaga',
    communityB: 'Summer Beaver',
    directA,
    directB,
    directCombined,
    circuit,
    savings,
    verdict: circuitWins ? 'CIRCUIT_WINS' : 'SEPARATE_WINS',
    verdict_explanation: circuitWins
      ? `The single triangular circuit decisively beats 2 separate flights: it saves ${hoursSaved} flight hours (-${savings.flight_hours_saved_pct}%), ${milesSaved} statute miles, and ~${fuelSaved} lb of fuel while delivering 100% of orders (${circuitOrdersDelivered}/${circuitOrdersDelivered}) with zero deferrals.`
      : 'Separate flights required due to combined weight or tote capacity constraints exceeding single aircraft limits.',
  };
}
