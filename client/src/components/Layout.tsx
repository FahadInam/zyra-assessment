import { Outlet } from "react-router-dom";
import { Topbar } from "./Topbar";

/** App shell: fixed topbar + the routed page below it. */
export function Layout() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Topbar />
      <Outlet />
    </div>
  );
}
