import { createContext, ReactNode } from 'react';
import { AuthResponse, AuthUser } from '../types';

export interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  register: (name: string, email: string, password: string, organizationName: string) => Promise<void>;
  /** Signs in with a session the server already issued, e.g. after accepting an invite. */
  startSession: (session: AuthResponse) => void;
  /** Makes another organization active and reloads the app into it. */
  switchOrganization: (organizationId: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
