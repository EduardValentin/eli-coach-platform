import { useMediaQuery } from "./use-desktop";

const MOBILE_QUERY = "(width < 48em)";

export function useIsMobile() {
  return useMediaQuery(MOBILE_QUERY);
}
