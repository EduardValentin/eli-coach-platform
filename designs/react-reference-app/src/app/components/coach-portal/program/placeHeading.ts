import { createContext, useContext, type RefObject } from 'react';

/** The builder's h1, where focus goes when the control that had it leaves the page. */
export const PlaceHeadingContext = createContext<RefObject<HTMLHeadingElement | null>>({ current: null });

export function usePlaceHeading(): RefObject<HTMLHeadingElement | null> {
  return useContext(PlaceHeadingContext);
}
