import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { User } from '../types';
import { api } from '../services/api';

export interface AuthContextType {
  currentUser: User | null;
  updateCurrentUser: (user: User) => void;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  login: (username: string, password: string) => Promise<User | null>;
  logout: () => void;
  isImpersonating: boolean;
  impersonateSession: (userId: string) => void;
  stopImpersonation: () => void;
  authLoading: boolean;
  refreshCurrentUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Impersonation state
  const [impersonatingUser, setImpersonatingUser] = useState<User | null>(null);
  const [originalUser, setOriginalUser] = useState<User | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      setAuthLoading(true);
      try {
        const sessionUser = await api.getCurrentUser();
        if (sessionUser) {
          setCurrentUser(sessionUser);
          if (sessionUser.role === 'admin' && !isImpersonating) {
            setOriginalUser(sessionUser);
          }
        } else {
            setCurrentUser(null);
            setOriginalUser(null);
            setImpersonatingUser(null);
        }
      } catch (error) {
        console.error("Error checking session:", (error as Error).message);
        setCurrentUser(null);
      } finally {
        setAuthLoading(false);
      }
    };
    
    checkSession();
    
    // Fetch all users for admin panel
    api.getUsers().then(setUsers).catch(error => {
      console.error("Failed to fetch initial user list:", (error as Error).message);
    });
  }, []);

  const isImpersonating = !!impersonatingUser;

  const login = useCallback(async (username: string, password: string): Promise<User | null> => {
    const user = await api.login(username, password);
    if (user) {
      setCurrentUser(user);
      if (user.role === 'admin') setOriginalUser(user);
      return user;
    }
    return null;
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setCurrentUser(null);
    setOriginalUser(null);
    setImpersonatingUser(null);
  }, []);
  
  const impersonateSession = useCallback(async (userId: string) => {
    if (originalUser && originalUser.role === 'admin' && !isImpersonating) {
        const userToImpersonate = users.find(u => u.id === userId);
        if(userToImpersonate) {
            setImpersonatingUser(userToImpersonate);
            setCurrentUser(userToImpersonate); // Immediately switch context
        }
    }
  }, [originalUser, isImpersonating, users]);
  
  const stopImpersonation = useCallback(() => {
    if (isImpersonating) {
      setCurrentUser(originalUser);
      setImpersonatingUser(null);
    }
  }, [isImpersonating, originalUser]);

  const updateCurrentUser = useCallback((user: User) => {
    if (isImpersonating) {
      setImpersonatingUser(user);
    }
    setCurrentUser(user);
    if (originalUser && originalUser.id === user.id) {
      setOriginalUser(user);
    }
  }, [isImpersonating, originalUser]);

  const refreshCurrentUser = useCallback(async () => {
    setAuthLoading(true);
    try {
        const sessionUser = await api.getCurrentUser();
        if(sessionUser) {
            setCurrentUser(sessionUser);
        } else {
            await logout();
        }
    } catch (error) {
        console.error("Error refreshing user data:", (error as Error).message);
    } finally {
        setAuthLoading(false);
    }
  }, [logout]);

  const value = useMemo(() => ({
    currentUser: isImpersonating ? impersonatingUser : currentUser,
    updateCurrentUser,
    users,
    setUsers,
    login,
    logout,
    isImpersonating,
    impersonateSession,
    stopImpersonation,
    authLoading,
    refreshCurrentUser
  }), [
    currentUser, 
    updateCurrentUser,
    users, 
    login, 
    logout, 
    isImpersonating, 
    impersonateSession, 
    stopImpersonation, 
    authLoading,
    impersonatingUser,
    refreshCurrentUser
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};