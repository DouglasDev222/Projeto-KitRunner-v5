import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, X, Shield } from "lucide-react";
import { useLocation } from "wouter";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function AdminPWAInstallPrompt() {
  const [location] = useLocation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  
  const isAdminLoginRoute = location === '/admin/login';
  
  // Check if PWA is already installed
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    
    // Show prompt immediately on admin login if PWA is not installed
    if (isAdminLoginRoute && !isStandalone) {
      setShowInstallPrompt(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [isAdminLoginRoute, isStandalone]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Native PWA install prompt available
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('Admin accepted the install prompt');
      }
      
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    } else {
      // Fallback: Show manual installation instructions
      if (isIOS) {
        alert('Para instalar no iOS: Toque no botão de compartilhamento e selecione "Adicionar à tela de início"');
      } else {
        alert('Para instalar: Clique no menu do navegador (⋮) e selecione "Instalar app" ou "Adicionar à tela de início"');
      }
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    setDeferredPrompt(null);
  };

  // Only show on admin login route
  if (!showInstallPrompt || !isAdminLoginRoute) return null;

  return (
    <Card className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm shadow-lg border-orange-200 bg-orange-50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="h-5 w-5 text-orange-600" />
            <div>
              <p className="text-sm font-medium text-orange-800">Instalar KitRunner Admin</p>
              <p className="text-xs text-orange-600">Acesso administrativo rápido</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button size="sm" onClick={handleInstallClick} className="bg-orange-600 hover:bg-orange-700">
              Instalar
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDismiss} className="text-orange-600 hover:bg-orange-100">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}