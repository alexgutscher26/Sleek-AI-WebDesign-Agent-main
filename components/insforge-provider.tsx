'use client';
import { useMemo } from 'react';
import { InsforgeBrowserProvider } from '@insforge/nextjs';
import { getInsforgeBrowserClient } from '@/lib/insforge-client';

export function InsforgeProvider({
  children,
  enabled = true,
  config
}: {
  children: React.ReactNode;
  enabled?: boolean;
  config?: {
    baseUrl: string;
    anonKey: string;
  };
}) {
  const insforgeClient = useMemo(() => (
    enabled && config ? getInsforgeBrowserClient(config) : undefined
  ), [config, enabled]);

  if (!enabled || !insforgeClient) {
    return <>{children}</>;
  }

  return (
    <InsforgeBrowserProvider client={insforgeClient} afterSignInUrl="/">
      {children}
    </InsforgeBrowserProvider>
  );
}
