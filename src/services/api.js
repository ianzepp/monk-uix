const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export class ApiError extends Error {
  constructor(message, code, status, data) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.data = data;
  }
}

export const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem('monk_auth_token');

  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const result = await response.json();

    if (!response.ok || !result.success) {
      const error = result.error || result.error_code || 'API request failed';
      const message = typeof error === 'string' ? error : error.message || error;
      const code = result.error_code || 'UNKNOWN_ERROR';

      throw new ApiError(message, code, response.status, result.data);
    }

    return result.data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(error.message, 'NETWORK_ERROR', 0, null);
  }
};

export const api = {
  auth: {
    register: async (tenant, username) => {
      return apiCall('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ tenant, username }),
      });
    },

    login: async (tenant, username) => {
      return apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ tenant, username }),
      });
    },

    logout: () => {
      localStorage.removeItem('monk_auth_token');
      localStorage.removeItem('monk_auth_tenant');
      localStorage.removeItem('monk_auth_user');
    },

    getStatus: () => {
      const token = localStorage.getItem('monk_auth_token');
      const tenant = localStorage.getItem('monk_auth_tenant');
      const user = localStorage.getItem('monk_auth_user');

      return {
        isAuthenticated: !!token,
        token,
        tenant,
        user,
      };
    },
  },

  tenants: {
    list: async () => {
      return apiCall('/api/admin/tenants');
    },
  },

  schemas: {
    list: async () => {
      return apiCall('/api/describe');
    },

    get: async (schema) => {
      return apiCall(`/api/describe/${schema}`);
    },
  },

  data: {
    list: async (schema, params = {}) => {
      const queryParams = new URLSearchParams();

      if (params.limit) queryParams.set('limit', params.limit);
      if (params.offset) queryParams.set('offset', params.offset);
      if (params.where) queryParams.set('where', JSON.stringify(params.where));
      if (params.order) queryParams.set('order', JSON.stringify(params.order));

      const query = queryParams.toString();
      const endpoint = `/api/data/${schema}${query ? `?${query}` : ''}`;

      return apiCall(endpoint);
    },

    get: async (schema, id) => {
      return apiCall(`/api/data/${schema}/${id}`);
    },

    update: async (schema, id, data) => {
      return apiCall(`/api/data/${schema}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    delete: async (schema, id, permanent = false) => {
      const query = permanent ? '?permanent=true' : '';
      return apiCall(`/api/data/${schema}/${id}${query}`, {
        method: 'DELETE',
      });
    },
  },

  find: {
    search: async (schema, query) => {
      return apiCall(`/api/find/${schema}`, {
        method: 'POST',
        body: JSON.stringify(query),
      });
    },
  },
};
