/**
 * LIYANAGE DISTRIBUTORS - PRODUCTION API CLIENT
 * Centralized HTTP client for all backend communication.
 * Base URL configured via VITE_API_BASE_URL environment variable.
 *
 * Pagination: All list endpoints accept { page, limit, ...filters } params.
 * Default page size is 15 (configurable via rowsPerPage).
 */

const BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL)
  || 'http://localhost:5000/api';

// ── Global toast notification handler (set by App on mount) ──────────────
let _toastHandler = null;
export function setToastHandler(handler) {
  _toastHandler = handler;
}

function showToast(message, type = 'error', duration = 4000) {
  if (_toastHandler) {
    _toastHandler(message, type, duration);
  } else {
    console[type === 'error' ? 'error' : 'warn'](`[API] ${message}`);
  }
}

// ── Error class for structured API errors ───────────────────────────────
export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Generic fetch wrapper with error handling, timeout, JSON parsing.
 */
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    const authToken = typeof window !== 'undefined' ? sessionStorage.getItem('auth_token') : null;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...options.headers,
      },
      credentials: 'include',
      signal: controller.signal,
      ...options,
    };

    // Remove Content-Type for GET/HEAD requests without body
    if (!config.body) {
      delete config.headers['Content-Type'];
    }

    const response = await fetch(url, config);

    // Handle 204 No Content
    if (response.status === 204) {
      return { success: true, data: null };
    }

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data.error || data.message || `Request failed with status ${response.status}`;
      throw new ApiError(errMsg, response.status, data);
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      const msg = `Request to ${endpoint} timed out after 15s`;
      showToast(msg);
      throw new ApiError(msg, 408, null);
    }
    if (error instanceof ApiError) {
      showToast(error.message);
      throw error;
    }
    // Network / other errors
    const msg = error.message || `Network error connecting to ${endpoint}`;
    showToast(msg);
    throw new ApiError(msg, 0, null);
  } finally {
    clearTimeout(timeout);
  }
}

// ── HTTP verb helpers ────────────────────────────────────────────────────────

const api = {
  get: (endpoint, params) => {
    const query = params ? '?' + new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => [k, String(v)])
    ).toString() : '';
    return request(`${endpoint}${query}`, { method: 'GET' });
  },
  post:   (endpoint, body) => request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put:    (endpoint, body) => request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint) => request(endpoint, { method: 'DELETE' }),
};

export default api;

// ── Pagination helper — builds params with defaults ─────────────────────────

export function withPagination(params = {}, page = 1, limit = 15) {
  return {
    page,
    limit,
    ...params,
  };
}

// ── Domain-specific API functions ────────────────────────────────────────────

/**
 * STORES
 * GET /api/stores?page=1&limit=15&search=&route=
 * GET /api/stores/:id
 * POST /api/stores
 * PUT /api/stores/:id
 * DELETE /api/stores/:id
 * GET /api/stores/routes
 */
export const storesApi = {
  list:        (params)                  => api.get('/stores', params),
  getById:     (id)                      => api.get(`/stores/${id}`),
  create:      (data)                    => api.post('/stores', data),
  update:      (id, data)               => api.put(`/stores/${id}`, data),
  delete:      (id)                      => api.delete(`/stores/${id}`),
  listRoutes:  ()                        => api.get('/stores/routes'),
};

/**
 * ROUTES
 * GET /api/routes?page=1&limit=100&search=
 * GET /api/routes/:id
 * POST /api/routes
 * PUT /api/routes/:id
 * DELETE /api/routes/:id
 */
export const routesApi = {
  list:         (params)                 => api.get('/routes', params),
  getById:      (id)                     => api.get(`/routes/${id}`),
  create:       (data)                   => api.post('/routes', data),
  update:       (id, data)               => api.put(`/routes/${id}`, data),
  delete:       (id)                     => api.delete(`/routes/${id}`),
};

/**
 * INVOICES
 * GET /api/invoices?page=1&limit=15&storeId=&search=
 * GET /api/invoices/summary
 * GET /api/invoices/:id
 * GET /api/invoices/document/:documentNo
 * POST /api/invoices
 * PUT /api/invoices/:id
 * DELETE /api/invoices/:id
 */
export const invoicesApi = {
  list:         (params)                 => api.get('/invoices', params),
  getById:      (id)                     => api.get(`/invoices/${id}`),
  getByDocNo:   (documentNo)             => api.get(`/invoices/document/${documentNo}`),
  summary:      (params)                 => api.get('/invoices/summary', params),
  create:       (data)                   => api.post('/invoices', data),
  update:       (id, data)              => api.put(`/invoices/${id}`, data),
  delete:       (id)                     => api.delete(`/invoices/${id}`),
};

/**
 * PAYMENTS
 * POST /api/payments/collect
 * POST /api/payments/bulk-collect
 * GET /api/payments?page=1&limit=15&storeId=
 * GET /api/payments/:id
 * DELETE /api/payments/:id
 */
export const paymentsApi = {
  list:         (params)                 => api.get('/payments', params),
  getById:      (id)                     => api.get(`/payments/${id}`),
  collect:      (data)                   => api.post('/payments/collect', data),
  bulkCollect:  (payments)               => api.post('/payments/bulk-collect', { payments }),
  reverse:      (id)                     => api.delete(`/payments/${id}`),
};

/**
 * SALES PERSONS
 * GET /api/sales-persons?page=1&limit=15
 * GET /api/sales-persons/:id
 * POST /api/sales-persons
 * PUT /api/sales-persons/:id
 * DELETE /api/sales-persons/:id
 */
export const salesPersonsApi = {
  list:         (params)                 => api.get('/sales-persons', params),
  getById:      (id)                     => api.get(`/sales-persons/${id}`),
  create:       (data)                   => api.post('/sales-persons', data),
  update:       (id, data)              => api.put(`/sales-persons/${id}`, data),
  delete:       (id)                     => api.delete(`/sales-persons/${id}`),
};

/**
 * HEALTH
 */
export const healthApi = {
  check: () => api.get('/health'),
};

/**
 * DASHBOARD ANALYTICS
 * GET /api/dashboard/analytics
 */
export const dashboardApi = {
  analytics: () => api.get('/dashboard/analytics'),
};

/**
 * OUTSTANDING REPORT
 * GET /api/reports/outstanding?storeId=&startDate=&endDate=&year=&month=&page=1&limit=15
 * Returns per-invoice detail with running balance for multi-shop report.
 */
export const outstandingApi = {
  getReport: (params) => api.get('/reports/outstanding', params),
};

export const authApi = {
  login: (payload) => api.post('/auth/login', payload),
  me: () => api.get('/auth/me'),
};