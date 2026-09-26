import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      // The default index.html entry covers the whole authenticated app
      // (main.jsx) exactly as before. entry-client.jsx is a second,
      // separate entry for SSR hydration of the 9 public routes only
      // (see that file's own comment for why it can't just be main.jsx)
      // — added here purely so Vite bundles and content-hashes it the
      // same way it does every other asset; server/renderShell.js reads
      // the resulting hashed filename from the build manifest (see
      // manifest: true below) rather than hardcoding a path, since the
      // hash changes on every build.
      input: {
        main: 'index.html',
        'entry-client': 'src/entry-client.jsx',
      },
    },
    // Needed for renderShell.js to look up entry-client's actual
    // content-hashed output filename after build — without this, Vite
    // still builds the file but there is no reliable way outside the
    // build process itself to know what dist/assets/entry-client-*.js
    // ended up being called.
    manifest: true,
  },
  plugins: [
    react(),
    VitePWA({
      // injectManifest = hand-written service worker (src/sw.js) instead
      // of the fully generated one. Required because generateSW has no
      // hook for push/notificationclick listeners, and Web Push (4.5's
      // whole point) needs both. Workbox precaching still happens via
      // self.__WB_MANIFEST inside sw.js; runtime caching (feed/media/
      // fonts) is also hand-written there so it can sit next to the push
      // listeners instead of being split across config and code.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'prompt',
      injectRegister: null, // registered manually in main.jsx so we control timing/toast
      includeAssets: ['tronite-logo.png'],
      manifest: {
        name: 'Tronites',
        short_name: 'Tronites',
        description: 'Tronites — connect, post, and chat in real time.',
        theme_color: '#04342c',
        background_color: '#04342c',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        orientation: 'portrait',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
      devOptions: {
        // Enabled so `npm run dev` also registers a SW — makes the
        // install-prompt/push flow testable without a full build.
        // type: 'module' is required (not the plugin's 'classic' default)
        // because src/sw.js uses ES `import` statements.
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html',
      },
    }),
  ],
})
