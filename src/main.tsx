import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";

/**
 * The site used to run on hash routing (/#/weddings). Real paths index far
 * better, so anything still holding an old link — a bookmark, an email
 * signature, a stale backlink — gets rewritten to the path form before React
 * mounts. replaceState keeps the redirect out of the back button.
 */
function redirectLegacyHashRoute() {
  const { hash, pathname, search } = window.location;
  if (!hash.startsWith("#/")) return;
  const target = hash.slice(1);
  if (pathname !== "/" && pathname !== "") return;
  window.history.replaceState(null, "", target + (search && !target.includes("?") ? search : ""));
}

redirectLegacyHashRoute();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
