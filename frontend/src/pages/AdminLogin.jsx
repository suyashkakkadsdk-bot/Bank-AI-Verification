import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const { login, isAuthenticated, passwordChangeRequired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  useEffect(() => {
    if (isAuthenticated) {
      if (passwordChangeRequired) {
        navigate('/admin/change-password');
      } else {
        navigate('/');
      }
    }
  }, [isAuthenticated, passwordChangeRequired, navigate]);

  useEffect(() => {
    if (location.search.includes('session=expired')) {
      setServerError('Your session has expired. Please log in again.');
    }
  }, [location.search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    const newErrors = {};
    if (!username.trim()) newErrors.username = 'Username is required';
    if (!password) newErrors.password = 'Password is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    setServerError('');

    try {
      await login(username, password);
      toast.success('Login successful', 'Welcome');
      if (passwordChangeRequired) {
        navigate('/admin/change-password');
      } else {
        navigate('/');
      }
    } catch (err) {
      if (err.response?.status === 429) {
        setServerError('Too many failed login attempts. Please try again later.');
      } else if (err.response?.status === 401) {
        setServerError('Invalid username or password.');
      } else {
        setServerError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
      }
      toast.error('Login failed', 'Authentication Error');
    } finally {
      setSubmitting(false);
    }
  };

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
              VeriFy
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
              Administrator Login
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
                <label htmlFor="username" className="form-label">Username</label>
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
                <label htmlFor="password" className="form-label">Password</label>
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
                    style={showPassword ? {} : {}}
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
                    Logging in...
                  </>
                ) : (
                  <>Sign In</>
                )}
              </button>
            </form>
          </div>

          <div style={{
            textAlign: 'center',
            marginTop: '1.5rem',
            padding: '1rem',
            fontSize: '0.8125rem',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
          }}>
            <Lock size={14} />
            Secured by HMAC-signed bearer tokens
          </div>
        </div>
      </div>
    </div>
  );
};