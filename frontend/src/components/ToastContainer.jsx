import { useToast } from '../context/ToastContext';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const Toast = ({ toast, onClose }) => {
  const Icon = ICONS[toast.type] || Info;

  return (
    <div className={`toast toast-${toast.type}`} role="alert" aria-live="polite">
      <Icon className="toast-icon" size={20} />
      <div className="toast-content">
        {toast.title && <div className="toast-title">{toast.title}</div>}
        <div className="toast-message">{toast.message}</div>
      </div>
      <button
        className="toast-close"
        onClick={() => onClose(toast.id)}
        aria-label="Dismiss notification"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export const ToastContainer = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite" aria-atomic="true">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onClose={removeToast} />
      ))}
    </div>
  );
};