'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function AuthNavigation() {
  const pathname = usePathname();
  return (
    <nav aria-label="Authentication" className="auth-navigation">
      {[
        { href: '/login', label: 'Log in' },
        { href: '/register', label: 'Register' },
        { href: '/megha-preview', label: 'Candidate preview' },
      ].map(({ href, label }) => (
        <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined} className={cn('auth-nav-link', pathname === href && 'auth-nav-link-active')}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
