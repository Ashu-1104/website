interface FAQItem {
  q: string;
  a: string;
}

/**
 * Injects a JSON-LD FAQPage schema into the page.
 * Enables Google "People Also Ask" rich results and featured snippets.
 * Place this inside the SEO content section of each tool page.
 */
export default function FAQSchema({ items }: { items: FAQItem[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: a,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
