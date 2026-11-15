import axios from 'axios';
import { getSessionToken } from './authStorage';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000',
  timeout: 5000 
});

api.interceptors.request.use(
  (config) => {
    const token = getSessionToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const fetchSketches = (config = {}) => api.get('/sketches', config);
export const addSketch = (sketchData) => api.post('/sketches', sketchData);
export const updateSketch = (id, updatedData) => api.put(`/sketches/${id}`, updatedData);
export const deleteSketch = (id) => api.delete(`/sketches/${id}`);

export const loginUser = (credentials) => api.post('/auth/login', credentials);
export const registerUser = (userData) => api.post('/auth/register', userData);
export const fetchContacts = (config = {}) => api.get('/auth/contacts', config);
export const removeContact = (id) => api.delete(`/auth/contacts/${id}`);
export const restoreContact = (id) => api.post(`/auth/contacts/${id}/restore`);
export const fetchProfile = () => api.get('/auth/profile');
export const updateProfile = (profile) => api.patch('/auth/profile', profile);
export const fetchPublicProfile = (id, config = {}) => api.get(`/auth/users/${id}`, config);

export default api;