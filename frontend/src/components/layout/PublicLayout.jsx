import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { PublicNavbar } from "../public/PublicNavbar";
import { ToastContainer } from "../ui/Toast";

export default function PublicLayout() {
  useEffect(() => {
    // Increment total views
    const currentViews = parseInt(localStorage.getItem("dpms_total_views") || "1420", 10);
    localStorage.setItem("dpms_total_views", (currentViews + 1).toString());

    const root = document.documentElement;
    const hasDark = root.classList.contains("dark");
    if (hasDark) {
      root.classList.remove("dark");
    }
    return () => {
      const savedTheme = localStorage.getItem("dpms_theme");
      if (savedTheme === "dark") {
        root.classList.add("dark");
      }
    };
  }, []);

  return (
    <>
      <PublicNavbar />
      <Outlet />
      <ToastContainer />
    </>
  );
}

