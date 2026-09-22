import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// Admin pages must never appear in search results
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
