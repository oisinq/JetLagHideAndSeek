// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import partytown from '@astrojs/partytown';
import AstroPWA from '@vite-pwa/astro';

// Check if we're building for Netlify
const isNetlify = process.env.NETLIFY === 'true';

// https://astro.build/config
export default defineConfig({
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: false,
    }),
    partytown({
      config: {
        forward: ['dataLayer.push'],
      },
    }),
    AstroPWA({
      manifest: {
        name: 'Jet Lag Hide and Seek Map Generator',
        short_name: 'Map Generator',
        description:
          'Automatically generate maps for Jet Lag The Game: Hide and Seek with ease! Simply name the questions and watch the map eliminate hundreds of possibilities in seconds.',
        icons: [
          {
            src: isNetlify
              ? '/JLIcon.png'
              : 'https://taibeled.github.io/JetLagHideAndSeek/JLIcon.png',
            sizes: '1080x1080',
            type: 'image/png',
          },
          {
            src: isNetlify
              ? '/android-chrome-192x192.png'
              : 'https://taibeled.github.io/JetLagHideAndSeek/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: isNetlify
              ? '/android-chrome-512x512.png'
              : 'https://taibeled.github.io/JetLagHideAndSeek/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
  devToolbar: {
    enabled: false,
  },
  site: isNetlify
    ? 'https://your-netlify-site.netlify.app'
    : 'https://taibeled.github.io',
  base: isNetlify ? '' : 'JetLagHideAndSeek',
});
