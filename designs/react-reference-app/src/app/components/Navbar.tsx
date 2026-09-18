import { useCallback, useState, useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Menu, X, ShoppingBag } from 'lucide-react';
import { isSignedIn, useAppState } from '../context/AppContext';
import { useStore } from '../context/StoreContext';
import { Link, useNavigate } from 'react-router';
import { completeSignIn } from '../services/authService';
import {
  NavigationDialog,
  NavigationDialogClose,
  NavigationDialogContent,
  NavigationDialogOverlay,
  NavigationDialogPortal,
  NavigationDialogTitle,
  NavigationDialogTrigger,
} from './ui/navigation-dialog';
import { useCloseMobileNavigationOnDesktop } from './ui/use-close-mobile-navigation-on-desktop';

type MobileMenuState = 'closed' | 'closing' | 'open';

export function Navbar({ theme = 'transparent' }: { theme?: 'dark' | 'transparent' }) {
  const [isScrolled, setIsScrolled] = useState(theme === 'dark');
  const [mobileMenuState, setMobileMenuState] = useState<MobileMenuState>('closed');
  const isMobileDialogOpen = mobileMenuState !== 'closed';
  const isMobileMenuOpen = mobileMenuState === 'open';
  const { appState, setAppState } = useAppState();
  const { cart, setIsCartOpen } = useStore();
  // The cart control is an affordance for a cart that has something in it, so
  // it stays out of the bar until the visitor has added a product.
  const hasCartItems = cart.length > 0;
  // The rule before the actions only earns its place when something follows it.
  const hasNavActions = hasCartItems || !appState.isWaitlistMode;
  const navigate = useNavigate();
  const [isSigningIn, setIsSigningIn] = useState(false);
  // Every page renders its own Navbar, so a visitor can leave mid-sign-in.
  // The completion must not then steer the page they moved on to.
  const isMounted = useRef(true);
  const dialogContentRef = useRef<HTMLDivElement | null>(null);
  const mobileNavigationRef = useRef<HTMLElement | null>(null);
  const mobileTriggerRef = useRef<HTMLButtonElement | null>(null);
  const prefersReducedMotion = useReducedMotion() ?? false;
  useEffect(
    () => () => {
      isMounted.current = false;
    },
    [],
  );

  useEffect(() => {
    if (theme === 'dark') {
      setIsScrolled(true);
      return;
    }
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [theme]);

  // The free Store is live during the waitlist, so it and the cart stay in the
  // bar in both modes. Only the account controls wait for launch.
  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Store', href: '/store' },
    { name: 'Pricing', href: '/pricing' },
  ];

  const signIn = async () => {
    setIsSigningIn(true);
    try {
      const session = await completeSignIn(appState.signInOutcome);
      if (!isMounted.current) return;
      setAppState({ session });
    } catch {
      // Account provisioning failed, so the session was never established.
      if (!isMounted.current) return;
      navigate('/sign-in-failed');
    } finally {
      if (isMounted.current) setIsSigningIn(false);
    }
  };

  const signOut = () => {
    setAppState({ session: 'anonymous' });
  };

  const authActionLabel = isSigningIn
    ? 'Signing in…'
    : isSignedIn(appState.session)
      ? 'Sign Out'
      : 'Sign In';

  const runAuthAction = () => {
    if (isSigningIn) return;
    if (isSignedIn(appState.session)) {
      signOut();
      return;
    }
    void signIn();
  };

  const closeMobileMenu = useCallback(() => {
    setMobileMenuState((currentState) => (currentState === 'closed' ? 'closed' : 'closing'));
  }, []);
  const closeMobileMenuImmediately = useCallback(() => {
    setMobileMenuState('closed');
  }, []);
  const reopenMobileMenu = useCallback(() => {
    setMobileMenuState('open');
  }, []);

  useCloseMobileNavigationOnDesktop({
    close: closeMobileMenuImmediately,
    isOpen: isMobileDialogOpen,
    mobileControlRef: mobileTriggerRef,
  });

  // The open copy belongs inside Radix's focus scope; the page copy retains
  // the trigger that receives focus after the dialog finishes closing.
  const renderHeader = (placement: 'page' | 'dialog') => {
    const isActiveHeader = placement === 'dialog' ? isMobileDialogOpen : !isMobileDialogOpen;
    const openCart = () => {
      if (placement === 'dialog') {
        closeMobileMenuImmediately();
      }
      setIsCartOpen(true);
    };
    const menuButton = (
      <button
        className="md:hidden p-2 z-[60] relative"
        aria-expanded={isMobileMenuOpen}
        aria-controls="mobile-nav-overlay"
        aria-label="Toggle menu"
        onClick={placement === 'dialog' && !isMobileMenuOpen ? reopenMobileMenu : undefined}
        ref={placement === 'page' ? mobileTriggerRef : undefined}
      >
        <motion.div animate={isMobileMenuOpen ? 'open' : 'closed'}>
          {isMobileMenuOpen ? (
            <X size={28} className="text-foreground" />
          ) : (
            <Menu size={28} className={isScrolled ? 'text-foreground' : 'text-white'} />
          )}
        </motion.div>
      </button>
    );

    return (
      <header
        className={`fixed top-0 left-0 right-0 z-[60] transition-colors duration-300 ${
          isScrolled || isMobileMenuOpen
            ? 'bg-white/95 backdrop-blur-md shadow-sm text-foreground'
            : 'bg-transparent text-white'
        } ${isActiveHeader ? '' : 'invisible'}`}
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo Mock */}
          <div className="flex items-center gap-2 cursor-pointer z-[60]" onClick={closeMobileMenu}>
            <div
              className={`w-8 h-8 flex items-center justify-center border-2 rounded-sm transform rotate-45 transition-colors ${
                isScrolled || isMobileMenuOpen ? 'border-brand' : 'border-current'
              }`}
            >
              <div
                className={`w-3 h-3 transform -rotate-45 transition-colors ${
                  isScrolled || isMobileMenuOpen ? 'bg-brand' : 'bg-current'
                }`}
              />
            </div>
            <span
              className={`font-serif font-semibold text-xl tracking-wide ml-2 transition-colors ${
                isScrolled || isMobileMenuOpen ? 'text-foreground' : 'text-white'
              }`}
            >
              Evoa
            </span>
          </div>

          {/* Desktop Nav */}
          {placement === 'page' ? (
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  className="text-sm font-medium tracking-wide hover:text-brand transition-colors"
                >
                  {link.name}
                </Link>
              ))}

              {hasNavActions && <div className="w-px h-4 bg-current opacity-20 mx-2"></div>}

              {!appState.isWaitlistMode && (
                <>
                  {appState.session === 'client' && (
                    <Link
                      to="/portal"
                      className={`text-sm font-medium tracking-wide px-4 py-1.5 rounded-full transition-all ${
                        isScrolled
                          ? 'bg-brand text-brand-foreground hover:bg-brand-hover'
                          : 'bg-white/15 text-white border border-white/30 backdrop-blur-sm hover:bg-white/25'
                      }`}
                    >
                      Client Portal
                    </Link>
                  )}

                  {appState.session === 'coach' && (
                    <Link
                      to="/coach"
                      className={`text-sm font-medium tracking-wide px-4 py-1.5 rounded-full transition-all ${
                        isScrolled
                          ? 'bg-brand text-brand-foreground hover:bg-brand-hover'
                          : 'bg-white/15 text-white border border-white/30 backdrop-blur-sm hover:bg-white/25'
                      }`}
                    >
                      Coach Portal
                    </Link>
                  )}
                </>
              )}

              {hasCartItems && (
                <button
                  onClick={openCart}
                  className="relative -m-3 inline-flex p-3 hover:text-brand transition-colors"
                  aria-label="Open cart"
                >
                  <span className="relative block">
                    <ShoppingBag size={20} />
                    <span className="absolute -top-1.5 -right-2 bg-brand text-brand-foreground text-[10px] font-semibold w-4 h-4 rounded-full flex items-center justify-center">
                      {cart.length}
                    </span>
                  </span>
                </button>
              )}

              {!appState.isWaitlistMode && (
                <button
                  onClick={runAuthAction}
                  aria-busy={isSigningIn}
                  className="text-sm font-medium tracking-wide hover:text-brand transition-colors aria-busy:opacity-60"
                >
                  {authActionLabel}
                </button>
              )}
            </nav>
          ) : null}

          {hasCartItems && isActiveHeader && (
            <button
              className="md:hidden -m-3 inline-flex p-3 z-[60] relative"
              onClick={openCart}
              aria-label="Open cart"
            >
              <span className="relative block">
                <ShoppingBag size={20} className={isScrolled ? 'text-foreground' : 'text-white'} />
                <span className="absolute -top-1.5 -right-2 bg-brand text-brand-foreground text-[10px] font-semibold w-4 h-4 rounded-full flex items-center justify-center">
                  {cart.length}
                </span>
              </span>
            </button>
          )}

          {placement === 'page' ? (
            <NavigationDialogTrigger asChild>{menuButton}</NavigationDialogTrigger>
          ) : isMobileMenuOpen ? (
            <NavigationDialogClose asChild>{menuButton}</NavigationDialogClose>
          ) : (
            menuButton
          )}
        </div>
      </header>
    );
  };

  return (
    <NavigationDialog
      open={isMobileDialogOpen}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          reopenMobileMenu();
          return;
        }
        closeMobileMenu();
      }}
    >
      {renderHeader('page')}

      {/* Full Screen Mobile Nav Overlay */}
      <NavigationDialogPortal>
        <NavigationDialogOverlay className="fixed inset-0" />
        <NavigationDialogContent
          aria-describedby={undefined}
          className="fixed inset-0 z-[55] outline-none"
          id="mobile-nav-overlay"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            mobileNavigationRef.current
              ?.querySelector<HTMLElement>(
                'nav[aria-label="Mobile public site navigation"] a[href]',
              )
              ?.focus();
          }}
          onCloseAutoFocus={(event) => {
            const anotherDialogIsOpen = Array.from(
              document.querySelectorAll<HTMLElement>('[role="dialog"]'),
            ).some((dialog) => dialog !== dialogContentRef.current);

            if (anotherDialogIsOpen) {
              event.preventDefault();
            }
          }}
          ref={dialogContentRef}
        >
          {renderHeader('dialog')}
          <NavigationDialogTitle className="sr-only">
            Mobile public site navigation
          </NavigationDialogTitle>
          <motion.div
            animate={
              isMobileMenuOpen
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: prefersReducedMotion ? 0 : '-100%' }
            }
            className="absolute inset-0 bg-surface-page flex flex-col items-center justify-center"
            initial={prefersReducedMotion ? false : { opacity: 0, y: '-100%' }}
            onAnimationComplete={() => {
              setMobileMenuState((currentState) =>
                currentState === 'closing' ? 'closed' : currentState,
              );
            }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : isMobileMenuOpen
                  ? { type: 'spring', damping: 25, stiffness: 200 }
                  : { duration: 0.3 }
            }
          >
            <nav
              aria-label="Mobile public site navigation"
              className="flex flex-col items-center gap-10"
              ref={mobileNavigationRef}
            >
              {navLinks.map((link, i) => (
                <motion.a
                  key={link.name}
                  href={link.href}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.1 + i * 0.1 }}
                  className="text-4xl sm:text-5xl font-serif font-medium text-foreground hover:text-brand transition-colors"
                  onClick={closeMobileMenu}
                >
                  {link.name}
                </motion.a>
              ))}

              {!appState.isWaitlistMode && (
                <motion.div
                  initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.3 }}
                  className="w-16 h-px bg-neutral-300 my-4"
                />
              )}

              {appState.session === 'client' && (
                <motion.div
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.35 }}
                >
                  <Link
                    to="/portal"
                    onClick={closeMobileMenu}
                    className="text-2xl font-medium tracking-wide text-brand"
                  >
                    Client Portal
                  </Link>
                </motion.div>
              )}
              {appState.session === 'coach' && (
                <motion.div
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.35 }}
                >
                  <Link
                    to="/coach"
                    onClick={closeMobileMenu}
                    className="text-2xl font-medium tracking-wide text-brand"
                  >
                    Coach Portal
                  </Link>
                </motion.div>
              )}

              {!appState.isWaitlistMode && (
                <motion.button
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.4 }}
                  onClick={() => {
                    runAuthAction();
                    closeMobileMenu();
                  }}
                  aria-busy={isSigningIn}
                  className="text-2xl font-medium tracking-wide text-link-muted hover:text-foreground aria-busy:opacity-60"
                >
                  {authActionLabel}
                </motion.button>
              )}
            </nav>

            {/* Decorative background element */}
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 0.03 }}
              transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.5 }}
              className="absolute bottom-0 left-0 right-0 pointer-events-none"
            >
              <svg
                viewBox="0 0 1440 320"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-auto text-brand"
              >
                <path
                  fill="currentColor"
                  d="M0,288L48,272C96,256,192,224,288,197.3C384,171,480,149,576,165.3C672,181,768,219,864,218.7C960,219,1056,181,1152,149.3C1248,117,1344,91,1392,80L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
                ></path>
              </svg>
            </motion.div>
          </motion.div>
        </NavigationDialogContent>
      </NavigationDialogPortal>
    </NavigationDialog>
  );
}
