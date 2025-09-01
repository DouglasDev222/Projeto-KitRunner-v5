
// Utility functions for handling Replit preview environment

export const isReplitPreview = (): boolean => {
  return location.hostname.includes('replit.dev') || 
         location.hostname.includes('replit.co') ||
         location.hostname.includes('spock.replit.dev');
};

export const isReplitWebview = (): boolean => {
  return window.parent !== window || 
         document.referrer.includes('replit.com');
};

export const clearCachesForPreview = async (): Promise<void> => {
  if (!isReplitPreview()) return;

  try {
    // Clear all caches
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
    
    // Clear localStorage and sessionStorage
    localStorage.clear();
    sessionStorage.clear();
    
    console.log('🧹 Replit preview caches cleared');
  } catch (error) {
    console.warn('⚠️ Failed to clear preview caches:', error);
  }
};

export const addPreviewModeIndicator = (): void => {
  if (!isReplitPreview()) return;

  const indicator = document.createElement('div');
  indicator.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: #ff6b35;
    color: white;
    text-align: center;
    padding: 4px;
    font-size: 12px;
    z-index: 9999;
    font-family: monospace;
  `;
  indicator.textContent = '🔧 REPLIT PREVIEW MODE - Some features may be limited';
  document.body.appendChild(indicator);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (indicator.parentNode) {
      indicator.parentNode.removeChild(indicator);
    }
  }, 5000);
};
