"use client";

import { useEffect } from "react";

const WARM_URLS = ["/dashboard", "/tasks", "/notes", "/semesters", "/timetable", "/calendar", "/attendance", "/exams", "/grades", "/groups", "/instructors", "/settings"];
const PUBLIC_PATHS = ["/", "/login", "/signup", "/forgot-password", "/reset-password"];

// Registers the service worker (production only) and, once per browser
// session after sign-in, asks it to pre-cache the main screens.
export function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => {
        if (!navigator.onLine || PUBLIC_PATHS.includes(window.location.pathname)) return;
        if (sessionStorage.getItem("um-sw-warmed")) return;
        sessionStorage.setItem("um-sw-warmed", "1");
        reg.active?.postMessage({ type: "WARM", urls: WARM_URLS });
      })
      .catch((err) => console.warn("Service worker registration failed:", err));
  }, []);
  return null;
}
