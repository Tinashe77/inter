import axios from 'axios';

export const http = axios.create({
  baseURL: '/api',
  withCredentials: true
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || 'Network error. Please try again.';
    return Promise.reject(new Error(message));
  }
);
