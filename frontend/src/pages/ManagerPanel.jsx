import { useState } from 'react';
import { Shield, Users, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const ManagerPanel = () => {
  const { user, login } = useAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [verified, setVerified] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setServerError('');

    const newErrors = {};
    if (!username.trim()) newErrors.username = 'Username is required';
    if (!password) newErrors.password = 'Password is required';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    try {
      await login(username, password);
      setVerified(true);
      setServerError('');
      toast.success('Manager verification successful', 'Verified');
    } catch (err) {
      if (err.response?.status === 401) {
        setServerError('Invalid username or password.');
      } else if (err.response?.status === 429) {
        setServerError('Too many failed attempts. Please try again later.');
      } else {
        setServerError(err.response?.data?.detail || 'Verification failed.');
      }
      toast.error('Manager verification failed', 'Authentication Error');
    } finally {
      setSubmitting(false);
    }
  };

  const showPolicyCard = user?.role === 'admin' || user?.role === 'manager';

  if (verified) {
    return (
      <div className="page">
        <header className="page-header">
          <div>
            <h1 className="page-title">Manager Panel</h1>
            <p className="page-subtitle">
              Manage verification policies and employee accounts.
            </p>
          </div>
        </header>

        <div className="page-content">
          <div className="section" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {showPolicyCard && (
                <NavLink
                  to="/admin/policies"
                  className="nav-link card-hover"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1.5rem',
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-primary)',
                    textDecoration: 'none',
                    color: 'inherit',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--brand-light)',
                    color: 'var(--brand-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Shield size={24} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      color: 'var(--text-primary)',
                    }}>
                      Policy Management
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      Create, edit, and manage verification rules.
                    </div>
                  </div>
                </NavLink>
              )}

              <NavLink
                to="/admin/employees"
                className="nav-link card-hover"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1.5rem',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-primary)',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--brand-light)',
                  color: 'var(--brand-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Users size={24} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                  }}>
                    Employee Management
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    Manage employee accounts and reset passwords.
                  </div>
                </div>
              </NavLink>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      <div className="page-content" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '2rem',
      }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: 'var(--radius-lg)',
              background: 'var(--brand-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
            }}>
              <Shield size={32} color="white" />
            </div>
            <h1 style={{
              fontSize: '1.75rem',
              fontWeight: '700',
              color: 'var(--text-primary)',
              marginBottom: '0.25rem',
            }}>
              Manager Verification
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
              Please re-enter your credentials to access manager features.
            </p>
          </div>

          <div className="card">
            {serverError && (
              <div style={{
                padding: '0.75rem 1rem',
                background: 'var(--risk-high-bg)',
                border: '1px solid var(--risk-high)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'var(--risk-high)',
                fontSize: '0.875rem',
              }} role="alert">
                <AlertCircle size={16} />
                <span>{serverError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label htmlFor="username" className="form-label required">Username</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  className={`form-input ${errors.username ? 'error' : ''}`}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={submitting}
                  placeholder="Enter your username"
                  aria-invalid={errors.username ? 'true' : 'false'}
                  autoComplete="username"
                />
                {errors.username && (
                  <div className="form-error" role="alert">
                    <AlertCircle size={14} />
                    <span>{errors.username}</span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="password" className="form-label required">Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    className={`form-input ${errors.password ? 'error' : ''}`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting}
                    placeholder="Enter your password"
                    aria-invalid={errors.password ? 'true' : 'false'}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      padding: '0.25rem',
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && (
                  <div className="form-error" role="alert">
                    <AlertCircle size={14} />
                    <span>{errors.password}</span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%' }}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <div className="spinner" style={{ width: '20px', height: '20px' }} />
                    Verifying...
                  </>
                ) : (
                  <>Verify</>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
