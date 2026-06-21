import { Outlet } from "react-router-dom";
import { PublicNavbar } from "../public/PublicNavbar";
import { ToastContainer } from "../ui/Toast";

export default function PublicLayout() {
  return (
    <>
      <PublicNavbar />
      <Outlet />
      <ToastContainer />
    </>
  );
}
