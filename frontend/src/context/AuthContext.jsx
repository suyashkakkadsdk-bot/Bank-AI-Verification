import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { clearAuthSession, setAuthToken, adminApi } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [passwordChangeRequired, setPasswordChangeRequired] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem('verify_token');
    const storedUser = sessionStorage.getItem('verify_user');
    const storedPcr = sessionStorage.getItem('verify_pcr');

    if (token && storedUser) {
      setAuthToken(token);
      setUser(JSON.parse(storedUser));
      setPasswordChangeRequired(storedPcr === 'true');
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (username, password) => {
    const response = await adminApi.login({ username, password });
    const { token, password_change_required, role } = response.data;

    setAuthToken(token);
    const userData = { username, role };
    setUser(userData);
    setPasswordChangeRequired(password_change_required);

    sessionStorage.setItem('verify_token', token);
    sessionStorage.setItem('verify_user', JSON.stringify(userData));
    sessionStorage.setItem('verify_pcr', password_change_required.toString());

    return { token, password_change_required, role };
  }, []);

  const logout = useCallback(() => {
    clearAuthSession();
    setUser(null);
    setPasswordChangeRequired(false);
  }, []);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    const adminId = user?.id || 1;
    await adminApi.changePassword({ current_password: currentPassword, new_password: newPassword });
    setPasswordChangeRequired(false);
    sessionStorage.setItem('verify_pcr', 'false');
    if (user) {
      setUser({ ...user, password_change_required: false });
      sessionStorage.setItem('verify_user', JSON.stringify({ ...user, password_change_required: false }));
    }
  }, [user]);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    passwordChangeRequired,
    login,
    logout,
    changePassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};