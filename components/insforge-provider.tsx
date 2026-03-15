'use client';
import { InsforgeBrowserProvider } from '@insforge/nextjs';
import { insforge } from '@/lib/insforge-client';

export function InsforgeProvider({
  children,
  enabled = true
}: {
  children: React.ReactNode;
  enabled?: boolean;
}) {
  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <InsforgeBrowserProvider client={insforge} afterSignInUrl="/">
      {children}
    </InsforgeBrowserProvider>
  );
}
