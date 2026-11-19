// Hosted build: VITE_API_URL=https://<your-host>/api (public value, set at build time).
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    // Sends the HttpOnly session cookie. Required for local dev (5173 -> 3000);
    // harmless on the single-host deployment where the API is same-origin.
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers }
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.error?.message || `Request failed with status ${response.status}.`;
    const error = new Error(message);
    error.status = response.status;
    error.code = data?.error?.code;
    throw error;
  }
  return data;
}

export const api = {
  getProducts: (query = '') => request(`/products${query ? `?search=${encodeURIComponent(query)}` : ''}`),
  getProduct: (id) => request(`/products/${id}`),
  createOrder: (order) => request('/orders', { method: 'POST', body: JSON.stringify(order) }),
  getMyOrders: () => request('/orders'),
  getCart: () => request('/cart'),
  saveCart: (items) => request('/cart', { method: 'PUT', body: JSON.stringify({ items }) }),
  getOrder: (id) => request(`/orders/${id}`),
  me: () => request('/auth/me'),
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  askAssistant: (question) => request('/assistant/questions', {
    method: 'POST', body: JSON.stringify({ question })
  })
};
