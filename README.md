# ZAMIIGO Northern Community Logistics Engine

**Wilderness North × Zamiigo** — A cargo logistics planning system for delivering groceries and essential goods to remote Northern Ontario communities via bush aviation.

> **Route:** Nakina (CYQN) → Webequie (CYWP) | **Aircraft:** Cessna 208 Caravan

## What It Does

This application takes a CSV of household grocery orders, packs them into returnable totes, assigns totes to picking carts, and plans multi-departure cargo flights with complete order integrity guarantees.

### Three Connected Tabs

1. **Order Entry & Retailer Staging** — Imports orders, generates formatted entries for Real Canadian Superstore, tracks fulfillment lifecycle.
2. **Order Picking & Totes** — Packs items into 23.5" × 14" × 11" returnable totes using Best-Fit Decreasing heuristic. Oversized orders are split across multiple totes. All totes for an order stay on the same cart.
3. **Flight Management** — Plans cargo loads across scheduled departures. Assigns **complete household orders atomically** — no order is split across flights. Tracks rollover to subsequent departures when capacity is exceeded.

### Key Invariants

- **Whole-order flight assignment:** All totes belonging to an order (and all orders sharing a tote) travel on the same departure.
- **Date eligibility:** An order is only assigned to a departure if `order_date ≤ departure_date`.
- **Item coverage:** Every valid item appears in exactly one tote. Unpackable items (exceeding tote dimensions) are explicitly flagged.
- **Cart integrity:** All totes for a split order stay on the same picker cart. Invalid moves are rejected before state is committed.

### AI Integration

- **Gemini-powered dispatch briefs** summarize flight loads, binding constraints, and rollover notices.
- All AI outputs are clearly labelled as advisory; deterministic fallback activates on timeout or API failure.
- API key is proxied server-side — never exposed to the browser.

## Quick Start

```bash
# Install dependencies
npm install

# Create .env with your API key
cp .env.example .env
# Edit .env to set HACKATHON_API_KEY=your-key-here

# Start development server
npm run dev
```

The app runs at `http://localhost:5173`.

## Deploying to Vercel

1. Push this repo to GitHub.
2. Import into [vercel.com](https://vercel.com).
3. Add environment variable: `HACKATHON_API_KEY` = your key.
4. Deploy. Vercel auto-detects Vite and the `api/` serverless functions.

## Uploading Judge Data

Click **Upload CSV** in the header to import:
- **Orders CSV** (required) — columns: `order_id`, `household_id`, `weight_lb`, `length_in`, `width_in`, `height_in`, etc.
- **Flight Capacity CSV** (optional) — columns: `departure_id`, `departure_date`, `available_totes`, `available_payload_lb`, `available_volume_cuft`.

If no capacity CSV is provided, the engine auto-detects single-day vs. multi-day based on distinct order dates.

## Data Files (Supplied)

| File | Purpose |
|------|---------|
| `public/data/stage1_orders.csv` | 30-order base case (single departure) |
| `public/data/stage2_orders.csv` | 120-order multi-day case (3 departures) |
| `public/data/stage2_flight_capacity.csv` | Departure schedule for Stage 2 |
| `public/data/products_reference.csv` | Product catalog with dimensions |

## Technical Architecture

- **Frontend:** React + Vite + TypeScript + Tailwind CSS
- **Backend proxy:** Vercel serverless function (`api/dispatch.ts`)
- **Packing:** Best-Fit Decreasing on volume + weight with per-item orientation checks
- **Flight planning:** Order-group-based atomic assignment with union-find for shared totes
- **Validation:** Live constraint checking across tote, cart, and flight levels

### Assumptions & Limitations

- **Tote weight limit (55 lb):** This is an assumed operational limit, not a challenge-supplied value. It is configurable in Settings.
- **Packing is heuristic-based:** Uses BFD on summed volume with orientation fit checks per item. This is a packing *estimate*, not a collision-free 3D placement. The fill percentage is labelled as estimated.
- **Flight manifests are proposed:** They require pilot and ground crew verification before dispatch.

## License

Built for the Wilderness North / Zamiigo hackathon challenge.
