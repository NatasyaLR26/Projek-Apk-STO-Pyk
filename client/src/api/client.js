import axios from 'axios';
import { showError } from '../utils/toast';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sto_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      showError('Koneksi Terputus', 'Tidak dapat terhubung ke server backend STO.');
    } else if (error.response.status === 401) {
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('sto_token');
        localStorage.removeItem('sto_user');
      }
    } else if (error.response.status >= 500) {
      showError('Kesalahan Server', error.response.data?.message || 'Terjadi kesalahan internal pada server.');
    }
    return Promise.reject(error);
  }
);

export default api;
