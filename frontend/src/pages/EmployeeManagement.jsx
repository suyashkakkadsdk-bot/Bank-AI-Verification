import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Trash2, AlertCircle, Save, X, RefreshCw, UserCheck, UserX, Copy, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { adminApi, handleApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Modal, ConfirmDialog } from '../components/Modal';
import { formatDate } from '../utils/formatters';

const EMPTY_EMPLOYEE = {
  username: '',
  password: '',
  confirmPassword: '',
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Employees' },
  { value: 'active', label: 'Active Only' },
  { value: 'inactive', label: 'Inactive Only' },
];

export const EmployeeManagement = () => {
  const { passwordChangeRequired, isAuthenticated } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingEmployee, setDeletingEmployee] = useState(null);
  const [resettingEmployee, setResettingEmployee] = useState(null);
  const [formValues, setFormValues] = useState(EMPTY_EMPLOYEE);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [showTempPassword, setShowTempPassword] = useState(false);
  const toast = useToast();

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await adminApi.listEmployees();
      let emps = response?.data?.employees || [];
      if (statusFilter === 'active') {
        emps = emps.filter(e => e.is_active);
      } else if (statusFilter === 'inactive') {
        emps = emps.filter(e => !e.is_active);
      }
      setEmployees(emps);
    } catch (err) {
      const message = handleApiError(err);
      setError(message);
      setEmployees([]);
      toast.error(message, 'Failed to Load Employees');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, toast]);

  useEffect(() => {
    if (isAuthenticated && !passwordChangeRequired) {
      fetchEmployees();
    }
  }, [fetchEmployees, isAuthenticated, passwordChangeRequired]);

  const handleCreate = async () => {
    setFormErrors({});
    const newErrors = {};
    if (!formValues.username.trim()) newErrors.username = 'Username is required';
    if (!formValues.username || !/^[a-zA-Z0-9_]+$/.test(formValues.username)) {
      newErrors.username = 'Username must contain only letters, numbers, and underscores';
    }
    if (!formValues.password) {
      newErrors.password = 'Password is required';
    } else if (formValues.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }
    if (formValues.password !== formValues.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors);
      return;
    }

    setSubmitting(true);
    try {
      const response = await adminApi.createEmployee({
        username: formValues.username,
        password: formValues.password,
      });
      const emp = response?.data;
      if (emp?.temporary_password) {
        setTempPassword(emp.temporary_password);
        setShowTempPassword(true);
      }
      toast.success('Employee created successfully. They must change password on first login.', 'Success');
      setShowCreateModal(false);
      setFormValues(EMPTY_EMPLOYEE);
      fetchEmployees();
    } catch (err) {
      const message = handleApiError(err);
      setFormErrors({ submit: message });
      toast.error(message, 'Failed to Create Employee');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (employee) => {
    setResettingEmployee(employee);
    try {
      const response = await adminApi.resetEmployeePassword(employee.id);
      const tempPw = response?.data?.temporary_password;
      if (tempPw) {
        setTempPassword(tempPw);
        setShowTempPassword(true);
      }
      toast.success('Password reset successfully', 'Success');
    } catch (err) {
      const message = handleApiError(err);
      toast.error(message, 'Failed to Reset Password');
    } finally {
      setResettingEmployee(null);
    }
  };

  const handleActivate = async (employee) => {
    try {
      await adminApi.activateEmployee(employee.id);
      toast.success(`${employee.username} activated`, 'Success');
      fetchEmployees();
    } catch (err) {
      const message = handleApiError(err);
      toast.error(message, 'Failed to Activate Employee');
    }
  };

  const handleDeactivate = async (employee) => {
    try {
      await adminApi.deactivateEmployee(employee.id);
      toast.success(`${employee.username} deactivated`, 'Success');
      fetchEmployees();
    } catch (err) {
      const message = handleApiError(err);
      toast.error(message, 'Failed to Deactivate Employee');
    }
  };

  const handleDelete = async () => {
    if (!deletingEmployee) return;
    setSubmitting(true);
    try {
      const response = await adminApi.deleteEmployee(deletingEmployee.id);
      toast.success(response?.data?.message || 'Employee deleted', 'Success');
      setDeletingEmployee(null);
      fetchEmployees();
    } catch (err) {
      const message = handleApiError(err);
      toast.error(message, 'Failed to Delete Employee');
    } finally {
      setSubmitting(false);
    }
  };

  const copyPassword = () => {
    const nav = window.navigator || navigator;
    if (nav?.clipboard) {
      nav.clipboard.writeText(tempPassword);
    }
    toast.success('Temporary password copied to clipboard', 'Copied');
  };

  if (passwordChangeRequired) {
    return (
      <div className="page">
        <div className="page-content">
          <div className="empty-state">
            <div className="empty-state-icon">
              <Users size={48} />
            </div>
            <h3 className="empty-state-title">Password Change Required</h3>
            <p className="empty-state-text">
              You must change your password before accessing employee management features.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <div className="flex-between">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <NavLink
              to="/admin/manager"
              className="btn btn-ghost btn-sm"
              style={{ padding: '0.5rem 0.75rem' }}
              aria-label="Back to Manager Panel"
            >
              <ArrowLeft size={16} />
            </NavLink>
            <div>
              <h1 className="page-title">Employee Management</h1>
              <p className="page-subtitle">
                Manage employee accounts and reset temporary passwords.
              </p>
            </div>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => {
              setFormValues(EMPTY_EMPLOYEE);
              setFormErrors({});
              setShowCreateModal(true);
            }}
          >
            <Plus size={16} />
            Create Employee
          </button>
        </div>
      </header>

      <div className="page-content">
        <div className="section">
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-input"
              style={{ width: 'auto', padding: '0.5rem 1rem' }}
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
              className="btn btn-secondary btn-sm"
              onClick={fetchEmployees}
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {error && (
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
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <div className="spinner" style={{ width: '32px', height: '32px', margin: '0 auto' }} />
            </div>
          ) : employees.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Users size={48} />
              </div>
              <h3 className="empty-state-title">No Employees Found</h3>
              <p className="empty-state-text">
                {statusFilter !== 'all'
                  ? `No ${statusFilter} employees found. Try a different filter.`
                  : 'Get started by creating a new employee account.'}
              </p>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Last Login</th>
                    <th>Created</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map(emp => (
                    <tr key={emp.id}>
                      <td>
                        <div style={{ fontWeight: '500' }}>{emp.username}</div>
                      </td>
                      <td>
                        <span className="badge">{emp.role}</span>
                      </td>
                      <td>
                        <span className={`badge ${emp.is_active ? 'badge-verified' : 'badge-review'}`}>
                          {emp.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>{formatDate(emp.last_login)}</td>
                      <td>{formatDate(emp.created_at)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                          {emp.is_active ? (
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleDeactivate(emp)}
                              aria-label={`Deactivate ${emp.username}`}
                              title="Deactivate"
                            >
                              <UserX size={16} />
                            </button>
                          ) : (
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleActivate(emp)}
                              aria-label={`Activate ${emp.username}`}
                              title="Activate"
                            >
                              <UserCheck size={16} />
                            </button>
                          )}
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleResetPassword(emp)}
                            disabled={resettingEmployee?.id === emp.id}
                            aria-label={`Reset password for ${emp.username}`}
                            title="Reset Password"
                          >
                            {resettingEmployee?.id === emp.id ? (
                              <div className="spinner" style={{ width: '16px', height: '16px' }} />
                            ) : (
                              <RefreshCw size={16} />
                            )}
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setDeletingEmployee(emp)}
                            aria-label={`Delete ${emp.username}`}
                            title="Delete (deactivates account)"
                          >
                            <Trash2 size={16} color="var(--border-error)" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <EmployeeModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setFormValues(EMPTY_EMPLOYEE);
          setFormErrors({});
        }}
        title="Create Employee"
        values={formValues}
        errors={formErrors}
        onValuesChange={setFormValues}
        onErrorsChange={setFormErrors}
        onSubmit={handleCreate}
        submitting={submitting}
      />

      <ConfirmDialog
        isOpen={!!deletingEmployee}
        onClose={() => setDeletingEmployee(null)}
        onConfirm={handleDelete}
        title="Delete Employee"
        message={`Are you sure you want to delete "${deletingEmployee?.username}"? This action will deactivate the account and it can only be restored by an administrator.`}
        confirmText="Delete"
        variant="danger"
        loading={submitting}
      />

      <Modal
        isOpen={showTempPassword}
        onClose={() => setShowTempPassword(false)}
        title="Temporary Password"
        size="sm"
      >
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>
            Share this temporary password with the employee. They will be required to change it on first login.
          </p>
          <div style={{
            padding: '0.75rem',
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-md)',
            fontFamily: 'var(--font-mono)',
            fontSize: '1.25rem',
            fontWeight: '600',
            textAlign: 'center',
            userSelect: 'all',
            marginBottom: '0.75rem',
          }}>
            {tempPassword}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-outline btn-sm" onClick={copyPassword}>
              <Copy size={14} />
              Copy
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowTempPassword(false)}>
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const EmployeeModal = ({ isOpen, onClose, title, values, errors, onValuesChange, onErrorsChange, onSubmit, submitting }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="md"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div className="form-group">
          <label htmlFor="username" className="form-label required">Username</label>
          <input
            type="text"
            id="username"
            className={`form-input ${errors.username ? 'error' : ''}`}
            value={values.username || ''}
            onChange={(e) => {
              onValuesChange({ ...values, username: e.target.value });
              if (errors.username && onErrorsChange) onErrorsChange(prev => ({ ...prev, username: undefined }));
            }}
            placeholder="e.g. john_doe"
            aria-invalid={errors.username ? 'true' : 'false'}
          />
          {errors.username && (
            <div className="form-error" role="alert">
              <AlertCircle size={14} />
              <span>{errors.username}</span>
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="password" className="form-label required">Initial Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              className={`form-input ${errors.password ? 'error' : ''}`}
              value={values.password || ''}
              onChange={(e) => {
                onValuesChange({ ...values, password: e.target.value });
                if (errors.password && onErrorsChange) onErrorsChange(prev => ({ ...prev, password: undefined }));
              }}
              placeholder="Minimum 8 characters"
              aria-invalid={errors.password ? 'true' : 'false'}
              autoComplete="new-password"
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

        <div className="form-group">
          <label htmlFor="confirmPassword" className="form-label required">Confirm Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showConfirm ? 'text' : 'password'}
              id="confirmPassword"
              className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
              value={values.confirmPassword || ''}
              onChange={(e) => {
                onValuesChange({ ...values, confirmPassword: e.target.value });
                if (errors.confirmPassword && onErrorsChange) onErrorsChange(prev => ({ ...prev, confirmPassword: undefined }));
              }}
              placeholder="Re-enter password"
              aria-invalid={errors.confirmPassword ? 'true' : 'false'}
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
                padding: '0.25rem',
              }}
            >
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.confirmPassword && (
            <div className="form-error" role="alert">
              <AlertCircle size={14} />
              <span>{errors.confirmPassword}</span>
            </div>
          )}
        </div>

        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          The employee will be required to change this password on first login.
        </div>

        {errors.submit && (
          <div className="form-error" role="alert">
            <AlertCircle size={14} />
            <span>{errors.submit}</span>
          </div>
        )}
      </div>

      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>
          <X size={16} />
          Cancel
        </button>
        <button
          className="btn btn-primary"
          onClick={onSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <>
              <div className="spinner" style={{ width: '16px', height: '16px' }} />
              Creating...
            </>
          ) : (
            <>
              <Save size={16} />
              Create Employee
            </>
          )}
        </button>
      </div>
    </Modal>
  );
};
