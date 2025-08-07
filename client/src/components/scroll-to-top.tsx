
import { useScrollToTop } from '@/hooks/use-scroll-to-top';
import { ReactNode } from 'react';

interface ScrollToTopProps {
  children: ReactNode;
}

export function ScrollToTop({ children }: ScrollToTopProps) {
  useScrollToTop();
  return <>{children}</>;
}
