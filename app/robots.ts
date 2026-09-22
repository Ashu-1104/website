import type { MetadataRoute } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Allow all legitimate crawlers on public pages
        userAgent: '*',
        allow: [
          '/',
          '/models',
          '/models/',
          '/ai-apps',
          '/ai-apps/',
          '/ai-audio',
          '/ai-audio/',
          '/create',
          '/create/',
          '/community',
          '/lora-training',
          '/create-your-own-ai-character',
          '/ai-girlfriend-chat',
          '/ai-boyfriend',
          '/ai-roleplay',
          '/ai-image-editor',
          '/ai-video-generator',
          '/edit-image',
          '/pricing',
          // Quick-win landing pages
          '/free-nsfw-ai-chat',
          '/uncensored-ai-generator',
          '/uncensored-ai-video-generator',
          '/character-ai-alternative',
          '/ai-girlfriend-generator',
          '/chatgpt-alternative',
          '/ai-image-generator-no-filter',
          '/ai-image-generator-no-restrictions',
          // Product hub
          '/ai-partner-lobby',
          // Blog
          '/blog',
          '/blog/',
        ],
        disallow: [
          // Private user pages
          '/chat',
          '/chat/',
          '/settings',
          '/billing',
          '/profile',
          '/my-gallery',

          // Quick-mode creator (thin page, no SEO value)
          '/create-your-ai-partner-quickmode',

          // Admin & internal
          '/admin',
          '/admin/',

          // API routes — never crawl
          '/api/',

          // Auth flows
          '/login',
          '/register',

          // User profile pages (private)
          '/user/',
          '/profile/',
        ],
      },
      // Block known bad bots explicitly
      {
        userAgent: 'AhrefsBot',
        disallow: ['/api/', '/admin/'],
      },
      {
        userAgent: 'SemrushBot',
        disallow: ['/api/', '/admin/'],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
    host: APP_URL,
  };
}
