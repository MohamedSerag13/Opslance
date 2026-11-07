import React, { useId, useState } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  /** renders a show/hide toggle; forces type="password" ↔ "text" */
  password?: boolean;
  leftIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, password, leftIcon, className = '', id, ...props }, ref) => {
    const autoId = useId();
    const inputId = id || autoId;
    const [show, setShow] = useState(false);
    const type = password ? (show ? 'text' : 'password') : props.type;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-content">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            type={type}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            className={`h-11 w-full rounded-xl border bg-surface px-4 text-sm text-content placeholder:text-muted/70
              transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30
              ${error ? 'border-danger' : 'border-border'}
              ${leftIcon ? 'pl-10' : ''}
              ${password ? 'pr-12' : ''} ${className}`}
            {...props}
          />
          {password && (
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted transition-colors hover:text-content"
            >
              {show ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          )}
        </div>
        {error ? (
          <p id={`${inputId}-error`} className="mt-1.5 text-xs font-medium text-danger">{error}</p>
        ) : hint ? (
          <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-muted">{hint}</p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = 'Input';

export default Input;
