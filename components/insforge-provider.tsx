'use client';
import { useMemo } from 'react';
import { InsforgeBrowserProvider } from '@insforge/nextjs';
import { getInsforgeBrowserClient } from '@/lib/insforge-client';

export function InsforgeProvider({
  children,
  enabled = true
}: {
  children: React.ReactNode;
  enabled?: boolean;
}) {
  const insforgeClient = useMemo(() => (
    enabled ? getInsforgeBrowserClient() : undefined
  ), [enabled]);

  if (!enabled || !insforgeClient) {
    return <>{children}</>;
  }

  return (
    <InsforgeBrowserProvider client={insforgeClient} afterSignInUrl="/">
      {children}
    </InsforgeBrowserProvider>
  );
}
