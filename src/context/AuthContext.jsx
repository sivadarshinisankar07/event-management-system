import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as authService from '../services/authService.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setCurrentUser(authService.getCurrentUser());
    setLoading(false);
  }, []);

  const login = useCallback((credentials) => {
    const result = authService.login(credentials);
    if (result.success) setCurrentUser(result.user);
    return result;
  }, []);

  const register = useCallback((data) => {
    const result = authService.register(data);
    if (result.success) setCurrentUser(result.user);
    return result;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setCurrentUser(null);
  }, []);

  const updateProfile = useCallback((updates) => {
    if (!currentUser) return { success: false, message: 'Not logged in.' };
    const result = authService.updateProfile(currentUser.userId, updates);
    if (result.success) setCurrentUser(result.user);
    return result;
  }, [currentUser]);

  const value = {
    currentUser,
    isAuthenticated: !!currentUser,
    isAdmin: currentUser?.role === 'admin',
    isParticipant: currentUser?.role === 'participant',
    loading,
    login,
    register,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
