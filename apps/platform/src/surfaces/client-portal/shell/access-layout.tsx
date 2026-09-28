import { Outlet } from "react-router";

export { middleware } from "./access-layout.server";

export default function ClientAccessLayoutRoute() {
  return <Outlet />;
}
