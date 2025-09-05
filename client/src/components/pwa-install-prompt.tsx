
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, X, Shield, Smartphone, Globe } from "lucide-react";
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
  
  const isAdminRoute = location.startsWith('/admin');
  const isAdminLogin = location === '/admin/login';
  
  // Check if user has dismissed PWA installation
  const hasUserDismissedPWA = () => {
    const key = isAdminRoute ? 'pwa-admin-dismissed' : 'pwa-client-dismissed';
    const dismissedAt = localStorage.getItem(key);
    if (!dismissedAt) return false;
    
    const dismissedTime = parseInt(dismissedAt);
    const hoursAgo = (Date.now() - dismissedTime) / (1000 * 60 * 60);
    const threshold = isAdminRoute ? 24 : 6; // Admin: 24h, Client: 6h
    return hoursAgo < threshold;
  };

  useEffect(() => {
    // Check if we're on iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Check if already installed or in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true;
    setIsInStandaloneMode(isStandalone);

    if (isStandalone) return; // Already installed

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show client PWA prompt outside admin routes
      if (!isAdminRoute && !hasUserDismissedPWA()) {
        setShowInstallPrompt(true);
      }
    };

    // Show admin PWA prompt only on login page
    if (isAdminLogin && !hasUserDismissedPWA()) {
      const timer = setTimeout(() => setShowInstallPrompt(true), 2000);
      return () => clearTimeout(timer);
    }

    // For iOS Safari, show manual instructions
    if (iOS && !isAdminRoute && !hasUserDismissedPWA()) {
      setShowInstallPrompt(true);
    }

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [isAdminRoute, isAdminLogin, isInStandaloneMode]);

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
    
    // Save dismissal timestamp 
    const key = isAdminRoute ? 'pwa-admin-dismissed' : 'pwa-client-dismissed';
    localStorage.setItem(key, Date.now().toString());
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

  if (!showInstallPrompt || isInStandaloneMode) return null;

  const instructions = getBrowserInstructions();
  
  // Admin styling and content
  const config = isAdminRoute ? {
    icon: <Shield className="h-5 w-5 text-orange-600" />,
    title: "Instalar KitRunner Admin",
    description: "Acesso rápido ao painel administrativo",
    cardClass: "border-orange-200 bg-gradient-to-r from-orange-50 to-red-50"
  } : {
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
