import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, AlertCircle } from 'lucide-react';
import { verificationApi, handleApiError } from '../api/client';
import { useToast } from '../context/ToastContext';
import { parseISOToLocal, toISOString } from '../utils/formatters';
import { saveResultToSession } from './VerificationHistory';

const validateFraudForm = (values) => {
  const errors = {};

  if (!values.transaction_id?.trim()) errors.transaction_id = 'Transaction ID is required';
  if (!values.customer_id?.trim()) errors.customer_id = 'Customer ID is required';

  if (!values.amount && values.amount !== '0') {
    errors.amount = 'Amount is required';
  } else if (isNaN(parseFloat(values.amount)) || parseFloat(values.amount) < 0) {
    errors.amount = 'Amount must be a non-negative number';
  }

  if (!values.timestamp) errors.timestamp = 'Timestamp is required';

  if (!values.device?.trim()) errors.device = 'Device is required';
  if (!values.location?.trim()) errors.location = 'Location is required';
  if (!values.merchant?.trim()) errors.merchant = 'Merchant is required';

  if (!values.previous_transaction_behaviour?.trim()) {
    errors.previous_transaction_behaviour = 'Previous transaction behaviour is required';
  }

  if (!values.transaction_frequency && values.transaction_frequency !== '0') {
    errors.transaction_frequency = 'Transaction frequency is required';
  } else if (isNaN(parseInt(values.transaction_frequency)) || parseInt(values.transaction_frequency) < 0) {
    errors.transaction_frequency = 'Transaction frequency must be a non-negative integer';
  }

  return errors;
};

const initialValues = {
  transaction_id: '',
  customer_id: '',
  amount: '',
  timestamp: '',
  device: '',
  location: '',
  merchant: '',
  location_unusual: false,
  previous_transaction_behaviour: '',
  transaction_frequency: '',
};

export const FraudDetection = () => {
  const [formData, setFormData] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateFraudForm(formData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        transaction_id: formData.transaction_id,
        customer_id: formData.customer_id,
        amount: parseFloat(formData.amount),
        timestamp: formData.timestamp,
        device: formData.device,
        location: formData.location,
        merchant: formData.merchant,
        location_unusual: formData.location_unusual,
        previous_transaction_behaviour: formData.previous_transaction_behaviour,
        transaction_frequency: parseInt(formData.transaction_frequency, 10),
      };

      const response = await verificationApi.verifyFraud(payload);

      toast.success('Fraud analysis complete', 'Analysis Success');
      saveResultToSession(response.data, 'fraud');
      navigate('/result', { state: { result: response.data, caseType: 'fraud' } });
    } catch (err) {
      const errorMessage = handleApiError(err);
      toast.error(errorMessage, 'Analysis Failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Fraud Detection</h1>
        <p className="page-subtitle">Analyze a financial transaction for fraud indicators.</p>
      </header>

      <div className="page-content">
        <form onSubmit={handleSubmit} noValidate>
          <div className="section">
            <h2 className="section-title">Transaction Details</h2>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="transaction_id" className="form-label required">Transaction ID</label>
                <input
                  type="text"
                  id="transaction_id"
                  name="transaction_id"
                  className={`form-input ${errors.transaction_id ? 'error' : ''}`}
                  value={formData.transaction_id}
                  onChange={handleChange}
                  disabled={submitting}
                  placeholder="e.g. TXN001"
                  aria-invalid={errors.transaction_id ? 'true' : 'false'}
                />
                {errors.transaction_id && (
                  <div className="form-error" role="alert">
                    <AlertCircle size={14} />
                    <span>{errors.transaction_id}</span>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="customer_id" className="form-label required">Customer ID</label>
                <input
                  type="text"
                  id="customer_id"
                  name="customer_id"
                  className={`form-input ${errors.customer_id ? 'error' : ''}`}
                  value={formData.customer_id}
                  onChange={handleChange}
                  disabled={submitting}
                  placeholder="e.g. CUS001"
                  aria-invalid={errors.customer_id ? 'true' : 'false'}
                />
                {errors.customer_id && (
                  <div className="form-error" role="alert">
                    <AlertCircle size={14} />
                    <span>{errors.customer_id}</span>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="amount" className="form-label required">Amount</label>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  className={`form-input ${errors.amount ? 'error' : ''}`}
                  value={formData.amount}
                  onChange={handleChange}
                  disabled={submitting}
                  placeholder="e.g. 2500"
                  min="0"
                  aria-invalid={errors.amount ? 'true' : 'false'}
                />
                {errors.amount && (
                  <div className="form-error" role="alert">
                    <AlertCircle size={14} />
                    <span>{errors.amount}</span>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="timestamp" className="form-label required">Timestamp</label>
                <input
                  type="datetime-local"
                  id="timestamp"
                  name="timestamp"
                  className={`form-input ${errors.timestamp ? 'error' : ''}`}
                  value={formData.timestamp}
                  onChange={handleChange}
                  disabled={submitting}
                  aria-invalid={errors.timestamp ? 'true' : 'false'}
                />
                {errors.timestamp && (
                  <div className="form-error" role="alert">
                    <AlertCircle size={14} />
                    <span>{errors.timestamp}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="section">
            <h2 className="section-title">Transaction Context</h2>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="device" className="form-label required">Device</label>
                <input
                  type="text"
                  id="device"
                  name="device"
                  className={`form-input ${errors.device ? 'error' : ''}`}
                  value={formData.device}
                  onChange={handleChange}
                  disabled={submitting}
                  placeholder="e.g. DEV001"
                  aria-invalid={errors.device ? 'true' : 'false'}
                />
                {errors.device && (
                  <div className="form-error" role="alert">
                    <AlertCircle size={14} />
                    <span>{errors.device}</span>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="location" className="form-label required">Location</label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  className={`form-input ${errors.location ? 'error' : ''}`}
                  value={formData.location}
                  onChange={handleChange}
                  disabled={submitting}
                  placeholder="e.g. Nagpur"
                  aria-invalid={errors.location ? 'true' : 'false'}
                />
                {errors.location && (
                  <div className="form-error" role="alert">
                    <AlertCircle size={14} />
                    <span>{errors.location}</span>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="merchant" className="form-label required">Merchant</label>
                <input
                  type="text"
                  id="merchant"
                  name="merchant"
                  className={`form-input ${errors.merchant ? 'error' : ''}`}
                  value={formData.merchant}
                  onChange={handleChange}
                  disabled={submitting}
                  placeholder="e.g. Amazon"
                  aria-invalid={errors.merchant ? 'true' : 'false'}
                />
                {errors.merchant && (
                  <div className="form-error" role="alert">
                    <AlertCircle size={14} />
                    <span>{errors.merchant}</span>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="transaction_frequency" className="form-label required">Frequency</label>
                <input
                  type="number"
                  id="transaction_frequency"
                  name="transaction_frequency"
                  className={`form-input ${errors.transaction_frequency ? 'error' : ''}`}
                  value={formData.transaction_frequency}
                  onChange={handleChange}
                  disabled={submitting}
                  placeholder="e.g. 3"
                  min="0"
                  aria-invalid={errors.transaction_frequency ? 'true' : 'false'}
                />
                {errors.transaction_frequency && (
                  <div className="form-error" role="alert">
                    <AlertCircle size={14} />
                    <span>{errors.transaction_frequency}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '1.25rem' }}>
              <label className="form-checkbox">
                <input
                  type="checkbox"
                  name="location_unusual"
                  checked={formData.location_unusual}
                  onChange={handleChange}
                  disabled={submitting}
                />
                <span>Unusual location</span>
              </label>
              <div className="form-hint" style={{ marginLeft: '24px' }}>
                Check if this transaction occurred from an unusual or unexpected location.
              </div>
            </div>
          </div>

          <div className="section">
            <h2 className="section-title">Behavioral Profile</h2>
            <div className="form-group">
              <label htmlFor="previous_transaction_behaviour" className="form-label required">Previous Transaction Behaviour</label>
              <input
                type="text"
                id="previous_transaction_behaviour"
                name="previous_transaction_behaviour"
                className={`form-input ${errors.previous_transaction_behaviour ? 'error' : ''}`}
                value={formData.previous_transaction_behaviour}
                onChange={handleChange}
                disabled={submitting}
                placeholder="e.g. Normal, Low Value Transactions"
                aria-invalid={errors.previous_transaction_behaviour ? 'true' : 'false'}
              />
              {errors.previous_transaction_behaviour && (
                <div className="form-error" role="alert">
                  <AlertCircle size={14} />
                  <span>{errors.previous_transaction_behaviour}</span>
                </div>
              )}
              <div className="form-hint">
                Describe the customer's previous transaction patterns (e.g. Normal, Low Value Transactions, Unusual High Value Transactions)
              </div>
            </div>
          </div>

          <div className="section" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setFormData(initialValues)}
              disabled={submitting}
            >
              Reset
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <div className="spinner" style={{ width: '20px', height: '20px' }} />
                  Analyzing...
                </>
              ) : (
                <>
                  <Search size={20} />
                  Analyze Transaction
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};