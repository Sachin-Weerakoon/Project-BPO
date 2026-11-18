import type { ReactNode } from 'react';
import Link from 'next/link';

export function AuthCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section aria-labelledby="auth-title" className="auth-card">
      <header className="auth-card-header">
        <Link href="/login" className="auth-brand" aria-label="RemoteBPO Hub login">
          <span className="auth-brand-mark" aria-hidden="true">R</span>
          <span>RemoteBPO <span className="auth-brand-suffix">Hub</span></span>
        </Link>
        <h1 id="auth-title">{title}</h1>
        <p>{description}</p>
      </header>
      {children}
    </section>
  );
}
