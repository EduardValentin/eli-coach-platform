import { useEffect } from 'react';

export function useCoachPortalScope() {
  useEffect(() => {
    document.documentElement.dataset.portal = 'coach';
    return () => {
      delete document.documentElement.dataset.portal;
    };
  }, []);
}
