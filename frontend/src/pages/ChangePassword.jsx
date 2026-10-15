import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, AlertCircle, Shield } from 'lucide-react';
import { adminApi, handleApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const ChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const { changePassword, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const validate = () => {
    const newErrors = {};

    if (!currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters long';
    }

    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (currentPassword === newPassword && currentPassword) {
      newErrors.newPassword = 'New password must be different from current password';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validate();
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return;

    setSubmitting(true);

    try {
      await adminApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      await changePassword(currentPassword, newPassword);

      toast.success('Password changed successfully', 'Security Update');
      navigate('/admin/policies');
    } catch (err) {
      const message = handleApiError(err);
      setErrors({ submit: message });
      toast.error(message, 'Password Change Failed');
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
            <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              Change Password
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
              You must change your password before accessing policy management.
            </p>
          </div>

          <div className="card">
            {errors.submit && (
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
              }} role="alert">
                <AlertCircle size={16} />
                <span>{errors.submit}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label htmlFor="currentPassword" className="form-label required">Current Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    id="currentPassword"
                    name="current_password"
                    className={`form-input ${errors.currentPassword ? 'error' : ''}`}
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      if (errors.currentPassword) setErrors(prev => ({ ...prev, currentPassword: undefined }));
                    }}
                    disabled={submitting}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    aria-label={showCurrent ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.currentPassword && <div className="form-error" role="alert"><AlertCircle size={14} /><span>{errors.currentPassword}</span></div>}
              </div>

              <div className="form-group">
                <label htmlFor="newPassword" className="form-label required">New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNew ? 'text' : 'password'}
                    id="newPassword"
                    name="new_password"
                    className={`form-input ${errors.newPassword ? 'error' : ''}`}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (errors.newPassword) setErrors(prev => ({ ...prev, newPassword: undefined }));
                    }}
                    disabled={submitting}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    aria-label={showNew ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.newPassword && <div className="form-error" role="alert"><AlertCircle size={14} /><span>{errors.newPassword}</span></div>}
                <div className="form-hint">Minimum 8 characters.</div>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword" className="form-label required">Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirm_password"
                    className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: undefined }));
                    }}
                    disabled={submitting}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.confirmPassword && <div className="form-error" role="alert"><AlertCircle size={14} /><span>{errors.confirmPassword}</span></div>}
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={logout}
                  disabled={submitting}
                  style={{ flex: 1 }}
                >
                  Sign Out
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{ flex: 1 }}
                >
                  {submitting ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};