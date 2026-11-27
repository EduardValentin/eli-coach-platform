import { data } from "react-router";

// A URL no route names must still reach the root middleware, so the coming-soon
// gate sees it. React Router skips middleware when nothing matches.
export function loader(): never {
  throw data("Not Found", { status: 404 });
}

export function action(): never {
  throw data("Not Found", { status: 404 });
}

export default function NotFound(): null {
  return null;
}
