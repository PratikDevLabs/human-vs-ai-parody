// ============================================================
// sw.js — service worker for HUMAN vs AI — Overlord Arena.
// Precache app shell (HTML/CSS/JS/vendor/fonts/icons) on install;
// cache-first at runtime; voice clips (assets/audio/voice/) cached
// lazily on first play. Version bump on every release.
// ============================================================
const VERSION = 'hva-v3-0-0';
const SHELL = [
  './',
  'index.html',
  'manifest.json',
  'favicon.svg',
  'assets/css/style.css',
  'assets/vendor/three/three.module.js',
  'assets/vendor/three/addons/postprocessing/EffectComposer.js',
  'assets/vendor/three/addons/postprocessing/RenderPass.js',
  'assets/vendor/three/addons/postprocessing/ShaderPass.js',
  'assets/vendor/three/addons/postprocessing/MaskPass.js',
  'assets/vendor/three/addons/postprocessing/Pass.js',
  'assets/vendor/three/addons/postprocessing/UnrealBloomPass.js',
  'assets/vendor/three/addons/postprocessing/OutputPass.js',
  'assets/vendor/three/addons/shaders/CopyShader.js',
  'assets/vendor/three/addons/shaders/LuminosityHighPassShader.js',
  'assets/vendor/three/addons/shaders/OutputShader.js',
  'src/main.js',
  'src/config.js',
  'src/data/dialogue.js',
  'src/core/bus.js',
  'src/core/errors.js',
  'src/core/storage.js',
  'src/core/i18n.js',
  'src/core/quality.js',
  'src/game/sim.js',
  'src/game/ai.js',
  'src/game/ults.js',
  'src/render/renderer3d.js',
  'src/render/arena.js',
  'src/render/rigs.js',
  'src/render/fx3d.js',
  'src/render/canvas2d.js',
  'src/ui/hud.js',
  'src/ui/controls.js',
  'src/ui/screens.js',
  'src/ui/tutorial.js',
  'src/ui/icons.js',
  'src/audio/audio.js',
  'src/audio/voice.js',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/icon-maskable-512.png',
  'assets/icons/apple-touch-icon.png',
  'assets/og/og-image.png',
];
const FONTS = [
  'assets/fonts/teko-latin-600.woff2', 'assets/fonts/teko-latin-700.woff2',
  'assets/fonts/teko-devanagari-600.woff2', 'assets/fonts/teko-devanagari-700.woff2',
  'assets/fonts/rajdhani-latin-600.woff2', 'assets/fonts/rajdhani-latin-700.woff2',
  'assets/fonts/rajdhani-devanagari-600.woff2', 'assets/fonts/rajdhani-devanagari-700.woff2',
  'assets/fonts/inter-latin-400.woff2', 'assets/fonts/inter-latin-600.woff2', 'assets/fonts/inter-latin-700.woff2',
  'assets/fonts/noto-latin-400.woff2',
  'assets/fonts/noto-devanagari-600.woff2', 'assets/fonts/noto-devanagari-700.woff2', 'assets/fonts/noto-devanagari-800.woff2',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => c.addAll([...SHELL, ...FONTS]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // never cache cross-origin
  if (e.request.method !== 'GET') return;
  // voice clips: cache-first, lazily stored
  if (url.pathname.includes('/assets/audio/voice/')) {
    e.respondWith(
      caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, clone));
        }
        return res;
      }).catch(() => hit))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request, { ignoreSearch: url.pathname.endsWith('index.html') || url.pathname.endsWith('/') }).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((res) => {
        if (res.ok && (url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.woff2') || url.pathname.endsWith('.png') || url.pathname.endsWith('.json') || url.pathname.endsWith('.svg') || url.pathname.endsWith('.html'))) {
          const clone = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, clone));
        }
        return res;
      }).catch(() => {
        if (e.request.mode === 'navigate') return caches.match('index.html');
        return Response.error();
      });
    })
  );
});
