import type { Metadata, Viewport } from 'next';
import { Inter, Outfit } from 'next/font/google';
import Script from 'next/script';
import { Providers } from '@/components/Providers';
import './globals.css';

const GA_ID = 'G-7WYPF2CEFZ';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0a0a0f',
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'Veloura.ai — AI Girlfriend, NSFW Chat & Image Generator',
    template: '%s | Veloura.ai',
  },
  // ≤155 chars — used as fallback for pages without their own description
  description:
    'Create your perfect AI girlfriend or virtual partner. Uncensored NSFW chat, roleplay, voice & image generation. No filters, no restrictions. Free to start.',
  keywords: [
    'AI girlfriend', 'virtual partner', 'AI companion', 'uncensored AI chat',
    'NSFW AI chat', 'AI girlfriend free', 'best AI girlfriend app', 'AI roleplay',
    'AI boyfriend', 'uncensored AI', 'AI partner', 'AI chat no restrictions',
    'create AI character', 'AI image generator uncensored', 'NSFW AI art generator',
    'face swap AI', 'AI voice cloning', 'deepfake video maker', 'AI audio tools',
  ],
  authors: [{ name: 'Veloura.ai', url: APP_URL }],
  creator: 'Veloura.ai',
  publisher: 'Veloura.ai',
  alternates: { canonical: APP_URL },
  openGraph: {
    title: 'Veloura.ai — AI Girlfriend, Virtual Partner & Uncensored AI Chat',
    description:
      'Create your perfect AI girlfriend or virtual partner. Uncensored NSFW chat, roleplay, voice & image generation. No filters, no restrictions. Free to start.',
    url: APP_URL,
    siteName: 'Veloura.ai',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: 'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/og-images/og-home.png',
        width: 1200,
        height: 630,
        alt: 'Veloura.ai — Your AI Companion. No Limits.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Girlfriend & Virtual Partner — Veloura.ai',
    description:
      'Create your perfect AI girlfriend or virtual partner. Uncensored NSFW chat, roleplay, voice & image generation. No filters. Free to start.',
    site: '@velouraai',
    creator: '@velouraai',
    images: ['https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/og-images/og-home.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  other: {
    'rating': 'adult',
  },
  icons: {
    icon: [{ url: '/images/logo.svg', type: 'image/svg+xml' }],
    shortcut: [{ url: '/images/logo.svg', type: 'image/svg+xml' }],
  },
};

// SoftwareApplication schema — enables app-like rich results (price, rating, category)
const softwareAppSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  '@id': `${APP_URL}/#app`,
  name: 'Veloura.ai',
  description:
    'Create your perfect AI girlfriend or virtual partner. Uncensored NSFW chat, roleplay, AI image editor, voice & video generation. No filters, no restrictions.',
  applicationCategory: 'EntertainmentApplication',
  operatingSystem: 'Web',
  url: APP_URL,
  publisher: { '@id': `${APP_URL}/#organization` },
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
    url: `${APP_URL}/subscription`,
  },
  featureList: [
    'AI Girlfriend Chat',
    'AI Boyfriend Chat',
    'AI Roleplay',
    'AI Image Generator',
    'AI Image Editor',
    'AI Video Generator',
    'Voice Cloning',
    'LoRA Model Training',
  ],
};

const organizationSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${APP_URL}/#organization`,
      name: 'Veloura.ai',
      url: APP_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${APP_URL}/images/logo.svg`,
        '@id': `${APP_URL}/#logo`,
      },
      sameAs: [],
    },
    {
      '@type': 'WebSite',
      '@id': `${APP_URL}/#website`,
      url: APP_URL,
      name: 'Veloura.ai',
      description: 'AI Girlfriend, Virtual Partner & Uncensored AI Companion Platform',
      publisher: { '@id': `${APP_URL}/#organization` },
      // Enables Google Sitelinks search box
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${APP_URL}/models?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body className="antialiased">
        {/* Microsoft Clarity */}
        <Script id="clarity-init" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "wmm0fvhsdr");
          `}
        </Script>
        {/* Google Analytics GA4 */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `}
        </Script>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
