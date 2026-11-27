import { Outlet } from 'react-router';
import { useAppState } from '../context/AppContext';
import { ComingSoon } from '../pages/ComingSoon';
import { CartDrawer } from './CartDrawer';

export function PrototypeSurface() {
  const { appState } = useAppState();

  if (appState.isComingSoonMode) return <ComingSoon />;

  return (
    <>
      <CartDrawer />
      <Outlet />
    </>
  );
}
