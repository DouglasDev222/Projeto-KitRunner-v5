
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, X, Smartphone, Globe } from "lucide-react";
import { useLocation } from "wouter";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [location] = useLocation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInStandaloneMode, setIsInStandaloneMode] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  
  const isAdminRoute = location.startsWith('/admin');
  
  // Check if user has dismissed PWA installation (only for client routes)
  const hasUserDismissedPWA = () => {
    const dismissedAt = localStorage.getItem('pwa-client-dismissed');
    if (!dismissedAt) return false;
    
    const dismissedTime = parseInt(dismissedAt);
    const hoursAgo = (Date.now() - dismissedTime) / (1000 * 60 * 60);
    return hoursAgo < 6; // Client: 6h
  };

  useEffect(() => {
    // Check if we're on iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // 🖥️ DESKTOP FIX: Detect desktop to not show PWA prompt
    const checkIsDesktop = () => {
      // Check screen size (desktop typically >= 1024px width)
      const hasLargeScreen = window.innerWidth >= 1024;
      
      // Check for desktop user agents (not mobile/tablet)
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      
      // Check for touch support (desktops usually don't have primary touch)
      const hasTouchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      // Desktop if: large screen AND not mobile device AND (no touch OR has mouse)
      return hasLargeScreen && !isMobileDevice && (!hasTouchSupport || window.matchMedia('(pointer: fine)').matches);
    };
    
    const desktop = checkIsDesktop();
    setIsDesktop(desktop);

    // Check if already installed or in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true;
    setIsInStandaloneMode(isStandalone);

    // 🚫 ADMIN ROUTES: Never show PWA on admin routes
    if (isStandalone || desktop || isAdminRoute) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Only show client PWA prompt outside admin routes AND not on desktop
      if (!hasUserDismissedPWA() && !desktop) {
        setShowInstallPrompt(true);
      }
    };

    // For iOS Safari, show manual instructions only if not desktop and not admin
    if (iOS && !hasUserDismissedPWA() && !desktop) {
      setShowInstallPrompt(true);
    }

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [isAdminRoute, isInStandaloneMode, isDesktop]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('✅ PWA installed successfully');
      }
      
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    } catch (error) {
      console.error('❌ Installation failed:', error);
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    setDeferredPrompt(null);
    
    // Save dismissal timestamp for client PWA
    localStorage.setItem('pwa-client-dismissed', Date.now().toString());
  };

  const getBrowserInstructions = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (isIOS) {
      return {
        icon: <Globe className="w-4 h-4" />,
        browser: "Safari",
        steps: [
          "1. Toque no ícone de compartilhar",
          "2. Selecione 'Adicionar à Tela Inicial'",
          "3. Toque em 'Adicionar'"
        ]
      };
    } else if (userAgent.includes('chrome')) {
      return {
        icon: <Globe className="w-4 h-4" />,
        browser: "Chrome",
        steps: [
          "1. Toque no menu (⋮)",
          "2. Selecione 'Instalar app'",
          "3. Toque em 'Instalar'"
        ]
      };
    } else if (userAgent.includes('firefox')) {
      return {
        icon: <Globe className="w-4 h-4" />,
        browser: "Firefox",
        steps: [
          "1. Toque no menu (⋮)",
          "2. Selecione 'Instalar'",
          "3. Confirme a instalação"
        ]
      };
    } else {
      return {
        icon: <Smartphone className="w-4 h-4" />,
        browser: "Navegador",
        steps: [
          "1. Procure por 'Instalar' no menu",
          "2. Ou 'Adicionar à tela inicial'",
          "3. Confirme a instalação"
        ]
      };
    }
  };

  // Don't render PWA prompt on desktop, admin routes, or if already standalone
  if (!showInstallPrompt || isInStandaloneMode || isDesktop || isAdminRoute) return null;

  const instructions = getBrowserInstructions();
  
  // Client-only styling and content
  const config = {
    icon: <Download className="h-5 w-5 text-blue-600" />,
    title: "Instalar KitRunner",
    description: "Acesso rápido no seu dispositivo",
    cardClass: "border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50"
  };

  return (
    <Card className={`fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm shadow-lg ${config.cardClass}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            {config.icon}
            <div>
              <p className="text-sm font-medium">{config.title}</p>
              <p className="text-xs text-gray-600">{config.description}</p>
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={handleDismiss}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {deferredPrompt ? (
          <Button size="sm" onClick={handleInstallClick} className="w-full">
            Instalar Agora
          </Button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-gray-700">
              {instructions.icon}
              <span>Para instalar no {instructions.browser}:</span>
            </div>
            <div className="text-xs text-gray-600 space-y-1 ml-6">
              {instructions.steps.map((step, index) => (
                <div key={index}>{step}</div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
