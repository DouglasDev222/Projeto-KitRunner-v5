import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Check if we're in Replit preview mode
    const isReplitPreview = window.location.hostname.includes('.replit.dev') || 
                           window.location.hostname.includes('replit.com');

    // Skip SW registration for admin routes
    const isAdminRoute = window.location.pathname.startsWith('/admin');

    if (isReplitPreview) {
      console.log('🚫 SW registration skipped in Replit preview');
      return;
    }

    if (isAdminRoute) {
      console.log('🚫 SW registration skipped for admin routes');
      return;
    }

    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('✅ SW registered:', registration.scope);
      })
      .catch((error) => {
        console.log('❌ SW registration failed:', error);
      });
  });
}