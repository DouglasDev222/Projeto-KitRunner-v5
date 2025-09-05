
import { useEffect } from 'react';
import { useLocation } from 'wouter';

interface MetaTagsProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
}

export function MetaTags({ 
  title = "KitRunner - Receba seu Kit em Casa", 
  description = "Seu Kit de Corrida, Entregue com Agilidade e Praticidade!",
  image = "/logo.webp",
  url = window.location.href
}: MetaTagsProps) {
  const [location] = useLocation();
  const isAdminRoute = location.startsWith('/admin');

  useEffect(() => {
    // Update manifest link based on route
    let manifestLink = document.querySelector('link[rel="manifest"]');
    if (manifestLink) {
      const manifestPath = isAdminRoute ? '/manifest-admin.json' : '/manifest.json';
      manifestLink.setAttribute('href', manifestPath);
    }

    // Register appropriate service worker
    if ('serviceWorker' in navigator) {
      const swPath = isAdminRoute ? '/sw-admin.js' : '/sw.js';
      navigator.serviceWorker.register(swPath).catch(error => {
        console.log('🚫 SW registration skipped in Replit preview');
      });
    }
    // Update document title
    document.title = title;
    
    // Update meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', description);
    }
    
    // Update Open Graph tags
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute('content', title);
    }
    
    let ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) {
      ogDescription.setAttribute('content', description);
    }
    
    let ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) {
      ogImage.setAttribute('content', image);
    }
    
    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) {
      ogUrl.setAttribute('content', url);
    }
    
    // Update Twitter Card tags
    let twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle) {
      twitterTitle.setAttribute('content', title);
    }
    
    let twitterDescription = document.querySelector('meta[name="twitter:description"]');
    if (twitterDescription) {
      twitterDescription.setAttribute('content', description);
    }
    
    let twitterImage = document.querySelector('meta[name="twitter:image"]');
    if (twitterImage) {
      twitterImage.setAttribute('content', image);
    }
  }, [title, description, image, url, isAdminRoute]);

  return null;
}
