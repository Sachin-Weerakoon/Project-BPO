import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth/auth-card';
import { AuthForm } from '@/components/auth/auth-form';

export const metadata: Metadata = { title: 'Register' };

export default function RegisterPage() {
  return <AuthCard title="Create account" description="Join as a candidate or employer. Email verification will be required before full access. This demo creates no account or email."><AuthForm mode="register" /></AuthCard>;
}
