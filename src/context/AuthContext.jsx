import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as authService from '../services/authService.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize session: restore cached user immediately, verify with backend /me in background
  useEffect(() => {
    async function initSession() {
      const cached = authService.getCurrentUser();
      const token = authService.getAuthToken();

      if (token && cached) {
        setCurrentUser(cached);
        try {
          const verifyResult = await authService.fetchMe();
          if (verifyResult.success) {
            setCurrentUser(verifyResult.user);
          } else {
            // Token expired or invalid
            authService.logout();
            setCurrentUser(null);
          }
        } catch {
          // If offline or temporary network failure, maintain cached session
        }
      } else {
        authService.logout();
        setCurrentUser(null);
      }
      setLoading(false);
    }

    initSession();
  }, []);

  const login = useCallback(async (credentials) => {
    const result = await authService.login(credentials);
    if (result.success) setCurrentUser(result.user);
    return result;
  }, []);

  const register = useCallback(async (data) => {
    const result = await authService.register(data);
    if (result.success) setCurrentUser(result.user);
    return result;
  }, []);

  const googleLogin = useCallback(async (credential) => {
    const result = await authService.googleLogin(credential);
    if (result.success) setCurrentUser(result.user);
    return result;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setCurrentUser(null);
  }, []);

  const updateProfile = useCallback(async (updates) => {
    if (!currentUser) return { success: false, message: 'Not logged in.' };
    const result = await authService.updateProfile(currentUser.userId, updates);
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
    googleLogin,
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
