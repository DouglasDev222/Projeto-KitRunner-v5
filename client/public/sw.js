
const CACHE_NAME = 'kitrunner-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/logo.webp'
];

// Skip development environments (like Replit preview)
const isDevelopment = self.location.hostname.includes('replit.dev') || 
                      self.location.hostname === 'localhost' ||
                      self.location.port === '5000';

// Install event
self.addEventListener('install', (event) => {
  if (isDevelopment) {
    self.skipWaiting();
    return;
  }
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - skip in development
self.addEventListener('fetch', (event) => {
  // Don't intercept requests in development environment
  if (isDevelopment) {
    return;
  }

  // Only cache GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip API requests and external resources
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('chrome-extension://') ||
      !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
      .catch(() => {
        // Fallback to network if cache fails
        return fetch(event.request);
      })
  );
});

// Activate event
self.addEventListener('activate', (event) => {
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
