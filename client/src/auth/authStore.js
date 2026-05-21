import { create } from 'zustand';
import { http } from '../api/http.js';

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,
  async loadUser() {
    try {
      const { data } = await http.get('/auth/me');
      set({ user: data.user, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },
  async login(payload) {
    const { data } = await http.post('/auth/login', payload);
    set({ user: data.user, loading: false });
  },
  async logout() {
    await http.post('/auth/logout');
    set({ user: null, loading: false });
  }
}));
