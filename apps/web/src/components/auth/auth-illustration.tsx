'use client';

import Image from 'next/image';
import { useState } from 'react';

export function AuthIllustration() {
  const [unavailable, setUnavailable] = useState(false);
  return (
    <div className="auth-artwork" aria-hidden="true">
      {!unavailable && (
        <Image
          src="/images/auth/remote-work.png"
          alt=""
          fill
          priority
          unoptimized
          sizes="(max-width: 760px) 100vw, 50vw"
          className="auth-workspace-image"
          onError={() => setUnavailable(true)}
        />
      )}
    </div>
  );
}
