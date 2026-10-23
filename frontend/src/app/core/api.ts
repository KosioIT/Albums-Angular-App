import axios from 'axios';
import { environment } from '../../environments/environment';

export const api = axios.create({
  baseURL: environment.apiUrl,
  withCredentials: true,
  timeout: 10000,
});

// Axios request interceptor to add the Authorization header
api.interceptors.request.use((config) => {
  const json = localStorage.getItem('user');
  if (json) {
    const user = JSON.parse(json);
    // Add the Authorization header with the token if it exists
    if (user?.token) {
      config.headers['Authorization'] = `Bearer ${user.token}`;
    }
  }
  return config;
});
