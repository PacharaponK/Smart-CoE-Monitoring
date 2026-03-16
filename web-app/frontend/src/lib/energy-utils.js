/**
 * Utility functions for Energy and Cost calculations on the frontend
 */

/**
 * Calculate Thai Base Electricity Charge (Residential - Step Tier Type 1.1.2)
 * Ref: MEA/PEA Rates
 */
export function calculateBaseCharge(totalKWh) {
  const units = parseFloat(totalKWh) || 0;
  if (units <= 0) return 0;
  
  let charge = 0;
  let remaining = units;

  // Tier 1: 1-150 kWh @ 3.2484 THB
  const tier1Units = Math.min(remaining, 150);
  charge += tier1Units * 3.2484;
  remaining -= tier1Units;

  // Tier 2: 151-400 kWh @ 4.2233 THB (next 250 units)
  if (remaining > 0) {
    const tier2Units = Math.min(remaining, 250);
    charge += tier2Units * 4.2233;
    remaining -= tier2Units;
  }

  // Tier 3: Over 400 kWh @ 4.4217 THB
  if (remaining > 0) {
    charge += remaining * 4.4217;
  }

  return charge;
}

/**
 * Process raw sensor data to calculate energy summary and daily series
 * Modified: Now strictly uses 'light' sensor status for calculation (1=ON/100W, 0=OFF/0W)
 */
export function processEnergyData(items, filters) {
  const { deviceId, startTime, endTime } = filters;
  
  // Input validation and parsing
  const ftRate = parseFloat(filters.ftRate ?? 0.3972) || 0;
  const serviceCharge = parseFloat(filters.serviceCharge ?? 38.22) || 0;
  const vatRate = 0.07;
  
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();

  if (isNaN(start) || isNaN(end)) return null;

  // 1. Filter by Time Range and Device (if specified)
  const targetDevice = (deviceId || "").toString().trim().toLowerCase();
  let filteredItems = items.filter(item => {
    const itemTimestamp = item.Timestamp || item.timestamp;
    if (!itemTimestamp) return false;
    
    const itemTime = new Date(itemTimestamp).getTime();
    if (itemTime < start || itemTime > end) return false;

    if (targetDevice && targetDevice !== "") {
      const itemDevice = (item.DeviceId || item.deviceId || "").toString().trim().toLowerCase();
      return itemDevice === targetDevice;
    }
    return true;
  });

  // 2. Filter ONLY 'light' type data
  let lightItems = filteredItems.filter(item => {
    const type = (item.SensorType || item.sensorType || "").toLowerCase();
    return type === "light";
  });

  let warnings = [];
  if (lightItems.length === 0) {
    warnings.push("ไม่พบข้อมูล 'สถานะไฟ' ในช่วงเวลาที่เลือก");
    return { 
      summary: { totalKWh: 0, baseCharge: 0, ftRate, ftCharge: 0, serviceCharge, vatAmount: 0, totalBill: 0 }, 
      dailySeries: [], 
      warnings 
    };
  }

  // 3. Group by Device to calculate energy per device
  const deviceGroups = {};
  lightItems.forEach(item => {
    const id = (item.DeviceId || item.deviceId || "unknown").toString();
    if (!deviceGroups[id]) deviceGroups[id] = [];
    deviceGroups[id].push({
      ...item,
      Timestamp: item.Timestamp || item.timestamp,
      PowerW: Number(item.SensorValue ?? item.sensorValue ?? 0) === 1 ? 100 : 0
    });
  });

  let totalKWh = 0;
  let dailyMap = {};
  
  // Pre-fill all dates in range
  const iter = new Date(start);
  const endIter = new Date(end);
  iter.setHours(0, 0, 0, 0);
  while (iter <= endIter) {
    dailyMap[iter.toISOString().split('T')[0]] = { kWh: 0 };
    iter.setDate(iter.getDate() + 1);
  }

  const MAX_GAP_HOURS = 2;

  // 4. Calculate energy for each device and aggregate
  Object.keys(deviceGroups).forEach(id => {
    const sorted = deviceGroups[id].sort((a, b) => new Date(a.Timestamp) - new Date(b.Timestamp));
    
    for (let i = 1; i < sorted.length; i++) {
      const curr = sorted[i];
      const prev = sorted[i-1];
      
      const t1 = new Date(prev.Timestamp).getTime();
      const t2 = new Date(curr.Timestamp).getTime();
      const deltaHours = (t2 - t1) / (1000 * 3600);
      
      if (deltaHours > 0 && deltaHours <= MAX_GAP_HOURS) {
        const avgPowerW = (prev.PowerW + curr.PowerW) / 2;
        const kwhDelta = (avgPowerW / 1000) * deltaHours;
        
        totalKWh += kwhDelta;
        const date = curr.Timestamp.split('T')[0];
        if (dailyMap[date]) dailyMap[date].kWh += kwhDelta;
      }
    }
  });

  // Final Financial Calculations
  const baseCharge = calculateBaseCharge(totalKWh);
  const ftCharge = totalKWh * ftRate;
  const serviceChargeValue = serviceCharge; 
  const subTotal = baseCharge + ftCharge + serviceChargeValue;
  const vatAmount = subTotal * vatRate;
  const totalBill = subTotal + vatAmount;

  const dailySeries = Object.keys(dailyMap).map(date => {
    const kWh = dailyMap[date].kWh;
    const dayBase = calculateBaseCharge(kWh);
    const dayFt = kWh * ftRate;
    // Daily view shows proportional service charge for context
    const dayTotal = (dayBase + dayFt + (serviceCharge / 30)) * (1 + vatRate);
    return {
      date,
      kWh: parseFloat(kWh.toFixed(4)),
      cost: parseFloat(dayTotal.toFixed(2))
    };
  }).sort((a, b) => a.date.localeCompare(b.date));

  return {
    summary: {
      totalKWh: parseFloat(totalKWh.toFixed(2)),
      baseCharge: parseFloat(baseCharge.toFixed(2)),
      ftRate,
      ftCharge: parseFloat(ftCharge.toFixed(2)),
      serviceCharge: serviceChargeValue,
      vatAmount: parseFloat(vatAmount.toFixed(2)),
      totalBill: parseFloat(totalBill.toFixed(2))
    },
    dailySeries,
    warnings
  };
}
