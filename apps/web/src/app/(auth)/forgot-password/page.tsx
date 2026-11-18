import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth/auth-card';
import { AuthForm } from '@/components/auth/auth-form';

export const metadata: Metadata = { title: 'Forgot password' };

export default function ForgotPasswordPage() {
  return <AuthCard title="Forgot your password?" description="Let’s help you get back to work. Time-limited reset links will be available after integration. This demo sends no email."><AuthForm mode="forgot-password" /></AuthCard>;
}
