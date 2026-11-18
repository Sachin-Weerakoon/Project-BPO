import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AuthNavigation } from '@/components/auth/auth-navigation';
import { AuthIllustration } from '@/components/auth/auth-illustration';
import './auth.css';

export const metadata: Metadata = {
  title: { default: 'Account | RemoteBPO Hub', template: '%s | RemoteBPO Hub' },
  description: 'RemoteBPO Hub account UI preview for candidates and employers.',
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-theme auth-page">
      <a href="#auth-content" className="auth-skip-link">Skip to form</a>
      <main className="auth-shell">
        <AuthIllustration />
        <div id="auth-content" tabIndex={-1} className="auth-form-panel">{children}</div>
      </main>
      <footer className="auth-footer">
        <span>Cycle 1 · Frontend preview</span>
        <AuthNavigation />
      </footer>
    </div>
  );
}
