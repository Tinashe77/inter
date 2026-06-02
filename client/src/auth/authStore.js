import { create } from 'zustand';
import { http } from '../api/http.js';

const SESSION_KEY = 'interpath_authenticated_session';

function hasActiveClientSession() {
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

function markClientSession() {
  try {
    window.sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    // Ignore storage restrictions; server auth still protects the data.
  }
}

function clearClientSession() {
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore storage restrictions; server auth still protects the data.
  }
}

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,
  async loadUser() {
    if (!hasActiveClientSession()) {
      try {
        await http.post('/auth/logout');
      } catch {
        // The cookie may already be absent or expired.
      }
      set({ user: null, loading: false });
      return;
    }

    try {
      const { data } = await http.get('/auth/me');
      set({ user: data.user, loading: false });
    } catch {
      clearClientSession();
      set({ user: null, loading: false });
    }
  },
  async login(payload) {
    const { data } = await http.post('/auth/login', payload);
    markClientSession();
    set({ user: data.user, loading: false });
  },
  async logout() {
    clearClientSession();
    try {
      await http.post('/auth/logout');
    } catch {
      // Local session must still be cleared even if the network request fails.
    }
    set({ user: null, loading: false });
  }
}));
