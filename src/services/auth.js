import { api } from './api.js';
import { tenantSessions } from './tenantSessions.js';

export const authService = {
  login: async (tenant, username) => {
    const response = await api.auth.login(tenant, username);

    if (response.token) {
      tenantSessions.addSession(
        tenant,
        username,
        response.token,
        response.user || {}
      );

      localStorage.setItem('monk_auth_token', response.token);
      localStorage.setItem('monk_auth_tenant', tenant);
      localStorage.setItem('monk_auth_user', username);
    }

    return response;
  },

  logout: () => {
    const currentSession = tenantSessions.getCurrentSession();
    if (currentSession) {
      tenantSessions.removeSession(currentSession.tenant);
    }

    localStorage.removeItem('monk_auth_token');
    localStorage.removeItem('monk_auth_tenant');
    localStorage.removeItem('monk_auth_user');
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('monk_auth_token');
  },

  getAuthData: () => {
    return {
      token: localStorage.getItem('monk_auth_token'),
      tenant: localStorage.getItem('monk_auth_tenant'),
      user: localStorage.getItem('monk_auth_user'),
    };
  },

  getCurrentTenant: () => {
    return localStorage.getItem('monk_auth_tenant');
  },

  getCurrentUser: () => {
    return localStorage.getItem('monk_auth_user');
  },

  getAllSessions: () => {
    return tenantSessions.getAllSessions();
  },

  switchTenant: (tenant) => {
    const session = tenantSessions.switchSession(tenant);
    if (session) {
      localStorage.setItem('monk_auth_token', session.token);
      localStorage.setItem('monk_auth_tenant', session.tenant);
      localStorage.setItem('monk_auth_user', session.username);
      
      // Emit custom event for components to listen to
      window.dispatchEvent(new CustomEvent('tenantChanged', { 
        detail: { tenant, session } 
      }));
      
      return true;
    }
    return false;
  },
};
