export const formatCurrency = (value, currency = 'INR', locale = 'en-IN') => {
  if (value === null || value === undefined || value === '') return '—';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '—';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

export const formatNumber = (value, locale = 'en-IN') => {
  if (value === null || value === undefined || value === '') return '—';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '—';
  return new Intl.NumberFormat(locale).format(num);
};

export const formatDateTime = (isoString) => {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return '—';
  }
};

export const formatDate = (isoString) => {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch {
    return '—';
  }
};

export const getRiskScoreClass = (score) => {
  if (score <= 30) return 'risk-score-low';
  if (score <= 70) return 'risk-score-medium';
  return 'risk-score-high';
};

export const getRiskLevelClass = (level) => {
  switch (level?.toUpperCase()) {
    case 'LOW': return 'badge-low';
    case 'MEDIUM': return 'badge-medium';
    case 'HIGH': return 'badge-high';
    default: return 'badge';
  }
};

export const getVerificationResultClass = (result) => {
  switch (result?.toUpperCase()) {
    case 'VERIFIED': return 'badge-verified';
    case 'NEEDS REVIEW': return 'badge-review';
    case 'CONTRADICTED': return 'badge-contradicted';
    default: return 'badge';
  }
};

export const getDecisionClass = (decision, caseType) => {
  if (caseType === 'FRAUD') {
    switch (decision?.toUpperCase()) {
      case 'GENUINE': return 'badge-genuine';
      case 'FRAUD': return 'badge-fraud';
      case 'REVIEW': return 'badge-review';
      default: return 'badge';
    }
  }
  switch (decision?.toUpperCase()) {
    case 'APPROVED': return 'badge-approved';
    case 'REJECTED': return 'badge-rejected';
    case 'REVIEW': return 'badge-review';
    default: return 'badge';
  }
};

export const getFinalStatusClass = (status) => {
  switch (status?.toUpperCase()) {
    case 'VERIFIED': return 'badge-verified';
    case 'HUMAN_REVIEW': return 'badge-review';
    default: return 'badge';
  }
};

export const getRiskScoreColor = (score) => {
  if (score <= 30) return 'var(--risk-low)';
  if (score <= 70) return 'var(--risk-medium)';
  return 'var(--risk-high)';
};

export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validateRequired = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (typeof value === 'number') return !isNaN(value);
  return true;
};

export const validateNumber = (value, min, max) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return false;
  if (min !== undefined && num < min) return false;
  if (max !== undefined && num > max) return false;
  return true;
};

export const validateInteger = (value, min, max) => {
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  if (!Number.isInteger(num)) return false;
  if (min !== undefined && num < min) return false;
  if (max !== undefined && num > max) return false;
  return true;
};

export const toISOString = (date) => {
  if (!date) return '';
  if (date instanceof Date) return date.toISOString();
  if (typeof date === 'string') {
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) return '';
    return parsed.toISOString();
  }
  return '';
};

export const parseISOToLocal = (isoString) => {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset() * 60000;
    const local = new Date(date.getTime() - offset);
    return local.toISOString().slice(0, 16);
  } catch {
    return '';
  }
};

export const debounce = (fn, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

export const classNames = (...classes) => {
  return classes.filter(Boolean).join(' ');
};

export const truncate = (str, length = 50) => {
  if (!str || str.length <= length) return str;
  return str.slice(0, length).trim() + '…';
};