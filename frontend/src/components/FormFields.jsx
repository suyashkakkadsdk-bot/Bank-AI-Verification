import { useId } from 'react';
import { AlertCircle } from 'lucide-react';

export const Input = ({
  label,
  type = 'text',
  name,
  value,
  onChange,
  onBlur,
  error,
  required = false,
  disabled = false,
  placeholder,
  hint,
  id,
  ...props
}) => {
  const generatedId = useId();
  const inputId = id || name || generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  return (
    <div className="form-group">
      <label htmlFor={inputId} className={`form-label ${required ? 'required' : ''}`}>
        {label}
      </label>
      <input
        type={type}
        id={inputId}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        className={`form-input ${error ? 'error' : ''}`}
        disabled={disabled}
        placeholder={placeholder}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={`${error ? errorId : ''} ${hint ? hintId : ''}`.trim() || undefined}
        {...props}
      />
      {error && (
        <div id={errorId} className="form-error" role="alert">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}
      {hint && !error && (
        <div id={hintId} className="form-hint">{hint}</div>
      )}
    </div>
  );
};

export const Select = ({
  label,
  name,
  value,
  onChange,
  onBlur,
  error,
  required = false,
  disabled = false,
  options = [],
  placeholder,
  hint,
  id,
  ...props
}) => {
  const generatedId = useId();
  const selectId = id || name || generatedId;
  const errorId = `${selectId}-error`;
  const hintId = `${selectId}-hint`;

  return (
    <div className="form-group">
      <label htmlFor={selectId} className={`form-label ${required ? 'required' : ''}`}>
        {label}
      </label>
      <select
        id={selectId}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        className={`form-input ${error ? 'error' : ''}`}
        disabled={disabled}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={`${error ? errorId : ''} ${hint ? hintId : ''}`.trim() || undefined}
        {...props}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <div id={errorId} className="form-error" role="alert">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}
      {hint && !error && (
        <div id={hintId} className="form-hint">{hint}</div>
      )}
    </div>
  );
};

export const Textarea = ({
  label,
  name,
  value,
  onChange,
  onBlur,
  error,
  required = false,
  disabled = false,
  placeholder,
  hint,
  rows = 4,
  id,
  ...props
}) => {
  const generatedId = useId();
  const textareaId = id || name || generatedId;
  const errorId = `${textareaId}-error`;
  const hintId = `${textareaId}-hint`;

  return (
    <div className="form-group">
      <label htmlFor={textareaId} className={`form-label ${required ? 'required' : ''}`}>
        {label}
      </label>
      <textarea
        id={textareaId}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        className={`form-input ${error ? 'error' : ''}`}
        disabled={disabled}
        placeholder={placeholder}
        rows={rows}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={`${error ? errorId : ''} ${hint ? hintId : ''}`.trim() || undefined}
        {...props}
      />
      {error && (
        <div id={errorId} className="form-error" role="alert">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}
      {hint && !error && (
        <div id={hintId} className="form-hint">{hint}</div>
      )}
    </div>
  );
};

export const Checkbox = ({
  label,
  name,
  checked,
  onChange,
  error,
  hint,
  id,
  ...props
}) => {
  const generatedId = useId();
  const checkboxId = id || name || generatedId;
  const errorId = `${checkboxId}-error`;
  const hintId = `${checkboxId}-hint`;

  return (
    <div className="form-group">
      <label className="form-checkbox">
        <input
          type="checkbox"
          id={checkboxId}
          name={name}
          checked={checked}
          onChange={onChange}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={`${error ? errorId : ''} ${hint ? hintId : ''}`.trim() || undefined}
          {...props}
        />
        <span>{label}</span>
      </label>
      {error && (
        <div id={errorId} className="form-error" role="alert">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}
      {hint && !error && (
        <div id={hintId} className="form-hint">{hint}</div>
      )}
    </div>
  );
};

export const FieldError = ({ message }) => (
  message && <div className="form-error" role="alert"><AlertCircle size={14} /><span>{message}</span></div>
);