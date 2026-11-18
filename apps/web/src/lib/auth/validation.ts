export type AuthMode = 'login' | 'register' | 'forgot-password';
export type AuthValues = {
  email: string;
  password: string;
  confirmPassword: string;
  role: string;
};
export type AuthErrors = Partial<Record<keyof AuthValues, string>>;

export const registrationPasswordHint = 'Use at least 10 characters, including uppercase and lowercase letters, a number, and a symbol.';

// FR-001 UI checks only. The minimum is specified by the SRS; the complexity
// categories below are a frontend proposal until the exact backend rules are agreed.
export function validateAuthForm(mode: AuthMode, values: AuthValues): AuthErrors {
  const errors: AuthErrors = {};
  if (!values.email.trim()) errors.email = 'Enter your email address.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'Enter a valid email address.';

  if (mode !== 'forgot-password' && !values.password) errors.password = 'Enter your password.';
  if (mode === 'register') {
    if (values.password && (
      values.password.length < 10 ||
      !/[A-Z]/.test(values.password) ||
      !/[a-z]/.test(values.password) ||
      !/[0-9]/.test(values.password) ||
      !/[^A-Za-z0-9\s]/.test(values.password)
    )) errors.password = registrationPasswordHint;
    if (!values.confirmPassword) errors.confirmPassword = 'Confirm your password.';
    else if (values.password !== values.confirmPassword) errors.confirmPassword = 'Passwords must match.';
    if (values.role !== 'candidate' && values.role !== 'employer') errors.role = 'Choose Candidate or Employer.';
  }
  return errors;
}
