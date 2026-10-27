import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ApiError } from '../types';
import { tokenStorage } from '../utils/tokenStorage';

const rawBaseURL = import.meta.env.VITE_APP_BASE_URL || 'http://localhost:5000/api/v1';

const axiosInstance: AxiosInstance = axios.create({
  baseURL: rawBaseURL,
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

// /health lives at the server root, not under /api/v1. Safe URL parsing:
function resolveHealthUrl(base: string): string {
  try {
    return new URL('/health', base).toString();
  } catch {
    return '/health';
  }
}
const healthUrl = resolveHealthUrl(rawBaseURL);

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

// Queue for requests awaiting token refresh to prevent multiple concurrent refresh calls
let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

const processRefreshQueue = (error: unknown, token: string | null = null) => {
  refreshQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  refreshQueue = [];
};

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
  async (error: AxiosError<{ message?: string; error?: { message?: string } }>) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const freshToken = error.response?.headers['x-csrf-token'] as string | undefined;
    if (freshToken) csrfToken = freshToken;

    const status = error.response?.status;
    const requestUrl = originalRequest?.url || '';
    const isAuthRoute =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register') ||
      requestUrl.includes('/auth/refresh') ||
      requestUrl.includes('/auth/logout');

    // Attempt token refresh on 401 if we haven't already retried this request
    if (status === 401 && originalRequest && !originalRequest._retry && !isAuthRoute) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return axiosInstance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post<{ data: { accessToken: string } }>(
          `${rawBaseURL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const newAccessToken = data.data.accessToken;
        tokenStorage.set(newAccessToken, true);
        axiosInstance.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        processRefreshQueue(null, newAccessToken);
        return axiosInstance(originalRequest);
      } catch (refreshErr) {
        processRefreshQueue(refreshErr, null);
        tokenStorage.clear();
        window.dispatchEvent(new Event('auth-logout'));
        if (!window.location.pathname.includes('/login')) window.location.href = '/';
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    if (status === 401 && !isAuthRoute) {
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
