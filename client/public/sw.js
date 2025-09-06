const CACHE_NAME = 'kitrunner-v2';
const urlsToCache = [
  '/',
  '/logo.webp',
  '/favicon.ico'
];

// Skip service worker registration in Replit preview
const isReplitPreview = () => {
  return location.hostname.includes('replit.dev') || 
         location.hostname.includes('replit.co') ||
         location.hostname.includes('spock.replit.dev');
};

self.addEventListener('install', (event) => {
  // Skip activation immediately for Replit preview
  if (isReplitPreview()) {
    self.skipWaiting();
    return;
  }

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache).catch((error) => {
          console.warn('Cache addAll failed:', error);
          return Promise.resolve();
        });
      })
  );
});

self.addEventListener('activate', (event) => {
  // Clean up old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Skip caching entirely for Replit preview
  if (isReplitPreview()) {
    return;
  }

  // Only cache GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip caching for API requests, websockets, and hot reload
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('/@vite/') ||
      event.request.url.includes('/__vite_ping') ||
      event.request.url.includes('/ws') ||
      event.request.url.includes('hot-update')) {
    return;
  }

  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip non-navigation requests
  if (event.request.mode !== 'navigate') return;

  // Skip requests to API routes
  if (event.request.url.includes('/api/')) return;

  // Skip admin routes - let them load normally
  if (event.request.url.includes('/admin')) {
    // For admin routes, fetch directly without caching
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request).catch(() => {
          // Fallback for offline
          return new Response('Offline', { status: 503 });
        });
      })
  );
});