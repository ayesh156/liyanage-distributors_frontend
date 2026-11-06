/**
 * @file vanStockService.js
 * @description Domain service layer for Van Stock & Multi-Location Inventory.
 * Houses business validation rules, strict guardrails (such as defect quarantine isolation
 * and negative quantity prevention), and audit ledger record factories.
 */

import {
  calcNetUnitPrice,
  calcTotalRealValue,
  calcRestockNeeded,
  calcEstimatedReplenishmentCost,
  classifyReplenishmentPriority,
} from '../data/vanStockData';

/**
 * Validates a Store-to-Vehicle loading transaction
 * @param {Object} params
 * @param {number} params.requestedQty
 * @param {number} params.availableWarehouseQty
 * @throws {Error} If validation fails
 */
export function validateStoreToVehicleTransfer({ requestedQty, availableWarehouseQty }) {
  const qty = Number(requestedQty);
  if (isNaN(qty) || qty <= 0) {
    throw new Error('Transfer quantity must be greater than zero (0).');
  }
  const available = Number(availableWarehouseQty) || 0;
  if (qty > available) {
    throw new Error(
      `Insufficient warehouse stock. Requested: ${qty}, Available in Main Store: ${available}.`
    );
  }
}

/**
 * Validates a Vehicle-to-Store unsold stock return
 * @param {Object} params
 * @param {number} params.returnQty
 * @param {number} params.availableVanQty
 * @throws {Error} If validation fails
 */
export function validateVehicleToStoreReturn({ returnQty, availableVanQty }) {
  const qty = Number(returnQty);
  if (isNaN(qty) || qty <= 0) {
    throw new Error('Return quantity must be greater than zero (0).');
  }
  const available = Number(availableVanQty) || 0;
  if (qty > available) {
    throw new Error(
      `Cannot return more stock than is on-hand in the van. Requested: ${qty}, Van Stock: ${available}.`
    );
  }
}

/**
 * Validates road sales invoice depletion
 * @param {Array<{ productId: number, quantity: number }>} items
 * @param {Array<Object>} vanStockItems
 * @throws {Error} If any item exceeds van on-hand stock
 */
export function validateVehicleRoadSale(items, vanStockItems) {
  if (!items || items.length === 0) {
    throw new Error('Road sales invoice must contain at least one line item.');
  }

  for (const item of items) {
    const qty = Number(item.quantity);
    if (isNaN(qty) || qty <= 0) {
      throw new Error(`Quantity for line item must be greater than 0.`);
    }
    const vanItem = vanStockItems.find(
      (v) => Number(v.productId) === Number(item.productId)
    );
    const available = vanItem ? Number(vanItem.quantity) || 0 : 0;
    if (qty > available) {
      throw new Error(
        `Insufficient van on-hand stock for "${item.productName || 'selected item'}". Requested: ${qty}, Available: ${available}.`
      );
    }
  }
}

/**
 * Validates damaged goods quarantine logging.
 * Enforces the Contamination Prevention Rule: Damaged items are routed exclusively
 * to the DAMAGED_GOODS ledger pool.
 * @param {Object} payload
 * @throws {Error} If payload is invalid
 */
export function validateDamagedGoodsQuarantine({ quantity, reason, reportedBy }) {
  const qty = Number(quantity);
  if (isNaN(qty) || qty <= 0) {
    throw new Error('Damaged quantity must be greater than zero (0).');
  }
  if (!reason || !reason.trim()) {
    throw new Error('A specific defect or damage reason is mandatory for quarantine logging.');
  }
  if (!reportedBy || !reportedBy.trim()) {
    throw new Error('Reporting personnel name is required for audit traceability.');
  }
}

/**
 * Validates warehouse stocktake count adjustment
 * @param {Object} params
 * @param {number} params.delta
 * @param {number} params.currentQty
 * @param {string} params.reason
 * @throws {Error} If adjustment is invalid
 */
export function validateWarehouseAdjustment({ delta, currentQty, reason }) {
  const change = Number(delta);
  if (isNaN(change) || change === 0) {
    throw new Error('Adjustment delta must be a non-zero positive or negative number.');
  }
  const current = Number(currentQty) || 0;
  if (current + change < 0) {
    throw new Error(
      `Adjustment would result in negative warehouse stock. Current: ${current}, Delta: ${change}.`
    );
  }
  if (!reason || !reason.trim()) {
    throw new Error('Audit reason is required for stock count adjustments.');
  }
}

/**
 * Factory creating an immutable stock movement audit ledger record
 * @param {Object} params
 * @returns {Object}
 */
export function buildMovementRecord({
  movementType,
  sourceLocation,
  targetLocation,
  productId,
  productName,
  sku,
  quantity,
  unitPrice = 0,
  reference = null,
  performedBy = 'System',
  notes = '',
}) {
  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    movementType,
    sourceLocation,
    targetLocation,
    productId: Number(productId),
    productName: productName || 'Unknown Product',
    sku: sku || '',
    quantity: Math.max(0, Number(quantity) || 0),
    unitPrice: Math.max(0, Number(unitPrice) || 0),
    reference: reference || `REF-${Date.now().toString().slice(-6)}`,
    performedBy: performedBy || 'System',
    notes: notes || '',
    timestamp: new Date().toISOString(),
  };
}

export default {
  validateStoreToVehicleTransfer,
  validateVehicleToStoreReturn,
  validateVehicleRoadSale,
  validateDamagedGoodsQuarantine,
  validateWarehouseAdjustment,
  buildMovementRecord,
  calcNetUnitPrice,
  calcTotalRealValue,
  calcRestockNeeded,
  calcEstimatedReplenishmentCost,
  classifyReplenishmentPriority,
};

