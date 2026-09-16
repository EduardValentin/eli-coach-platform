import { useReducedMotionConfig } from "motion/react";
import { useEffect, useState } from "react";

export const publicViewportOnce = {
  amount: 0.2,
  once: true,
} as const;

export const publicEase = [0.25, 0.1, 0.25, 1] as const;
export const publicEaseOut = [0.16, 1, 0.3, 1] as const;

export function useClientReducedMotionPreference() {
  const shouldReduceMotion = useReducedMotionConfig() === true;
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  return hasHydrated && shouldReduceMotion;
}

export function createFadeUpVariants(options: {
  delay?: number;
  duration?: number;
  offset?: number;
} = {}) {
  const { delay = 0, duration = 0.6, offset = 24 } = options;

  return {
    hidden: {
      opacity: 0,
      y: offset,
    },
    visible: {
      opacity: 1,
      transition: {
        delay,
        duration,
        ease: publicEase,
      },
      y: 0,
    },
  };
}
