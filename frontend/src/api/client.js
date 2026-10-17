import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

let authToken = null;

export const setAuthToken = (token) => {
  authToken = token;
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

export const getAuthToken = () => authToken;

export const clearAuthToken = () => {
  authToken = null;
  delete apiClient.defaults.headers.common['Authorization'];
};

export const clearAuthSession = () => {
  clearAuthToken();
  sessionStorage.removeItem('verify_token');
  sessionStorage.removeItem('verify_user');
  sessionStorage.removeItem('verify_pcr');
};

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const status = error.response.status;

      if (status === 401) {
        const isLoginRequest = error.config?.url?.includes('/admin/login');
        if (!isLoginRequest) {
          clearAuthSession();
          if (window.location.pathname !== '/login') {
            window.location.href = '/login?session=expired';
          }
        }
      }

      if (status === 403) {
        console.warn('Access denied:', error.response.data?.detail || 'Insufficient permissions');
      }

      if (status === 429) {
        console.warn('Rate limited:', error.response.data?.detail || 'Too many requests');
      }
    } else if (error.request) {
      console.error('Network error:', error.message);
    } else {
      console.error('Request error:', error.message);
    }

    return Promise.reject(error);
  }
);

export const handleApiError = (error) => {
  if (error.response) {
    const { status, data } = error.response;

    switch (status) {
      case 400:
        return data?.detail || 'Invalid request. Please check your input.';
      case 401:
        return 'Authentication required. Please log in again.';
      case 403:
        return data?.detail || 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 422:
        if (data?.detail && Array.isArray(data.detail)) {
          return data.detail.map(d => d.msg || d.message || JSON.stringify(d)).join(', ');
        }
        return data?.detail || 'Validation failed. Please check your input.';
      case 429:
        return data?.detail || 'Too many requests. Please wait before trying again.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return data?.detail || `Request failed with status ${status}`;
    }
  }

  if (error.request) {
    return 'Unable to connect to the server. Please check your connection.';
  }

  return error.message || 'An unexpected error occurred.';
};

export const verificationApi = {
  verifyLoan: (data) => apiClient.post('/verify/loan', data),
  verifyFraud: (data) => apiClient.post('/verify/fraud', data),
};

export const adminApi = {
  login: (credentials) => apiClient.post('/admin/login', credentials),
  changePassword: (data) => apiClient.post('/admin/change-password', data),
  listRules: (ruleType) => apiClient.get('/admin/rules', { params: { rule_type: ruleType } }),
  createRule: (data) => apiClient.post('/admin/rules', data),
  updateRule: (id, data) => apiClient.put(`/admin/rules/${id}`, data),
  deleteRule: (id) => apiClient.delete(`/admin/rules/${id}`),
  getAuditLog: (limit = 100) => apiClient.get('/admin/audit-log', { params: { limit } }),
  // Employee management
  listEmployees: () => apiClient.get('/admin/employees'),
  createEmployee: (data) => apiClient.post('/admin/employees', data),
  getEmployee: (id) => apiClient.get(`/admin/employees/${id}`),
  activateEmployee: (id) => apiClient.put(`/admin/employees/${id}/activate`),
  deactivateEmployee: (id) => apiClient.put(`/admin/employees/${id}/deactivate`),
  resetEmployeePassword: (id) => apiClient.put(`/admin/employees/${id}/reset-password`),
  deleteEmployee: (id) => apiClient.delete(`/admin/employees/${id}`),
};

export const healthApi = {
  check: () => apiClient.get('/'),
};