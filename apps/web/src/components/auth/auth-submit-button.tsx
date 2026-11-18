import { Button } from '@/components/ui/button';
import type { AuthMode } from '@/lib/auth/validation';

// The integration can supply pending from its request lifecycle; the demo stays synchronous.
export function AuthSubmitButton({ mode, pending = false }: { mode: AuthMode; pending?: boolean }) {
  const label = mode === 'login' ? 'Login' : mode === 'register' ? 'Create Account' : 'Reset Password';
  return (
    <Button type="submit" className="auth-submit" disabled={pending} aria-busy={pending}>
      {pending && <span className="auth-spinner" aria-hidden="true" />}
      {pending ? 'Please wait…' : label}
    </Button>
  );
}
