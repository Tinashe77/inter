import { create } from 'zustand';
import { http } from '../api/http.js';

const SESSION_KEY = 'interpath_authenticated_session';
const EMPLOYEE_BRANCH_KEY = 'interpath_employee_branch';

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
    window.sessionStorage.removeItem(EMPLOYEE_BRANCH_KEY);
  } catch {
    // Ignore storage restrictions; server auth still protects the data.
  }
}

function getStoredEmployeeBranch() {
  try {
    return window.sessionStorage.getItem(EMPLOYEE_BRANCH_KEY) || '';
  } catch {
    return '';
  }
}

function storeEmployeeBranch(branch) {
  try {
    const value = String(branch || '').trim();
    if (value) {
      window.sessionStorage.setItem(EMPLOYEE_BRANCH_KEY, value);
    } else {
      window.sessionStorage.removeItem(EMPLOYEE_BRANCH_KEY);
    }
  } catch {
    // Ignore storage restrictions; the user can select again during this session.
  }
}

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,
  employeeBranch: getStoredEmployeeBranch(),
  async loadUser() {
    if (!hasActiveClientSession()) {
      try {
        await http.post('/auth/logout');
      } catch {
        // The cookie may already be absent or expired.
      }
      clearClientSession();
      set({ user: null, employeeBranch: '', loading: false });
      return;
    }

    try {
      const { data } = await http.get('/auth/me');
      set({ user: data.user, loading: false });
    } catch {
      clearClientSession();
      set({ user: null, employeeBranch: '', loading: false });
    }
  },
  async login(payload) {
    const { data } = await http.post('/auth/login', payload);
    markClientSession();
    set({ user: data.user, loading: false });
    return data.user;
  },
  setEmployeeBranch(branch) {
    const value = String(branch || '').trim();
    storeEmployeeBranch(value);
    set({ employeeBranch: value });
  },
  async logout() {
    clearClientSession();
    try {
      await http.post('/auth/logout');
    } catch {
      // Local session must still be cleared even if the network request fails.
    }
    set({ user: null, employeeBranch: '', loading: false });
  }
}));
