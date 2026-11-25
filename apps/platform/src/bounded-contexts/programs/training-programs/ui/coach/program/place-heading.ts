import { createContext, useContext, type RefObject } from "react";

export const PlaceHeadingContext = createContext<
  RefObject<HTMLHeadingElement | null>
>({ current: null });

export function usePlaceHeading(): RefObject<HTMLHeadingElement | null> {
  return useContext(PlaceHeadingContext);
}
