import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ApiError } from '../types';
import { tokenStorage } from '../utils/tokenStorage';

const axiosInstance: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_APP_BASE_URL || 'http://localhost:5000/api/v1',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
  // Client and server are on different origins in production, so cookies
  // (the CSRF cookie and the refresh-token cookie) are only sent/received
  // when this is set.
  withCredentials: true,
});

// The CSRF cookie is HttpOnly, so the SPA can't read it directly. The
// server echoes the current token on every response via the x-csrf-token
// header instead; we cache it here and replay it on state-changing
// requests, which is what the server's double-submit check expects.
let csrfToken: string | null = null;
let primingPromise: Promise<string | null> | null = null;
const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete']);

// /health lives at the server root, not under /api/v1.
const healthUrl = new URL('/health', axiosInstance.defaults.baseURL as string).toString();

function primeCsrfToken(): Promise<string | null> {
  if (!primingPromise) {
    primingPromise = axios
      .get(healthUrl, { withCredentials: true })
      .then((res) => (res.headers['x-csrf-token'] as string) || null)
      .finally(() => {
        primingPromise = null;
      });
  }
  return primingPromise;
}

axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = tokenStorage.get();
    if (token) config.headers.Authorization = `Bearer ${token}`;

    const method = config.method?.toLowerCase();
    if (method && MUTATING_METHODS.has(method)) {
      if (!csrfToken) {
        // Prime the CSRF cookie/token with a harmless GET before the
        // first mutating request of the session.
        csrfToken = await primeCsrfToken();
      }
      if (csrfToken) config.headers['x-csrf-token'] = csrfToken;
    }

    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => {
    const freshToken = response.headers['x-csrf-token'] as string | undefined;
    if (freshToken) csrfToken = freshToken;
    return response;
  },
  (error: AxiosError<{ message?: string; error?: { message?: string } }>) => {
    const freshToken = error.response?.headers['x-csrf-token'] as string | undefined;
    if (freshToken) csrfToken = freshToken;

    if (error.response?.status === 401) {
      tokenStorage.clear();
      window.dispatchEvent(new Event('auth-logout'));
      if (!window.location.pathname.includes('/login')) window.location.href = '/';
    }

    const apiError: ApiError = {
      message:
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        error.message ||
        'An error occurred',
      status: error.response?.status || 500,
    };

    return Promise.reject(apiError);
  }
);

export default axiosInstance;
