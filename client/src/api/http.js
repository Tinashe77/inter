import axios from 'axios';

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
export const apiPath = (path) => `${apiBaseUrl}${path}`;

export const http = axios.create({
  baseURL: `${apiBaseUrl}/api`,
  withCredentials: true
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || 'Network error. Please try again.';
    return Promise.reject(new Error(message));
  }
);
