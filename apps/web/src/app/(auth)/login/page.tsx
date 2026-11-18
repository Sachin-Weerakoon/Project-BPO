import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth/auth-card';
import { AuthForm } from '@/components/auth/auth-form';

export const metadata: Metadata = { title: 'Log in' };

export default function LoginPage() {
  return <AuthCard title="Welcome back" description="Your next opportunity is waiting. Preview your RemoteBPO Hub login below."><AuthForm mode="login" /></AuthCard>;
}
