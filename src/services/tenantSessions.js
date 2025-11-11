import { storage } from './storage';

const SESSIONS_KEY = 'monk_tenant_sessions';
const CURRENT_SESSION_KEY = 'monk_current_session';

export const tenantSessions = {
  addSession: (tenant, username, token, userData = {}) => {
    const sessions = storage.get(SESSIONS_KEY, {});

    sessions[tenant] = {
      tenant,
      username,
      token,
      lastAccess: new Date().toISOString(),
      userData,
    };

    storage.set(SESSIONS_KEY, sessions);
    storage.set(CURRENT_SESSION_KEY, tenant);
  },

  getCurrentSession: () => {
    const currentTenant = storage.get(CURRENT_SESSION_KEY);
    if (!currentTenant) return null;

    const sessions = storage.get(SESSIONS_KEY, {});
    return sessions[currentTenant] || null;
  },

  switchSession: (tenant) => {
    const sessions = storage.get(SESSIONS_KEY, {});
    if (sessions[tenant]) {
      storage.set(CURRENT_SESSION_KEY, tenant);
      return sessions[tenant];
    }
    return null;
  },

  getAllSessions: () => {
    return storage.get(SESSIONS_KEY, {});
  },

  removeSession: (tenant) => {
    const sessions = storage.get(SESSIONS_KEY, {});
    delete sessions[tenant];
    storage.set(SESSIONS_KEY, sessions);

    const currentTenant = storage.get(CURRENT_SESSION_KEY);
    if (currentTenant === tenant) {
      const remainingSessions = Object.keys(sessions);
      if (remainingSessions.length > 0) {
        storage.set(CURRENT_SESSION_KEY, remainingSessions[0]);
      } else {
        storage.remove(CURRENT_SESSION_KEY);
      }
    }
  },

  clearAllSessions: () => {
    storage.remove(SESSIONS_KEY);
    storage.remove(CURRENT_SESSION_KEY);
  },
};
