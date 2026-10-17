import { useState, useEffect, useCallback } from 'react';
import { Shield, Plus, Edit, Trash2, AlertCircle, Save, X, RefreshCw, Filter, ArrowLeft, PlusCircle, Trash } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { adminApi, handleApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Modal, ConfirmDialog } from '../components/Modal';
import { formatDate } from '../utils/formatters';

const EMPTY_RULE = {
  rule_name: '',
  rule_description: '',
  severity: 'medium',
  rule_type: 'LOAN',
  parameters: {},
};

const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const RULE_TYPE_OPTIONS = [
  { value: 'LOAN', label: 'Loan' },
  { value: 'FRAUD', label: 'Fraud' },
];

const getSeverityColor = (severity) => {
  switch (severity?.toLowerCase()) {
    case 'low': return 'badge-low';
    case 'high': return 'badge-high';
    case 'medium':
    default: return 'badge-medium';
  }
};

const ParametersEditor = ({ value, onChange, onValidityChange }) => {
  const [entries, setEntries] = useState(() => Object.entries(value || {}));
  const [jsonErrors, setJsonErrors] = useState({});
  const [jsonDrafts, setJsonDrafts] = useState({});

  useEffect(() => {
    setEntries(Object.entries(value || {}));
  }, [value]);

  const hasBlanksOrDups = (currentEntries) => {
    const hasBlank = currentEntries.some(([k]) => !k || !k.trim());
    const hasDup = currentEntries.some(([k], idx) =>
      k && k.trim() && currentEntries.some(([k2], idx2) => k === k2 && idx !== idx2)
    );
    return hasBlank || hasDup;
  };

  useEffect(() => {
    const hasJsonError = Object.keys(jsonErrors).length > 0;
    const hasInvalid = hasBlanksOrDups(entries);
    if (onValidityChange) onValidityChange(hasJsonError || hasInvalid);
  }, [entries, jsonErrors, onValidityChange]);

  const getValueDisplay = (val) => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'object' && !(val instanceof Date)) {
      try {
        return JSON.stringify(val);
      } catch {
        return String(val);
      }
    }
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    return String(val);
  };

  const getInputType = (val) => {
    if (typeof val === 'number') return 'number';
    if (typeof val === 'boolean') return 'checkbox';
    if (typeof val === 'object' && val !== null) return 'json';
    return 'text';
  };

  const updateEntries = (newEntries) => {
    setEntries(newEntries);
    const result = {};
    newEntries.forEach(([key, rawVal]) => {
      if (key !== undefined && key !== null) {
        const trimmed = key.trim();
        if (trimmed) {
          result[trimmed] = rawVal;
        } else {
          result[key] = rawVal;
        }
      }
    });
    if (!hasBlanksOrDups(newEntries)) {
      onChange(result);
    }
  };

  const updateKey = (idx, newKey) => {
    const newEntries = entries.map((e, i) => (i === idx ? [newKey, e[1]] : e));
    updateEntries(newEntries);
  };

  const updateValue = (idx, rawVal) => {
    const newEntries = entries.map((e, i) => (i === idx ? [e[0], rawVal] : e));
    updateEntries(newEntries);
  };

  const removeEntry = (idx) => {
    const newEntries = entries.filter((_, i) => i !== idx);
    updateEntries(newEntries);
  };

  const addEntry = () => {
    const newEntries = [...entries, ['', '']];
    updateEntries(newEntries);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {entries.length === 0 ? (
        <div style={{
          padding: '1.5rem',
          textAlign: 'center',
          background: 'var(--bg-primary)',
          border: '2px dashed var(--border-primary)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-secondary)',
        }}>
          <Plus size={24} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
          <p style={{ fontSize: '0.875rem', marginBottom: '0.75rem' }}>No parameters configured.</p>
          <button type="button" className="btn btn-primary btn-sm" onClick={addEntry}>
            <Plus size={14} />
            Add Parameter
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {entries.map(([key, val], idx) => {
            const dup = entries.some(([k2], idx2) => key && key.trim() && key === k2 && idx !== idx2);
            const blank = !key || !key.trim();
            const inputType = getInputType(val);
            return (
              <div key={idx} style={{
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'flex-end',
                paddingBottom: '0.5rem',
                borderBottom: idx < entries.length - 1 ? '1px solid var(--border-primary)' : 'none',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <label style={{
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: 'var(--text-secondary)',
                    marginBottom: '0.125rem',
                    display: 'block',
                  }}>Parameter Name</label>
                  <input
                    type="text"
                    className={`form-input ${blank || dup ? 'error' : ''}`}
                    value={key || ''}
                    onChange={(e) => updateKey(idx, e.target.value)}
                    placeholder="e.g. threshold"
                    aria-invalid={blank || dup ? 'true' : 'false'}
                  />
                  {(blank || dup) && (
                    <div className="form-error" role="alert" style={{ marginTop: '0.125rem' }}>
                      <AlertCircle size={12} />
                      <span style={{ fontSize: '0.75rem' }}>
                        {blank ? 'Parameter name is required' : 'Duplicate parameter name'}
                      </span>
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <label style={{
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: 'var(--text-secondary)',
                    marginBottom: '0.125rem',
                    display: 'block',
                  }}>Parameter Value</label>
                  {inputType === 'checkbox' ? (
                    <div style={{ paddingTop: '0.5rem' }}>
                      <label style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                      }}>
                        <input
                          type="checkbox"
                          checked={val || false}
                          onChange={(e) => updateValue(idx, e.target.checked)}
                        />
                        <span>{val ? 'true' : 'false'}</span>
                      </label>
                    </div>
                  ) : inputType === 'number' ? (
                    <input
                      type="number"
                      className="form-input"
                      value={val ?? ''}
                      onChange={(e) => updateValue(idx, e.target.value === '' ? null : Number(e.target.value))}
                    />
                   ) : inputType === 'json' ? (
                    <>
                    <input
                      type="text"
                      className={`form-input ${jsonErrors[idx] ? 'error' : ''}`}
                      value={jsonDrafts[idx] !== undefined ? jsonDrafts[idx] : getValueDisplay(val)}
                      onChange={(e) => {
                        const text = e.target.value;
                        setJsonDrafts(prev => ({ ...prev, [idx]: text }));
                        try {
                          const parsed = JSON.parse(text);
                          setJsonErrors(prev => {
                            const next = { ...prev };
                            delete next[idx];
                            return next;
                          });
                          updateValue(idx, parsed);
                        } catch {
                          setJsonErrors(prev => ({ ...prev, [idx]: 'Invalid JSON' }));
                        }
                      }}
                      aria-invalid={jsonErrors[idx] ? 'true' : 'false'}
                      style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
                    />
                    {jsonErrors[idx] && (
                      <div className="form-error" role="alert" style={{ marginTop: '0.125rem' }}>
                        <AlertCircle size={12} />
                        <span style={{ fontSize: '0.75rem' }}>{jsonErrors[idx]}</span>
                      </div>
                    )}
                    </>
                  ) : (
                    <input
                      type="text"
                      className="form-input"
                      value={val ?? ''}
                      onChange={(e) => updateValue(idx, e.target.value)}
                    />
                  )}
                </div>
                <div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => removeEntry(idx)}
                    aria-label={`Remove ${key || 'parameter'}`}
                    title="Remove parameter"
                    style={{ padding: '0.375rem' }}
                  >
                    <Trash size={14} color="var(--border-error)" />
                  </button>
                </div>
              </div>
            );
          })}
          <div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={addEntry}>
              <PlusCircle size={14} />
              Add Parameter
            </button>
          </div>
          {entries.some(([k]) => !k || !k.trim()) && (
            <div className="form-error" role="alert" style={{ marginTop: '0.5rem' }}>
              <AlertCircle size={12} />
              <span style={{ fontSize: '0.8rem' }}>Parameter names cannot be blank.</span>
            </div>
          )}
          {entries.some(([k], idx) => k && k.trim() && entries.some(([k2], idx2) => k === k2 && idx !== idx2)) && (
            <div className="form-error" role="alert" style={{ marginTop: '0.5rem' }}>
              <AlertCircle size={12} />
              <span style={{ fontSize: '0.8rem' }}>Each parameter name must be unique.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const PolicyManagement = () => {
  const { passwordChangeRequired, isAuthenticated } = useAuth();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('');
  const [hasParamErrors, setHasParamErrors] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [deletingRule, setDeletingRule] = useState(null);
  const [formValues, setFormValues] = useState(EMPTY_RULE);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const fetchRules = useCallback(async () => {
    if (!isAuthenticated || passwordChangeRequired) return;
    setLoading(true);
    setError('');
    try {
      const response = await adminApi.listRules(filterType || undefined);
      setRules(response?.data?.rules || []);
    } catch (err) {
      const message = handleApiError(err);
      setError(message);
      setRules([]);
      toast.error(message, 'Failed to Load Policies');
    } finally {
      setLoading(false);
    }
  }, [filterType, toast, isAuthenticated, passwordChangeRequired]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleCreate = async () => {
    setFormErrors({});
    const newErrors = {};
    if (!formValues.rule_name.trim()) newErrors.rule_name = 'Rule name is required';
    if (!formValues.rule_description.trim()) newErrors.rule_description = 'Description is required';
    if (!formValues.severity) newErrors.severity = 'Severity is required';
    if (!formValues.rule_type) newErrors.rule_type = 'Rule type is required';

    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors);
      return;
    }

    setSubmitting(true);
    try {
      await adminApi.createRule({
        rule_name: formValues.rule_name,
        rule_description: formValues.rule_description,
        severity: formValues.severity,
        rule_type: formValues.rule_type,
        parameters: formValues.parameters,
      });
      toast.success('Policy rule created successfully', 'Success');
      setShowCreateModal(false);
      setFormValues(EMPTY_RULE);
      setFormErrors({});
      fetchRules();
    } catch (err) {
      const message = handleApiError(err);
      setFormErrors({ submit: message });
      toast.error(message, 'Failed to Create Rule');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingRule) return;
    setFormErrors({});
    setSubmitting(true);
    try {
      await adminApi.updateRule(editingRule.id, {
        rule_name: formValues.rule_name,
        rule_description: formValues.rule_description,
        severity: formValues.severity,
        parameters: formValues.parameters,
        is_active: formValues.is_active,
      });
      toast.success('Policy rule updated successfully', 'Success');
      setEditingRule(null);
      setShowCreateModal(false);
      setFormErrors({});
      fetchRules();
    } catch (err) {
      const message = handleApiError(err);
      setFormErrors({ submit: message });
      toast.error(message, 'Failed to Update Rule');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingRule) return;
    setSubmitting(true);
    try {
      const response = await adminApi.deleteRule(deletingRule.id);
      toast.success(response?.data?.message || 'Rule deactivated', 'Success');
      setDeletingRule(null);
      fetchRules();
    } catch (err) {
      const message = handleApiError(err);
      toast.error(message, 'Failed to Delete Rule');
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (rule) => {
    setFormValues({
      rule_name: rule.rule_name,
      rule_description: rule.rule_description,
      severity: rule.severity,
      rule_type: rule.rule_type,
      parameters: rule.parameters || {},
      is_active: rule.is_active,
    });
    setFormErrors({});
    setEditingRule(rule);
  };

  const openCreate = () => {
    setFormValues(EMPTY_RULE);
    setFormErrors({});
    setEditingRule(null);
    setShowCreateModal(true);
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingRule(null);
    setFormValues(EMPTY_RULE);
    setFormErrors({});
    setHasParamErrors(false);
  };

  if (passwordChangeRequired) {
    return (
      <div className="page">
        <div className="page-content">
          <div className="empty-state">
            <div className="empty-state-icon">
              <Shield size={48} />
            </div>
            <h3 className="empty-state-title">Password Change Required</h3>
            <p className="empty-state-text">
              You must change your password before accessing policy management features.
            </p>
            <NavLink to="/admin/change-password" className="btn btn-primary">
              Change Password
            </NavLink>
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
              <h1 className="page-title">Policy Management</h1>
              <p className="page-subtitle">
                Manage verification rules for loan and fraud policies.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div className="flex-center" style={{ gap: '0.5rem' }}>
              <Filter size={18} color="var(--text-secondary)" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="form-input"
                style={{ width: 'auto', padding: '0.5rem 1rem' }}
              >
                <option value="">All Types</option>
                {RULE_TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={fetchRules}
              disabled={loading}
              aria-label="Refresh policies"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              className="btn btn-primary"
              onClick={openCreate}
              aria-label="Create new rule"
            >
              <Plus size={16} />
              Create Rule
            </button>
          </div>
        </div>
      </header>

      <div className="page-content">
        <div className="section">
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
          ) : rules.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Shield size={48} />
              </div>
              <h3 className="empty-state-title">No Rules Found</h3>
              <p className="empty-state-text">
                {filterType
                  ? `No rules found for ${filterType === 'LOAN' ? 'Loan' : 'Fraud'} type.`
                  : 'Get started by creating a new verification rule.'}
              </p>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Version</th>
                    <th>Created</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map(rule => (
                    <tr key={rule.id}>
                      <td>
                        <div style={{ fontWeight: '500' }}>{rule.rule_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {rule.rule_description ? (typeof rule.rule_description === 'string'
                            ? rule.rule_description.substring(0, 50) + (rule.rule_description.length > 50 ? '...' : '')
                            : String(rule.rule_description)) : 'No description'}
                        </div>
                      </td>
                      <td>
                        <span className="badge">{rule.rule_type}</span>
                      </td>
                      <td>
                        <span className={`badge ${getSeverityColor(rule.severity)}`}>{rule.severity}</span>
                      </td>
                      <td>
                        <span className={`badge ${rule.is_active ? 'badge-verified' : 'badge-review'}`}>
                          {rule.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>{rule.version}</td>
                      <td>{formatDate(rule.created_at)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => openEdit(rule)}
                            aria-label={`Edit ${rule.rule_name}`}
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setDeletingRule(rule)}
                            aria-label={`Delete ${rule.rule_name}`}
                            title="Delete"
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

      <RuleModal
        isOpen={showCreateModal || !!editingRule}
        onClose={closeModal}
        title={editingRule ? 'Edit Rule' : 'Create Rule'}
        values={formValues}
        errors={formErrors}
        onValuesChange={setFormValues}
        onErrorsChange={setFormErrors}
        onSubmit={editingRule ? handleUpdate : handleCreate}
        submitting={submitting}
        isEditing={!!editingRule}
        onValidityChange={setHasParamErrors}
        hasParamErrors={hasParamErrors}
      />

      <ConfirmDialog
        isOpen={!!deletingRule}
        onClose={() => setDeletingRule(null)}
        onConfirm={handleDelete}
        title="Deactivate Rule"
        message={`Are you sure you want to deactivate "${deletingRule?.rule_name}"? This will set the rule to inactive and it will no longer be used by the verification engine.`}
        confirmText="Deactivate"
        variant="danger"
        loading={submitting}
      />
    </div>
  );
};

const RuleModal = ({ isOpen, onClose, title, values, errors, onValuesChange, onErrorsChange, onSubmit, submitting, isEditing, onValidityChange, hasParamErrors }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="lg"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div className="form-group">
          <label htmlFor="rule_name" className="form-label required">Rule Name</label>
          <input
            type="text"
            id="rule_name"
            className={`form-input ${errors.rule_name ? 'error' : ''}`}
            value={values.rule_name || ''}
            onChange={(e) => {
              onValuesChange({ ...values, rule_name: e.target.value });
              if (errors.rule_name && onErrorsChange) onErrorsChange(prev => ({ ...prev, rule_name: undefined }));
            }}
            placeholder="e.g. Loan Credit Score Risk"
            aria-invalid={errors.rule_name ? 'true' : 'false'}
          />
          {errors.rule_name && (
            <div className="form-error" role="alert">
              <AlertCircle size={14} />
              <span>{errors.rule_name}</span>
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="rule_description" className="form-label required">Description</label>
          <textarea
            id="rule_description"
            className={`form-input ${errors.rule_description ? 'error' : ''}`}
            value={values.rule_description || ''}
            onChange={(e) => {
              onValuesChange({ ...values, rule_description: e.target.value });
              if (errors.rule_description && onErrorsChange) onErrorsChange(prev => ({ ...prev, rule_description: undefined }));
            }}
            rows={3}
            placeholder="Describe what this rule does..."
            aria-invalid={errors.rule_description ? 'true' : 'false'}
          />
          {errors.rule_description && (
            <div className="form-error" role="alert">
              <AlertCircle size={14} />
              <span>{errors.rule_description}</span>
            </div>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="severity" className="form-label required">Severity</label>
            <select
              id="severity"
              className={`form-input ${errors.severity ? 'error' : ''}`}
              value={values.severity || 'medium'}
              onChange={(e) => onValuesChange({ ...values, severity: e.target.value })}
              aria-invalid={errors.severity ? 'true' : 'false'}
            >
              {SEVERITY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {errors.severity && (
              <div className="form-error" role="alert">
                <AlertCircle size={14} />
                <span>{errors.severity}</span>
              </div>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="rule_type" className="form-label required">Rule Type</label>
            <select
              id="rule_type"
              className={`form-input ${errors.rule_type ? 'error' : ''}`}
              value={values.rule_type || 'LOAN'}
              onChange={(e) => onValuesChange({ ...values, rule_type: e.target.value })}
              aria-invalid={errors.rule_type ? 'true' : 'false'}
              disabled={isEditing}
            >
              {RULE_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {errors.rule_type && (
              <div className="form-error" role="alert">
                <AlertCircle size={14} />
                <span>{errors.rule_type}</span>
              </div>
            )}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="parameters" className="form-label">Policy Parameters</label>
          <div
            id="parameters"
            className="form-input"
            style={{
              padding: '0.75rem',
              maxHeight: '400px',
              overflowY: 'auto',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-primary)',
            }}
            aria-label="Policy parameters editor"
          >
            <ParametersEditor
              value={values.parameters || {}}
              onChange={(newParams) => onValuesChange({ ...values, parameters: newParams })}
              onValidityChange={onValidityChange}
            />
          </div>
        </div>

        {isEditing && (
          <div className="form-group">
            <label className="form-checkbox">
              <input
                type="checkbox"
                checked={values.is_active || false}
                onChange={(e) => onValuesChange({ ...values, is_active: e.target.checked })}
              />
              <span>Active</span>
            </label>
          </div>
        )}

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
          disabled={submitting || hasParamErrors}
        >
          {submitting ? (
            <>
              <div className="spinner" style={{ width: '16px', height: '16px' }} />
              {isEditing ? 'Saving...' : 'Creating...'}
            </>
          ) : (
            <>
              <Save size={16} />
              {isEditing ? 'Save Changes' : 'Create Rule'}
            </>
          )}
        </button>
      </div>
    </Modal>
  );
};

const _ = Shield;
