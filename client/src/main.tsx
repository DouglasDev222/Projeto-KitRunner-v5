import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  // Check if we're in Replit preview environment
  const isReplitPreview = location.hostname.includes('replit.dev') || 
                         location.hostname.includes('replit.co') ||
                         location.hostname.includes('spock.replit.dev');

  window.addEventListener('load', () => {
    if (isReplitPreview) {
      console.log('🚫 SW registration skipped in Replit preview');
      // Clear any existing service workers in preview
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister();
        });
      });
      return;
    }

    navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none'
    })
      .then((registration) => {
        console.log('✅ SW registered: ', registration);
        
        // Force update check
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('🔄 New SW available, will update on next page load');
              }
            });
          }
        });
      })
      .catch((registrationError) => {
        console.warn('⚠️ SW registration failed: ', registrationError);
      });
  });
}
