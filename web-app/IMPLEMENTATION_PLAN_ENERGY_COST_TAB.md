# Implementation Plan: Energy Cost Tab

## 1) Objective
Create a new tab in the left sidebar for energy usage analysis and electricity bill forecasting.

The new tab should allow users to:
- View energy usage in kWh.
- Estimate electricity cost by month.
- Select custom time ranges and calculate forecasted cost for that range.

## 2) Current System Context
Relevant existing files:
- `frontend/src/components/Sidebar.jsx`
- `frontend/src/app/page.js`
- `frontend/src/components/tabs/HistoryTab.jsx`
- `frontend/src/app/api/sensor-data/route.js`
- `frontend/src/lib/dynamodb.js`

Current behavior:
- Sidebar uses `menuItems` and `activeTab` state to switch views.
- Tab rendering is controlled in `page.js` via conditional render blocks.
- Historical data is available through API endpoints and DynamoDB.

## 3) Functional Requirements
1. Add one new sidebar item named `พลังงานและค่าไฟ` with a clear icon.
2. Add one new tab view component, e.g. `EnergyCostTab.jsx`.
3. User can choose:
- Monthly mode (per month summary).
- Custom range mode (start date to end date).
4. User can configure electricity rate:
- Flat rate (THB per kWh).
- Optional service fee and optional VAT toggle.
5. System calculates and displays:
- Total energy (kWh).
- Estimated energy charge.
- Estimated total bill.
- Average daily usage and projected month-end cost.
6. Include charts and summary cards for readability.

## 4) Assumptions (Must Confirm Before Final Build)
1. DynamoDB records contain enough fields to derive power/energy, for example:
- Direct energy field (`EnergyKWh`), or
- Power field (`PowerW`) with timestamp continuity for integration.
2. Timestamp is stored in ISO format and can be safely filtered by range.
3. One record belongs to one device and can be aggregated by `DeviceId`.
4. Billing model is simplified first (flat rate), then expandable to TOU/step tariff.

## 5) Calculation Design
## 5.1 Preferred Formula (if energy is provided)
- `totalKWh = sum(EnergyKWh)` within selected period.

## 5.2 Derived Formula (if only power is provided)
- Convert each sample to kWh using interval:
- `kWh_i = (PowerW_i / 1000) * deltaHours_i`
- `totalKWh = sum(kWh_i)`

## 5.3 Cost Forecast
- `energyCharge = totalKWh * ratePerKWh`
- `subTotal = energyCharge + serviceFee`
- `vatAmount = includeVAT ? subTotal * 0.07 : 0`
- `estimatedBill = subTotal + vatAmount`

## 5.4 Monthly Projection
- `avgDailyKWh = consumedKWhSoFar / elapsedDays`
- `projectedMonthKWh = avgDailyKWh * daysInMonth`
- `projectedMonthCost = projectedMonthKWh * ratePerKWh` (then apply fee/VAT)

## 6) Technical Implementation Steps
## Phase A: UI Navigation Integration
1. Update `frontend/src/components/Sidebar.jsx`
- Add menu item id: `energy-cost`
- Label: `พลังงานและค่าไฟ`
- Icon: use `Zap` or `Calculator` from lucide-react.

2. Update `frontend/src/app/page.js`
- Import new component `EnergyCostTab`.
- Add render condition:
- `{activeTab === "energy-cost" && <EnergyCostTab />}`

## Phase B: New Tab UI
3. Create `frontend/src/components/tabs/EnergyCostTab.jsx`
- Header and short description.
- Controls:
- Device selector.
- Period mode selector (month/range).
- Date pickers.
- Rate input (THB/kWh).
- Optional service fee and VAT toggle.
- Summary cards:
- Total kWh.
- Estimated energy charge.
- Estimated total bill.
- Projection card.
- Data visualization:
- Daily usage chart and/or cumulative cost line chart.

## Phase C: Data Layer
4. Add or extend API for energy aggregation.
Option 1 (recommended): create dedicated endpoint.
- New route: `frontend/src/app/api/energy-cost/route.js`
- Query params:
- `deviceId`
- `startTime`
- `endTime`
- `ratePerKWh`
- `serviceFee`
- `includeVAT`
- Response:
- `totalKWh`, `energyCharge`, `estimatedBill`, `dailySeries`, `projection`

Option 2: reuse `sensor-data` endpoint and aggregate on client.
- Faster to prototype, but heavier payload and repeated computation.

Recommendation:
- Use Option 1 for maintainability and performance.

## Phase D: Validation and UX Hardening
5. Add input validation:
- Non-negative rate and fee.
- End date must be >= start date.
- Show empty state when no data.

6. Add loading and error states:
- Skeleton/loading cards.
- Friendly message when API fails.

7. Add localization formatting:
- Number format (kWh, THB currency).
- Date format for Thai locale if needed.

## 7) Suggested Data Contract (API Response)
```json
{
  "success": true,
  "filters": {
    "deviceId": "gateway-one",
    "startTime": "2026-03-01T00:00:00.000Z",
    "endTime": "2026-03-31T23:59:59.999Z"
  },
  "summary": {
    "totalKWh": 123.45,
    "energyCharge": 555.53,
    "serviceFee": 38.22,
    "vatAmount": 41.56,
    "estimatedBill": 635.31
  },
  "projection": {
    "avgDailyKWh": 4.2,
    "projectedMonthKWh": 130.2,
    "projectedMonthCost": 670.8
  },
  "dailySeries": [
    { "date": "2026-03-01", "kWh": 3.9, "cost": 17.55 }
  ]
}
```

## 8) Work Breakdown (Implementation Checklist)
1. Navigation and Tab wiring
- [ ] Add sidebar item in `Sidebar.jsx`
- [ ] Add tab render path in `page.js`
- [ ] Create `EnergyCostTab.jsx`

2. Data/API
- [ ] Create `api/energy-cost/route.js`
- [ ] Implement energy aggregation logic
- [ ] Implement billing + projection formulas

3. UI/UX
- [ ] Add filters and calculation controls
- [ ] Add summary cards
- [ ] Add chart section
- [ ] Add loading, empty, and error states

4. Quality
- [ ] Validate edge cases (no data, invalid range, missing fields)
- [ ] Verify calculation with fixed sample dataset
- [ ] Manual test on desktop/mobile responsive layouts

## 9) Acceptance Criteria
1. Sidebar contains a new tab that opens Energy Cost page correctly.
2. User can compute by monthly mode and custom range mode.
3. Displayed total kWh and estimated bill update correctly when filters/rate change.
4. API returns deterministic values for same input.
5. UI handles no-data and error cases without crashing.

## 10) Risks and Mitigation
1. Risk: Missing power/energy fields in raw data.
- Mitigation: Define fallback mapping and reject with clear API message when insufficient.

2. Risk: Irregular sampling intervals affect kWh accuracy.
- Mitigation: Compute with timestamp deltas instead of fixed interval assumptions.

3. Risk: Real electricity billing complexity (tiered tariff/FT/service charges).
- Mitigation: Start with flat-rate MVP; keep calculation module extensible.

## 11) Delivery Plan (MVP -> V2)
1. MVP (1 sprint)
- Sidebar + tab + flat-rate calculation + range filter + summary cards.

2. V1.1
- Daily chart and monthly projection visualization.

3. V2
- Advanced tariff engine (tier, TOU, FT, fixed fees by provider).
- Export report (CSV/PDF).

## 12) Definition of Done
- Code merged with no critical lint/runtime error.
- Feature verified with sample real sensor records.
- Basic usage instructions added to project docs.
