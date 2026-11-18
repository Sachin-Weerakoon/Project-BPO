'use client';

import { useState, type ComponentProps } from 'react';
import { Input } from '@/components/ui/input';

type AuthFieldProps = ComponentProps<typeof Input> & {
  id: string;
  label: string;
  error?: string;
  hint?: string;
};

export function AuthField({ id, label, error, hint, type, ...props }: AuthFieldProps) {
  const [visible, setVisible] = useState(false);
  const password = type === 'password';
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  return (
    <div className="auth-field">
      <label htmlFor={id} className="auth-label">{label}</label>
      <div className="auth-input-wrap">
        <Input {...props} id={id} type={password && visible ? 'text' : type} aria-invalid={Boolean(error)} aria-describedby={describedBy} className={password ? 'auth-input auth-password-input' : 'auth-input'} />
        {password && (
          <button type="button" aria-controls={id} aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`} aria-pressed={visible} onClick={() => setVisible(!visible)} className="auth-password-toggle">
            {visible ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      {hint && <p id={`${id}-hint`} className="auth-hint">{hint}</p>}
      {error && <p id={`${id}-error`} className="auth-error">{error}</p>}
    </div>
  );
}
