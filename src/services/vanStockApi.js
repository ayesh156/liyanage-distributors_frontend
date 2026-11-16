/**
 * @file vanStockApi.js
 * @description Real Production REST API client layer for the Van Stock & Multi-Location
 * Inventory subsystem. Wires directly to the backend Express MVC endpoints with
 * automated JWT authorization, error forwarding, and response unwrapping.
 */

import api from './api.js';

export const vanStockApi = {
  // ── Central Warehouse Domain APIs ──
  async getWarehouseCatalog(params = {}) {
    return await api.get('/warehouse/catalog', params);
  },

  async registerProduct(payload) {
    return await api.post('/warehouse/products', payload);
  },

  async updateProduct(id, payload) {
    return await api.put(`/warehouse/products/${id}`, payload);
  },

  async deleteProduct(id) {
    return await api.delete(`/warehouse/products/${id}`);
  },

  async receivePurchaseOrder(payload) {
    return await api.post('/warehouse/receive-po', payload);
  },

  async adjustMainStoreStock(payload) {
    return await api.post('/warehouse/adjust-stock', payload);
  },

  async getOwnerSignature() {
    return await api.get('/warehouse/owner-signature');
  },

  async saveOwnerSignature(payload) {
    return await api.post('/warehouse/owner-signature', payload);
  },

  // ── Dynamic Hardware Categories APIs ──
  async getCategories() {
    return await api.get('/warehouse/categories');
  },

  async createCategory(payload) {
    return await api.post('/warehouse/categories', payload);
  },

  async updateCategory(id, payload) {
    return await api.put(`/warehouse/categories/${id}`, payload);
  },

  async deleteCategory(id) {
    return await api.delete(`/warehouse/categories/${id}`);
  },

  // ── Vehicle Profile & Physical Image Storage APIs ──
  async getVehicleProfile(vehicleId = 'VAN-01') {
    return await api.get('/settings/vehicle', { vehicleId });
  },

  async saveVehicleProfile(payload) {
    return await api.post('/settings/vehicle', payload);
  },

  // ── Van Stock Subsystem APIs ──
  async getVanInventory(vehicleId = 'VAN-01') {
    return await api.get('/van-stock', { vehicleId });
  },

  async loadVanStock(payload) {
    return await api.post('/van-stock/load', payload);
  },

  async modifyVanItemQty(payload) {
    return await api.put('/van-stock/modify-qty', payload);
  },

  async recordVehicleSale(payload) {
    return await api.post('/van-stock/sales', payload);
  },

  async returnToStore(payload) {
    return await api.post('/van-stock/return', payload);
  },

  async deleteVanStockItem(id) {
    return await api.delete(`/van-stock/items/${id}`);
  },

  // ── Quarantined Damaged Goods APIs ──
  async getDamagedGoods(params = {}) {
    return await api.get('/damaged-goods', params);
  },

  async logDamagedGoods(payload) {
    return await api.post('/damaged-goods/quarantine', payload);
  },

  async updateDamagedStatus(id, payload) {
    try {
      return await api.put(`/damaged-goods/${id}/status`, payload);
    } catch (err) {
      if (err?.status === 404) {
        return await api.put(`/van-stock/damaged-goods/${id}/status`, payload);
      }
      throw err;
    }
  },

  async deleteDamagedRecord(id) {
    return await api.delete(`/damaged-goods/${id}`);
  },

  // ── Daily Delivery Manifest APIs ──
  async getDailyManifest(vehicleId = 'VAN-01', date = null) {
    const params = { vehicleId };
    if (date) params.date = date;
    return await api.get('/manifests/daily', params);
  },

  async getManifestHistory(vehicleId = 'VAN-01') {
    return await api.get('/manifests/history', { vehicleId });
  },

  async dispatchDailyManifest(payload) {
    return await api.post('/manifests/sign-owner', payload);
  },

  async verifyManifestByRep(payload) {
    return await api.post('/manifests/verify-rep', payload);
  },

  async saveEveningChecks(payload) {
    return await api.post('/manifests/reconcile-evening', payload);
  },

  async reconcileEvening(payload) {
    return await api.post('/manifests/reconcile-evening', payload);
  },

  async toggleItemCheck(payload) {
    try {
      return await api.post('/manifests/toggle-item-check', payload);
    } catch (err) {
      return await api.post('/van-stock/check', payload);
    }
  },

  // ── Unified In-App Saved Signatures APIs ──
  async getSavedSignatures(repId) {
    return await api.get('/manifests/saved-signatures', repId ? { repId } : {});
  },

  async saveSignature(payload) {
    return await api.post('/manifests/saved-signatures', payload);
  },
};

export default vanStockApi;
