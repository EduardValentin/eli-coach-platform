import { redirect } from "react-router";

// The hub opens on Client Plans, as the prototype does; every tab has its own
// URL, so the root only forwards.
export function loader() {
  throw redirect("/coach/training/plans");
}
