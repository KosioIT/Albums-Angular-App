import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { environment } from '../../environments/environment';
import { authToken, refreshAccessToken } from './auth-token';

export const api = axios.create({
  baseURL: environment.apiUrl,
  withCredentials: true, // the refresh cookie is sent to /api/auth
  timeout: 10000,
  headers: {
    // Required by the backend for /auth/refresh (CSRF protection), harmless elsewhere
    'X-Requested-With': 'XMLHttpRequest',
  },
});

// Endpoints whose 401 means "wrong input" or "no session", never "the access token expired"
const NO_REFRESH = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/request-reset', '/auth/check-reset-code', '/auth/reset-password'];

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

api.interceptors.request.use((config) => {
  const token = authToken.get();
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// On 401, get a new access token once and repeat the request
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;
    const canRetry =
      error.response?.status === 401 &&
      config &&
      !config._retried &&
      !NO_REFRESH.some((url) => config.url?.startsWith(url));

    if (!canRetry) throw error;

    config._retried = true;
    const token = await refreshAccessToken();
    if (!token) throw error;

    config.headers['Authorization'] = `Bearer ${token}`;
    return api(config);
  },
);
