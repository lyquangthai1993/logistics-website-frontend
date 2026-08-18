// test-capacity-math.mjs
// Empirical test harness for Capacity Gauge math calculations & Split shipment invariants

import assert from 'node:assert';

function calculateCapacity(allocatedWeight, allocatedVolume = 0, vehicle) {
  if (!vehicle || !vehicle.maxWeight) {
    return null;
  }

  const maxWeight = Number(vehicle.maxWeight);
  const weightRatio = Math.round((allocatedWeight / maxWeight) * 100);
  const isOverweight = allocatedWeight > maxWeight;

  let volumeRatio = 0;
  let isOvervolume = false;
  const maxVolume = vehicle.maxVolume ? Number(vehicle.maxVolume) : 0;
  if (maxVolume > 0 && allocatedVolume > 0) {
    volumeRatio = Math.round((allocatedVolume / maxVolume) * 100);
    isOvervolume = allocatedVolume > maxVolume;
  }

  return {
    maxWeight,
    weightRatio,
    isOverweight,
    maxVolume,
    volumeRatio,
    isOvervolume
  };
}

console.log('=== RUNNING CAPACITY GAUGE MATHEMATICAL STRESS TESTS ===\n');

// 1. Weight 0 kg
{
  const res = calculateCapacity(0, 0, { maxWeight: 10000, maxVolume: 25 });
  assert.strictEqual(res.weightRatio, 0, 'Weight 0kg ratio must be 0%');
  assert.strictEqual(res.isOverweight, false, 'Weight 0kg is not overweight');
  console.log('✓ Case 1 passed: Weight 0kg -> ratio: 0%, overweight: false');
}

// 2. Exact 100% capacity
{
  const res = calculateCapacity(10000, 25, { maxWeight: 10000, maxVolume: 25 });
  assert.strictEqual(res.weightRatio, 100, 'Weight 10000/10000 ratio must be 100%');
  assert.strictEqual(res.isOverweight, false, 'Exact 100% is not overweight (> maxWeight)');
  assert.strictEqual(res.volumeRatio, 100, 'Volume 25/25 ratio must be 100%');
  assert.strictEqual(res.isOvervolume, false, 'Exact volume is not overvolume');
  console.log('✓ Case 2 passed: Exact 100% (10000/10000kg, 25/25m3) -> 100% / 100%');
}

// 3. Overload 150%+
{
  const res = calculateCapacity(16500, 40, { maxWeight: 10000, maxVolume: 25 });
  assert.strictEqual(res.weightRatio, 165, 'Weight 16500/10000 ratio must be 165%');
  assert.strictEqual(res.isOverweight, true, '165% must be overweight');
  assert.strictEqual(res.volumeRatio, 160, 'Volume 40/25 ratio must be 160%');
  assert.strictEqual(res.isOvervolume, true, '160% must be overvolume');
  console.log('✓ Case 3 passed: Severe Overload 165% weight & 160% volume -> isOverweight: true, isOvervolume: true');
}

// 4. Non-standard float numbers
{
  const res = calculateCapacity(3333.333333, 12.3456, { maxWeight: 10000, maxVolume: 30 });
  assert.strictEqual(res.weightRatio, 33, '3333.3333/10000 rounded should be 33%');
  assert.strictEqual(res.volumeRatio, 41, '12.3456/30 rounded should be 41%');
  console.log('✓ Case 4 passed: Floating numbers (3333.333333kg / 12.3456m3) -> 33% / 41%');
}

// 5. Zero / Null / Undefined vehicle guards
{
  const resNull = calculateCapacity(5000, 10, null);
  assert.strictEqual(resNull, null, 'Null vehicle returns null');

  const resZeroMax = calculateCapacity(5000, 10, { maxWeight: 0, maxVolume: 0 });
  assert.strictEqual(resZeroMax, null, '0 maxWeight returns null (prevents division by zero)');

  const resUndefinedMax = calculateCapacity(5000, 10, {});
  assert.strictEqual(resUndefinedMax, null, 'Undefined maxWeight returns null');
  console.log('✓ Case 5 passed: Edge guards for null/zero/undefined vehicle handled cleanly');
}

// 6. Volume = 0 or missing maxVolume
{
  const resNoVol = calculateCapacity(5000, 0, { maxWeight: 10000 });
  assert.strictEqual(resNoVol.volumeRatio, 0, 'No volume ratio is 0');
  assert.strictEqual(resNoVol.isOvervolume, false, 'No volume is not overvolume');
  console.log('✓ Case 6 passed: Missing maxVolume / 0 volume -> volumeRatio: 0, isOvervolume: false');
}

// 7. Split Shipment Boundary Invariants
console.log('\n=== TESTING SPLIT SHIPMENT BOUNDARIES ===\n');

function validateSplitRows(splitRows) {
  if (!Array.isArray(splitRows)) return { valid: false, error: 'Invalid array' };
  if (splitRows.length < 2) return { valid: false, error: 'Split mode requires at least 2 vehicles' };
  if (splitRows.length > 5) return { valid: false, error: 'Split mode allows maximum 5 vehicles' };

  for (let i = 0; i < splitRows.length; i++) {
    if (!splitRows[i].vehicleId) {
      return { valid: false, error: `Vui lòng chọn xe cho chuyến thứ ${i + 1}` };
    }
    if (!splitRows[i].weightAllocated || Number(splitRows[i].weightAllocated) <= 0) {
      return { valid: false, error: `Khối lượng chuyến ${i + 1} phải lớn hơn 0` };
    }
  }
  return { valid: true };
}

// 7.1 Single vehicle in split mode
{
  const res = validateSplitRows([{ vehicleId: 1, weightAllocated: 5000 }]);
  assert.strictEqual(res.valid, false);
  assert.strictEqual(res.error, 'Split mode requires at least 2 vehicles');
  console.log('✓ Split Invariant 1 passed: 1 vehicle rejected');
}

// 7.2 Exactly 2 vehicles
{
  const res = validateSplitRows([
    { vehicleId: 1, weightAllocated: 5000 },
    { vehicleId: 2, weightAllocated: 5000 }
  ]);
  assert.strictEqual(res.valid, true);
  console.log('✓ Split Invariant 2 passed: 2 vehicles accepted');
}

// 7.3 Exactly 5 vehicles
{
  const res = validateSplitRows([
    { vehicleId: 1, weightAllocated: 2000 },
    { vehicleId: 2, weightAllocated: 2000 },
    { vehicleId: 3, weightAllocated: 2000 },
    { vehicleId: 4, weightAllocated: 2000 },
    { vehicleId: 5, weightAllocated: 2000 }
  ]);
  assert.strictEqual(res.valid, true);
  console.log('✓ Split Invariant 3 passed: 5 vehicles accepted');
}

// 7.4 6 vehicles (exceeds max)
{
  const res = validateSplitRows([
    { vehicleId: 1, weightAllocated: 2000 },
    { vehicleId: 2, weightAllocated: 2000 },
    { vehicleId: 3, weightAllocated: 2000 },
    { vehicleId: 4, weightAllocated: 2000 },
    { vehicleId: 5, weightAllocated: 2000 },
    { vehicleId: 6, weightAllocated: 2000 }
  ]);
  assert.strictEqual(res.valid, false);
  assert.strictEqual(res.error, 'Split mode allows maximum 5 vehicles');
  console.log('✓ Split Invariant 4 passed: 6 vehicles rejected');
}

// 7.5 Unselected vehicle
{
  const res = validateSplitRows([
    { vehicleId: 1, weightAllocated: 5000 },
    { vehicleId: '', weightAllocated: 5000 }
  ]);
  assert.strictEqual(res.valid, false);
  assert.strictEqual(res.error, 'Vui lòng chọn xe cho chuyến thứ 2');
  console.log('✓ Split Invariant 5 passed: Empty vehicleId rejected');
}

// 7.6 Zero or negative weight
{
  const resZero = validateSplitRows([
    { vehicleId: 1, weightAllocated: 0 },
    { vehicleId: 2, weightAllocated: 5000 }
  ]);
  assert.strictEqual(resZero.valid, false);
  assert.strictEqual(resZero.error, 'Khối lượng chuyến 1 phải lớn hơn 0');

  const resNeg = validateSplitRows([
    { vehicleId: 1, weightAllocated: 5000 },
    { vehicleId: 2, weightAllocated: -50 }
  ]);
  assert.strictEqual(resNeg.valid, false);
  assert.strictEqual(resNeg.error, 'Khối lượng chuyến 2 phải lớn hơn 0');
  console.log('✓ Split Invariant 6 passed: Zero & negative weights rejected');
}

console.log('\nALL MATHEMATICAL & BOUNDARY STRESS TESTS PASSED EMPIRICALLY (100%)!\n');
