import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  timeout: 5000 // Таймаут 5 секунд на случай недоступности сервера
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const fetchSketches = () => api.get('/sketches');

export const addSketch = (sketchData) => api.post('/sketches', sketchData);

export const updateSketch = (id, updatedData) => api.put(`/sketches/${id}`, updatedData);

export const deleteSketch = (id) => api.delete(`/sketches/${id}`);

export const loginUser = (credentials) => api.post('/auth/login', credentials);
export const registerUser = (userData) => api.post('/auth/register', userData);

export default api;