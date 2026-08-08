import { createContext, ReactNode } from 'react';
import { AuthUser } from '../types';

export interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
