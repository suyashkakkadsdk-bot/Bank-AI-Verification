import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, AlertCircle } from 'lucide-react';
import { verificationApi, handleApiError } from '../api/client';
import { useToast } from '../context/ToastContext';
import { saveResultToSession } from './VerificationHistory';

const validateLoanForm = (values) => {
  const errors = {};

  if (!values.application_id?.trim()) errors.application_id = 'Application ID is required';
  if (!values.applicant_id?.trim()) errors.applicant_id = 'Applicant ID is required';

  if (!values.income && values.income !== 0) {
    errors.income = 'Income is required';
  } else if (isNaN(parseFloat(values.income)) || parseFloat(values.income) <= 0) {
    errors.income = 'Income must be a positive number';
  }

  if (!values.credit_score && values.credit_score !== 0) {
    errors.credit_score = 'Credit score is required';
  } else if (isNaN(parseInt(values.credit_score)) || parseInt(values.credit_score) < 300 || parseInt(values.credit_score) > 850) {
    errors.credit_score = 'Credit score must be between 300 and 850';
  }

  if (!values.existing_debt && values.existing_debt !== 0) {
    errors.existing_debt = 'Existing debt is required';
  } else if (isNaN(parseFloat(values.existing_debt)) || parseFloat(values.existing_debt) < 0) {
    errors.existing_debt = 'Existing debt must be a non-negative number';
  }

  if (!values.monthly_emi && values.monthly_emi !== 0) {
    errors.monthly_emi = 'Monthly EMI is required';
  } else if (isNaN(parseFloat(values.monthly_emi)) || parseFloat(values.monthly_emi) < 0) {
    errors.monthly_emi = 'Monthly EMI must be a non-negative number';
  }

  if (!values.loan_amount && values.loan_amount !== 0) {
    errors.loan_amount = 'Loan amount is required';
  } else if (isNaN(parseFloat(values.loan_amount)) || parseFloat(values.loan_amount) <= 0) {
    errors.loan_amount = 'Loan amount must be a positive number';
  }

  if (!values.loan_tenure && values.loan_tenure !== 0) {
    errors.loan_tenure = 'Loan tenure is required';
  } else if (isNaN(parseInt(values.loan_tenure)) || parseInt(values.loan_tenure) <= 0) {
    errors.loan_tenure = 'Loan tenure must be a positive number of months';
  }

  if (!values.employment_status?.trim()) errors.employment_status = 'Employment status is required';
  if (!values.repayment_history?.trim()) errors.repayment_history = 'Repayment history is required';

  return errors;
};

const initialValues = {
  application_id: '',
  applicant_id: '',
  income: '',
  credit_score: '',
  employment_status: '',
  existing_debt: '',
  monthly_emi: '',
  loan_amount: '',
  loan_tenure: '',
  repayment_history: '',
};

export const LoanVerification = () => {
  const [formData, setFormData] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const navigate = useNavigate();
  const toast = useToast();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateLoanForm(formData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        application_id: formData.application_id,
        applicant_id: formData.applicant_id,
        income: parseFloat(formData.income),
        credit_score: parseInt(formData.credit_score, 10),
        employment_status: formData.employment_status,
        existing_debt: parseFloat(formData.existing_debt),
        monthly_emi: parseFloat(formData.monthly_emi),
        loan_amount: parseFloat(formData.loan_amount),
        loan_tenure: parseInt(formData.loan_tenure, 10),
        repayment_history: formData.repayment_history,
      };

      const response = await verificationApi.verifyLoan(payload);

      toast.success('Loan verification complete', 'Verification Success');
      saveResultToSession(response.data, 'loan');
      navigate('/result', { state: { result: response.data, caseType: 'loan' } });
    } catch (err) {
      const errorMessage = handleApiError(err);
      toast.error(errorMessage, 'Verification Failed');
      setResult(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Loan Verification</h1>
        <p className="page-subtitle">Submit a loan application for independent verification against Bank AI.</p>
      </header>

      <div className="page-content">
        <form onSubmit={handleSubmit} noValidate>
          <div className="section">
            <h2 className="section-title">Application Details</h2>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="application_id" className="form-label required">Application ID</label>
                <input
                  type="text"
                  id="application_id"
                  name="application_id"
                  className={`form-input ${errors.application_id ? 'error' : ''}`}
                  value={formData.application_id}
                  onChange={handleChange}
                  disabled={submitting}
                  placeholder="e.g. LN001"
                  aria-invalid={errors.application_id ? 'true' : 'false'}
                />
                {errors.application_id && (
                  <div className="form-error" role="alert">
                    <AlertCircle size={14} />
                    <span>{errors.application_id}</span>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="applicant_id" className="form-label required">Applicant ID</label>
                <input
                  type="text"
                  id="applicant_id"
                  name="applicant_id"
                  className={`form-input ${errors.applicant_id ? 'error' : ''}`}
                  value={formData.applicant_id}
                  onChange={handleChange}
                  disabled={submitting}
                  placeholder="e.g. APP001"
                  aria-invalid={errors.applicant_id ? 'true' : 'false'}
                />
                {errors.applicant_id && (
                  <div className="form-error" role="alert">
                    <AlertCircle size={14} />
                    <span>{errors.applicant_id}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="section">
            <h2 className="section-title">Financial Details</h2>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="income" className="form-label required">Annual Income</label>
                <input
                  type="number"
                  id="income"
                  name="income"
                  className={`form-input ${errors.income ? 'error' : ''}`}
                  value={formData.income}
                  onChange={handleChange}
                  disabled={submitting}
                  placeholder="e.g. 60000"
                  aria-invalid={errors.income ? 'true' : 'false'}
                />
                {errors.income && (
                  <div className="form-error" role="alert">
                    <AlertCircle size={14} />
                    <span>{errors.income}</span>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="credit_score" className="form-label required">Credit Score</label>
                <input
                  type="number"
                  id="credit_score"
                  name="credit_score"
                  className={`form-input ${errors.credit_score ? 'error' : ''}`}
                  value={formData.credit_score}
                  onChange={handleChange}
                  disabled={submitting}
                  placeholder="e.g. 760"
                  min="300"
                  max="850"
                  aria-invalid={errors.credit_score ? 'true' : 'false'}
                />
                {errors.credit_score && (
                  <div className="form-error" role="alert">
                    <AlertCircle size={14} />
                    <span>{errors.credit_score}</span>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="existing_debt" className="form-label required">Existing Debt</label>
                <input
                  type="number"
                  id="existing_debt"
                  name="existing_debt"
                  className={`form-input ${errors.existing_debt ? 'error' : ''}`}
                  value={formData.existing_debt}
                  onChange={handleChange}
                  disabled={submitting}
                  placeholder="e.g. 0"
                  min="0"
                  aria-invalid={errors.existing_debt ? 'true' : 'false'}
                />
                {errors.existing_debt && (
                  <div className="form-error" role="alert">
                    <AlertCircle size={14} />
                    <span>{errors.existing_debt}</span>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="monthly_emi" className="form-label required">Monthly EMI</label>
                <input
                  type="number"
                  id="monthly_emi"
                  name="monthly_emi"
                  className={`form-input ${errors.monthly_emi ? 'error' : ''}`}
                  value={formData.monthly_emi}
                  onChange={handleChange}
                  disabled={submitting}
                  placeholder="e.g. 5000"
                  min="0"
                  aria-invalid={errors.monthly_emi ? 'true' : 'false'}
                />
                {errors.monthly_emi && (
                  <div className="form-error" role="alert">
                    <AlertCircle size={14} />
                    <span>{errors.monthly_emi}</span>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="loan_amount" className="form-label required">Loan Amount</label>
                <input
                  type="number"
                  id="loan_amount"
                  name="loan_amount"
                  className={`form-input ${errors.loan_amount ? 'error' : ''}`}
                  value={formData.loan_amount}
                  onChange={handleChange}
                  disabled={submitting}
                  placeholder="e.g. 300000"
                  min="0"
                  aria-invalid={errors.loan_amount ? 'true' : 'false'}
                />
                {errors.loan_amount && (
                  <div className="form-error" role="alert">
                    <AlertCircle size={14} />
                    <span>{errors.loan_amount}</span>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="loan_tenure" className="form-label required">Loan Tenure (months)</label>
                <input
                  type="number"
                  id="loan_tenure"
                  name="loan_tenure"
                  className={`form-input ${errors.loan_tenure ? 'error' : ''}`}
                  value={formData.loan_tenure}
                  onChange={handleChange}
                  disabled={submitting}
                  placeholder="e.g. 36"
                  min="1"
                  aria-invalid={errors.loan_tenure ? 'true' : 'false'}
                />
                {errors.loan_tenure && (
                  <div className="form-error" role="alert">
                    <AlertCircle size={14} />
                    <span>{errors.loan_tenure}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="section">
            <h2 className="section-title">Applicant Profile</h2>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="employment_status" className="form-label required">Employment Status</label>
                <input
                  type="text"
                  id="employment_status"
                  name="employment_status"
                  className={`form-input ${errors.employment_status ? 'error' : ''}`}
                  value={formData.employment_status}
                  onChange={handleChange}
                  disabled={submitting}
                  placeholder="e.g. Salaried, Self-Employed"
                  aria-invalid={errors.employment_status ? 'true' : 'false'}
                />
                {errors.employment_status && (
                  <div className="form-error" role="alert">
                    <AlertCircle size={14} />
                    <span>{errors.employment_status}</span>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="repayment_history" className="form-label required">Repayment History</label>
                <input
                  type="text"
                  id="repayment_history"
                  name="repayment_history"
                  className={`form-input ${errors.repayment_history ? 'error' : ''}`}
                  value={formData.repayment_history}
                  onChange={handleChange}
                  disabled={submitting}
                  placeholder="e.g. Good, Poor"
                  aria-invalid={errors.repayment_history ? 'true' : 'false'}
                />
                {errors.repayment_history && (
                  <div className="form-error" role="alert">
                    <AlertCircle size={14} />
                    <span>{errors.repayment_history}</span>
                  </div>
                )}
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
                  Verifying...
                </>
              ) : (
                <>
                  <FileText size={20} />
                  Verify Loan
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};