'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { AuthSubmitButton } from '@/components/auth/auth-submit-button';
import { AuthField } from '@/components/auth/auth-field';
import { registrationPasswordHint, validateAuthForm, type AuthErrors, type AuthMode, type AuthValues } from '@/lib/auth/validation';

const initialValues: AuthValues = { email: '', password: '', confirmPassword: '', role: '' };
const demoMessages: Record<AuthMode, string> = {
  login: 'Demo only: these details pass the UI checks. You have not been logged in. Backend integration is pending.',
  register: 'Demo only: these details pass the UI checks. No account has been created and no verification email has been sent.',
  'forgot-password': 'Demo only: this email format passes the UI checks. No reset email has been sent and no account lookup has been performed.',
};

export function AuthForm({ mode }: { mode: AuthMode }) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<AuthErrors>({});
  const [demoMessage, setDemoMessage] = useState('');
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const register = mode === 'register';

  function update(field: keyof AuthValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined, ...(field === 'password' ? { confirmPassword: undefined } : {}) }));
    setDemoMessage('');
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateAuthForm(mode, values);
    setErrors(nextErrors);
    setDemoMessage('');
    const firstError = Object.keys(nextErrors)[0];
    if (firstError) {
      const fieldId = firstError === 'role' ? 'role-candidate' : firstError;
      event.currentTarget.querySelector<HTMLInputElement>(`#${fieldId}`)?.focus();
      return;
    }
    // Deliberately no requests, persistence, session creation, or role-based redirects.
    setDemoMessage(demoMessages[mode]);
    setValues((current) => ({ ...current, password: '', confirmPassword: '' }));
  }

  return (
    <form noValidate onSubmit={submit} className="auth-form" aria-label={register ? 'Register' : mode === 'login' ? 'Log in' : 'Forgot password'} aria-describedby="form-demo-note">
      <p id="form-demo-note" className="auth-demo-note">UI demo only. Use sample details. All fields are required.</p>
      <noscript><p className="auth-error">Enable JavaScript to try the demo validation.</p></noscript>
      <fieldset disabled={!ready} className="auth-fields">
        <legend className="sr-only">Account details</legend>
        <AuthField id="email" label="Email address *" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required value={values.email} onChange={(event) => update('email', event.target.value)} error={errors.email} />
        {mode !== 'forgot-password' && <AuthField id="password" label="Password *" type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 10 : undefined} required value={values.password} onChange={(event) => update('password', event.target.value)} error={errors.password} hint={register ? registrationPasswordHint : undefined} />}
        {register && (
          <>
            <AuthField id="confirmPassword" label="Confirm password *" type="password" autoComplete="new-password" required value={values.confirmPassword} onChange={(event) => update('confirmPassword', event.target.value)} error={errors.confirmPassword} />
            <fieldset aria-invalid={Boolean(errors.role)} aria-describedby={`role-hint${errors.role ? ' role-error' : ''}`} className="auth-role-fieldset">
              <legend className="auth-label">I’m joining as a *</legend>
              <div className="auth-role-options">
                {(['candidate', 'employer'] as const).map((role) => (
                  <label key={role} className="auth-role-option">
                    <input id={`role-${role}`} type="radio" name="registration-role" value={role} required checked={values.role === role} onChange={() => update('role', role)} aria-describedby={errors.role ? 'role-hint role-error' : 'role-hint'} className="auth-role-radio" />
                    <span className="font-medium">{role === 'candidate' ? 'Candidate' : 'Employer'}</span>
                  </label>
                ))}
              </div>
              <p id="role-hint" className="auth-hint">Select how you plan to use RemoteBPO Hub. This choice does not grant account permissions.</p>
              {errors.role && <p id="role-error" className="auth-error">{errors.role}</p>}
            </fieldset>
          </>
        )}
        {mode === 'login' && <div className="auth-forgot-link"><Link href="/forgot-password" className="auth-text-link">Forgot password?</Link></div>}
        {Object.values(errors).some(Boolean) && <p role="alert" className="auth-error">Review the highlighted fields before checking the demo form.</p>}
        <AuthSubmitButton mode={mode} />
      </fieldset>
      <div role="status" aria-live="polite" aria-atomic="true">
        {demoMessage && <p className="auth-demo-feedback">{demoMessage}</p>}
      </div>
      <p className="auth-switch">
        {mode === 'login' ? 'New to RemoteBPO Hub? ' : register ? 'Already have an account? ' : 'Remember your password? '}
        <Link href={mode === 'login' ? '/register' : '/login'} className="auth-text-link">{mode === 'login' ? 'Register' : 'Back to login'}</Link>
      </p>
    </form>
  );
}
