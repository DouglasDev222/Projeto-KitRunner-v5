
import { useIsMobile } from './use-mobile';
import { getStatusBadge } from '@/lib/status-utils';

export function useResponsiveStatusBadge() {
  const isMobile = useIsMobile();
  
  return (status: string) => getStatusBadge(status, isMobile);
}
