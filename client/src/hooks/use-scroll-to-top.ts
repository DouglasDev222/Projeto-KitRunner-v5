
import { useEffect } from 'react';
import { useLocation } from 'wouter';

export function useScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    // Scroll para o topo da página quando a localização mudar
    window.scrollTo(0, 0);
  }, [location]);
}
