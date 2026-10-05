import { FC, ReactNode, useEffect, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AuthContext, AuthContextType } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import { AuthUser, AuthResponse, ApiResponse, LoginCredentials, RegisterData } from '../types';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: FC<AuthProviderProps> = ({ children }) => {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(() =>
    typeof window !== 'undefined' ? authService.getToken() : null
  );
  const [isInitialized, setIsInitialized] = useState(false);

  const syncToken = useCallback(() => {
    const t = authService.getToken();
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

  // Login and register both respond with an access token + user, so they
  // share the same success/failure handling.
  const authMutationOptions = {
    onSuccess: (data: ApiResponse<AuthResponse>, variables: { remember: boolean }) => {
      const { accessToken } = data.data;
      authService.setToken(accessToken, variables.remember);
      setToken(accessToken);
      queryClient.setQueryData(['currentUser'], data.data.user);
    },
    onError: () => {
      authService.clearTokens();
      setToken(null);
    },
  };

  const requireAccessToken = (response: ApiResponse<AuthResponse>) => {
    if (!response.data?.accessToken) {
      throw new Error('Server response did not include an access token');
    }
    return response;
  };

  const loginMutation = useMutation({
    mutationFn: async ({ remember: _remember, ...credentials }: LoginCredentials & { remember: boolean }) =>
      requireAccessToken(await authService.login(credentials)),
    ...authMutationOptions,
  });

  const registerMutation = useMutation({
    mutationFn: async ({ remember: _remember, ...data }: RegisterData & { remember: boolean }) =>
      requireAccessToken(await authService.register(data)),
    ...authMutationOptions,
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
    login: async (email: string, password: string, remember = false) => {
      await loginMutation.mutateAsync({ email, password, remember });
    },
    // A fresh sign-up has no "Remember me" choice yet, so keep them signed in.
    register: async (name: string, email: string, password: string) => {
      await registerMutation.mutateAsync({ name, email, password, remember: true });
    },
    logout: async () => {
      await logoutMutation.mutateAsync();
    },
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
