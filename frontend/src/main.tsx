import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";
import "./matching-enhancements.css";
import "./reader-shell.css";

const entry = new URL(window.location.href);
if (entry.pathname === "/" && entry.searchParams.get("view") === "home"
  && !entry.searchParams.has("studio") && !entry.searchParams.has("open")) {
  // The previous public sitemap linked to the service introduction at /?view=home.
  entry.pathname = "/classic/";
  entry.searchParams.set("view", "intro");
  window.location.replace(entry.href);
} else {
  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
