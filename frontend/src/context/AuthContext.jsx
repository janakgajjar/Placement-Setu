import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, {
  getAccessToken,
  getStoredUser,
  setAuthSession,
  clearAuthSession,
} from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser());
  const [accessToken, setAccessToken] = useState(getAccessToken());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sync session on mount
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      const token = getAccessToken();
      const cachedUser = getStoredUser();

      if (!token || !cachedUser) {
        if (isMounted) {
          setUser(null);
          setAccessToken(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const response = await api.user.getMe();
        if (isMounted && response?.data) {
          const freshUser = {
            id: response.data.id,
            email: response.data.email,
            role: response.data.role,
            accountStatus: response.data.accountStatus,
          };
          setUser(freshUser);
          setAccessToken(token);
          setAuthSession({ accessToken: token, user: freshUser });
        }
      } catch (err) {
        // If 401, session has expired
        if (isMounted) {
          if (err.status === 401) {
            clearAuthSession();
            setUser(null);
            setAccessToken(null);
          } else {
            // Keep cached user if network glitch on startup
            setUser(cachedUser);
            setAccessToken(token);
          }
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initAuth();

    // Listen for unauthorized events emitted by API client
    const handleUnauthorized = () => {
      setUser(null);
      setAccessToken(null);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);

    return () => {
      isMounted = false;
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = useCallback(async (credentials) => {
    setError(null);
    try {
      const response = await api.auth.login(credentials);
      const authData = response.data;

      const authenticatedUser = {
        id: authData.userId,
        email: authData.email,
        role: authData.role,
        accountStatus: authData.accountStatus,
      };

      setAuthSession({
        accessToken: authData.accessToken,
        refreshToken: authData.refreshToken,
        user: authenticatedUser,
      });

      setUser(authenticatedUser);
      setAccessToken(authData.accessToken);
      return authenticatedUser;
    } catch (err) {
      setError(err.message || 'Login failed');
      throw err;
    }
  }, []);

  const registerStudent = useCallback(async (payload) => {
    setError(null);
    try {
      const response = await api.auth.registerStudent(payload);
      const authData = response.data;

      const authenticatedUser = {
        id: authData.userId,
        email: authData.email,
        role: authData.role,
        accountStatus: authData.accountStatus,
      };

      setAuthSession({
        accessToken: authData.accessToken,
        refreshToken: authData.refreshToken,
        user: authenticatedUser,
      });

      setUser(authenticatedUser);
      setAccessToken(authData.accessToken);
      return authenticatedUser;
    } catch (err) {
      setError(err.message || 'Student registration failed');
      throw err;
    }
  }, []);

  const registerCompany = useCallback(async (payload) => {
    setError(null);
    try {
      const response = await api.auth.registerCompany(payload);
      const authData = response.data;

      const registeredUser = {
        id: authData.userId,
        email: authData.email,
        role: authData.role,
        accountStatus: authData.accountStatus, // typically PENDING
      };

      // Even if token is issued, company might be PENDING approval
      setAuthSession({
        accessToken: authData.accessToken,
        refreshToken: authData.refreshToken,
        user: registeredUser,
      });

      setUser(registeredUser);
      setAccessToken(authData.accessToken);
      return { user: registeredUser, message: response.message };
    } catch (err) {
      setError(err.message || 'Company registration failed');
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      clearAuthSession();
      setUser(null);
      setAccessToken(null);
      setError(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.user.getMe();
      if (response?.data) {
        const freshUser = {
          id: response.data.id,
          email: response.data.email,
          role: response.data.role,
          accountStatus: response.data.accountStatus,
        };
        setUser(freshUser);
        const token = getAccessToken();
        setAuthSession({ accessToken: token, user: freshUser });
        return freshUser;
      }
    } catch (err) {
      // ignore
    }
    return null;
  }, []);

  const value = {
    user,
    accessToken,
    isAuthenticated: !!accessToken && !!user,
    isLoading,
    error,
    login,
    registerStudent,
    registerCompany,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
