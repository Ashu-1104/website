import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// /subscription is the logged-in billing surface (Stripe checkout, manage plan).
// Public marketing copy lives on /pricing — this page is noindexed so crawlers
// stop indexing the app shell and treat /pricing as the canonical price page.
export const metadata: Metadata = {
  title: 'Manage Subscription | Veloura.ai',
  description: 'Manage your Veloura.ai subscription, billing, and plan.',
  robots: { index: false, follow: true },
};

export default function SubscriptionLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
