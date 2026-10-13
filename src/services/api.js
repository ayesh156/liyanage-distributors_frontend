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

// ── Per-route timeout overrides ────────────────────────────────────────────
// Report endpoints aggregate large datasets and need a longer timeout.
// All other endpoints keep the default 15 s budget.
const TIMEOUT_OVERRIDES = [
  { prefix: '/reports/', ms: 60000 },  // 60 s for all /reports/* routes
  { prefix: '/invoices/outstanding', ms: 60000 },
];

function resolveTimeout(endpoint) {
  for (const rule of TIMEOUT_OVERRIDES) {
    if (endpoint.startsWith(rule.prefix)) return rule.ms;
  }
  return 15000; // default 15 s
}

/**
 * Determines whether a caught error represents a backend connection drop or network unreachable event.
 * Matches:
 *  - AbortController timeout (AbortError)
 *  - TypeError (thrown natively by window.fetch on network drops, DNS failures, ERR_CONNECTION_REFUSED)
 *  - Error messages containing standard network failure strings
 *
 * @param {unknown} error - The caught exception
 * @returns {boolean} True if the error is a connection drop/network failure
 */
function isNetworkFailure(error) {
  if (!error) return false;
  if (error.name === 'AbortError') return true;
  if (error instanceof TypeError) return true;
  const msg = String(error.message || '').toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('err_connection_refused') ||
    msg.includes('connection refused') ||
    msg.includes('net::err_') ||
    msg.includes('network request failed') ||
    msg.includes('network error') ||
    msg.includes('network timeout')
  );
}

/**
 * Generic fetch wrapper with error handling, timeout, JSON parsing, and network resilience.
 */
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const controller = new AbortController();
  const timeoutMs = resolveTimeout(endpoint);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

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

    let data;
    try {
      data = await response.json();
    } catch {
      data = { error: `Server returned HTTP ${response.status}` };
    }

    if (!response.ok) {
      const isGatewayOffline = response.status === 502 || response.status === 503 || response.status === 504;
      if (isGatewayOffline && typeof window !== 'undefined') {
        window.dispatchEvent(new Event('app:network-offline'));
      }
      const errMsg = data?.error || data?.message || `Request failed with status ${response.status}`;
      const apiError = new ApiError(errMsg, response.status, data);
      if (!isGatewayOffline) {
        showToast(errMsg);
      }
      throw apiError;
    }

    return data;
  } catch (error) {
    const isOfflineDrop = isNetworkFailure(error);

    // Immediately trigger central sentinel upon connection drops or timeouts
    if (typeof window !== 'undefined' && isOfflineDrop) {
      window.dispatchEvent(new Event('app:network-offline'));
    }

    if (error.name === 'AbortError') {
      const timeoutSec = Math.round(timeoutMs / 1000);
      const msg = `Request to ${endpoint} timed out after ${timeoutSec}s`;
      // Toast suppressed: authoritative OfflineSentinel notifies user
      throw new ApiError(msg, 408, null);
    }

    if (error instanceof ApiError) {
      throw error;
    }

    // Raw connection drops / ERR_CONNECTION_REFUSED / Failed to fetch
    const msg = error.message || `Network error connecting to ${endpoint}`;
    // Suppress redundant toast banners when server is unreachable
    if (!isOfflineDrop) {
      showToast(msg);
    }

    // Gracefully reject the promise without unhandled UI runtime errors
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
 * HEALTH & RESILIENCE
 */
export const healthApi = {
  check: () => api.get('/health'),
  /**
   * Lightweight ping with dedicated timeout that does NOT trigger error toasts.
   * Used by OfflineSentinel to verify connection restoration.
   */
  ping: async (timeoutMs = 4000) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const url = `${BASE_URL}/health`;
      const res = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timeout);
      return res.ok;
    } catch (_err) {
      return false;
    }
  },
};

/**
 * USERS & STAFF MANAGEMENT
 */
export const usersApi = {
  getProfile:     ()              => api.get('/users/profile'),
  updateProfile:  (data)          => api.put('/users/profile', data),
  list:           ()              => api.get('/users'),
  create:         (data)          => api.post('/users', data),
  update:         (id, data)      => api.put(`/users/${id}`, data),
  resetPassword:  (id, data)      => api.put(`/users/${id}/reset-password`, data),
  delete:         (id)            => api.delete(`/users/${id}`),
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