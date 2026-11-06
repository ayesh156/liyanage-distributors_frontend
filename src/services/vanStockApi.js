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
  async getDailyManifest(vehicleId = 'VAN-01') {
    return await api.get('/manifests/daily', { vehicleId });
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

  // ── Public WhatsApp Zero-Login Verification & Signing APIs ──
  async getPublicManifestShare(manifestNo) {
    return await api.get(`/manifests/share/${manifestNo}`);
  },

  async verifyPublicManifest(manifestNo, payload) {
    return await api.post(`/manifests/share/${manifestNo}/verify`, payload);
  },

  async signPublicManifest(manifestNo, payload) {
    return await api.put(`/manifests/share/${manifestNo}/sign`, payload);
  },
};

export default vanStockApi;
