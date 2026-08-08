import { FC, ReactNode, useEffect, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AuthContext, AuthContextType } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import { AuthUser } from '../types';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: FC<AuthProviderProps> = ({ children }) => {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('token') : null
  );
  const [isInitialized, setIsInitialized] = useState(false);

  const syncToken = useCallback(() => {
    const t = localStorage.getItem('token');
    setToken(t);
  }, []);

  useEffect(() => {
    window.addEventListener('storage', syncToken);
    window.addEventListener('auth-logout', syncToken);
    setIsInitialized(true);

    return () => {
      window.removeEventListener('storage', syncToken);
      window.removeEventListener('auth-logout', syncToken);
    };
  }, [syncToken]);

  const hasToken = !!token && isInitialized;

  const {
    data: currentUser,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => authService.getCurrentUser().then(res => res.data),
    enabled: hasToken,
    retry: (count, err: any) => {
      const status = err?.status;
      if (status === 401 || status === 403) return false;
      return count < 2;
    },
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  useEffect(() => {
    if (isError) {
      const status = (error as any)?.status;
      if (status === 401 || status === 403) {
        authService.clearTokens();
        setToken(null);
        queryClient.removeQueries({ queryKey: ['currentUser'] });
        queryClient.setQueryData(['currentUser'], null);
      }
    }
  }, [isError, error, queryClient]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await authService.login(credentials);
      return response;
    },
    onSuccess: (data) => {
      if (data.data?.token) {
        authService.setToken(data.data.token);
        if (data.data.refreshToken) {
          authService.setRefreshToken(data.data.refreshToken);
        }
        setToken(data.data.token);
        queryClient.setQueryData(['currentUser'], data.data.user);
      }
    },
    onError: () => {
      authService.clearTokens();
      setToken(null);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      authService.clearTokens();
      setToken(null);
      queryClient.clear();
      window.location.href = '/';
    },
  });

  const value: AuthContextType = {
    user: currentUser ?? null,
    isLoading,
    isAuthenticated: !!token && !!currentUser,
    login: (email: string, password: string) =>
      loginMutation.mutateAsync({ email, password }),
    logout: () => logoutMutation.mutateAsync(),
    setUser: (user: AuthUser | null) => {
      queryClient.setQueryData(['currentUser'], user);
    },
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
