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

  // Sync current user on mount
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
        if (isMounted) {
          if (err.status === 401) {
            clearAuthSession();
            setUser(null);
            setAccessToken(null);
          } else {
            // Keep cached user if momentary offline/backend delay
            setUser(cachedUser);
            setAccessToken(token);
          }
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initAuth();

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
      clearAuthSession();
      const response = await api.auth.login(credentials);
      const authData = response.data;

      const authenticatedUser = {
        id: authData.userId,
        email: authData.email,
        role: authData.role,
        accountStatus: authData.accountStatus,
        mustChangePassword: Boolean(authData.mustChangePassword),
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
      setError(err.message);
      throw err;
    }
  }, []);

  const registerStudent = useCallback(async (data) => {
    setError(null);
    try {
      const response = await api.auth.registerStudent(data);
      const authData = response.data;

      const authenticatedUser = {
        id: authData.userId,
        email: authData.email,
        role: authData.role,
        accountStatus: authData.accountStatus,
        mustChangePassword: Boolean(authData.mustChangePassword),
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
      setError(err.message);
      throw err;
    }
  }, []);

  const changePassword = useCallback(async ({ oldPassword, newPassword }) => {
    setError(null);
    try {
      await api.auth.changePassword({ oldPassword, newPassword });
      setUser((prev) => {
        if (!prev) return null;
        const updated = { ...prev, mustChangePassword: false };
        setAuthSession({ user: updated });
        return updated;
      });
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch {
      // Ignore network errors on logout to ensure client session is cleared
    } finally {
      clearAuthSession();
      setUser(null);
      setAccessToken(null);
    }
  }, []);

  const value = {
    user,
    accessToken,
    isAuthenticated: Boolean(user && accessToken),
    isLoading,
    error,
    login,
    registerStudent,
    changePassword,
    logout,
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
