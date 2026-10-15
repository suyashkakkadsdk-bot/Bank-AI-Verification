import { useState, useEffect, useCallback } from 'react';
import { Shield, Plus, Edit, Trash2, AlertCircle, Save, X, RefreshCw, Filter } from 'lucide-react';
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

export const PolicyManagement = () => {
  const { passwordChangeRequired, isAuthenticated } = useAuth();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [deletingRule, setDeletingRule] = useState(null);
  const [formValues, setFormValues] = useState(EMPTY_RULE);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = filterType ? { rule_type: filterType } : {};
      const response = await adminApi.listRules(params.rule_type);
      setRules(response?.data?.rules || []);
    } catch (err) {
      const message = handleApiError(err);
      setError(message);
      setRules([]);
      toast.error(message, 'Failed to Load Rules');
    } finally {
      setLoading(false);
    }
  }, [filterType, toast]);

  useEffect(() => {
    if (isAuthenticated && !passwordChangeRequired) {
      fetchRules();
    }
  }, [fetchRules, isAuthenticated, passwordChangeRequired]);

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
        ...formValues,
        parameters: typeof formValues.parameters === 'string'
          ? JSON.parse(formValues.parameters || '{}')
          : formValues.parameters,
      });
      toast.success('Rule created successfully', 'Success');
      setShowCreateModal(false);
      setFormValues(EMPTY_RULE);
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
        parameters: typeof formValues.parameters === 'string'
          ? JSON.parse(formValues.parameters || '{}')
          : formValues.parameters,
        is_active: formValues.is_active,
      });
      toast.success('Rule updated successfully', 'Success');
      setEditingRule(null);
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
      const message = await adminApi.deleteRule(deletingRule.id);
      toast.success(message?.data?.message || 'Rule deactivated', 'Success');
      setDeletingRule(null);
      fetchRules();
    } catch (err) {
      const message = handleApiError(err);
      toast.error(message, 'Failed to Delete Rule');
    } finally {
      setSubmitting(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'low': return 'badge-low';
      case 'high': return 'badge-high';
      case 'medium':
      default: return 'badge-medium';
    }
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
            <button className="btn btn-primary" onClick={() => {}}>
              Change Password
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <div className="flex-between">
          <div>
            <h1 className="page-title">Policy Management</h1>
            <p className="page-subtitle">
              Manage verification rules for loan and fraud policies.
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => {
              setFormValues(EMPTY_RULE);
              setFormErrors({});
              setShowCreateModal(true);
            }}
          >
            <Plus size={16} />
            Create Rule
          </button>
        </div>
      </header>

      <div className="page-content">
        <div className="section">
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <div className="flex-center" style={{ gap: '0.5rem' }}>
              <Filter size={18} color="var(--text-secondary)" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="form-input"
                style={{ width: 'auto', padding: '0.5rem 1rem' }}
              >
                <option value="">All Types</option>
                <option value="LOAN">Loan</option>
                <option value="FRAUD">Fraud</option>
              </select>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={fetchRules}
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
                            onClick={() => {
                              setEditingRule(rule);
                              setFormValues({
                                ...EMPTY_RULE,
                                ...rule,
                                parameters: typeof rule.parameters === 'object' && rule.parameters
                                  ? JSON.stringify(rule.parameters, null, 2)
                                  : (rule.parameters || '{}'),
                                is_active: rule.is_active,
                              });
                              setShowCreateModal(false);
                            }}
                            aria-label={`Edit ${rule.rule_name}`}
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setDeletingRule(rule)}
                            aria-label={`Delete ${rule.rule_name}`}
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
        onClose={() => {
          setShowCreateModal(false);
          setEditingRule(null);
          setFormValues(EMPTY_RULE);
          setFormErrors({});
        }}
        title={editingRule ? 'Edit Rule' : 'Create Rule'}
        values={formValues}
        errors={formErrors}
        onValuesChange={setFormValues}
        onErrorsChange={setFormErrors}
        onSubmit={editingRule ? handleUpdate : handleCreate}
        submitting={submitting}
        isEditing={!!editingRule}
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

const RuleModal = ({ isOpen, onClose, title, values, errors, onValuesChange, onErrorsChange, onSubmit, submitting, isEditing }) => {
  const handleParamChange = (e) => {
    try {
      const parsed = JSON.parse(e.target.value || '{}');
      onValuesChange({ ...values, parameters: parsed });
    } catch {
      onValuesChange({ ...values, parameters: { _invalid: e.target.value } });
    }
  };

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
          </div>
          <div className="form-group">
            <label htmlFor="rule_type" className="form-label required">Rule Type</label>
            <select
              id="rule_type"
              className={`form-input ${errors.rule_type ? 'error' : ''}`}
              value={values.rule_type || 'LOAN'}
              onChange={(e) => onValuesChange({ ...values, rule_type: e.target.value })}
              aria-invalid={errors.rule_type ? 'true' : 'false'}
            >
              {RULE_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="parameters" className="form-label">Parameters (JSON)</label>
          <textarea
            id="parameters"
            className="form-input"
            value={typeof values.parameters === 'string'
              ? values.parameters
              : JSON.stringify(values.parameters || {}, null, 2)}
            onChange={handleParamChange}
            rows={6}
            placeholder='{"threshold": 700, "score": 0}'
            style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}
          />
          <div className="form-hint">
            Enter rule parameters as valid JSON.
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
          className={`btn ${isEditing ? 'btn-primary' : 'btn-primary'}`}
          onClick={onSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <>
              <div className="spinner" style={{ width: '16px', height: '16px' }} />
              {isEditing ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            <>
              <Save size={16} />
              {isEditing ? 'Update Rule' : 'Create Rule'}
            </>
          )}
        </button>
      </div>
    </Modal>
  );
};