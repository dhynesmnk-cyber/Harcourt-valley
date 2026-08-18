import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";

/*
 * This app routes entirely on the URL hash (HashRouter), so the only
 * canonical page for the host to serve is "/". A real-path URL like
 * "/winery" (from a bookmark, a shared link, or someone typing it in)
 * still resolves to "/" via the Netlify catch-all redirect, but the
 * router then sees an empty hash and silently renders Home instead of
 * Winery. Worse, an in-app nav click after that lands on a real-path
 * URL appends its hash-only href to the existing pathname (e.g.
 * "/winery#/winery"), which is a malformed location this app never
 * expects. Normalize any non-root pathname into the hash form before
 * the app mounts, folding an existing hash in rather than doubling it.
 */
const { pathname, hash, search } = window.location;
if (pathname !== "/") {
  const targetHash = hash.length > 1 ? hash : `#${pathname}${search}`;
  window.location.replace(`/${targetHash}`);
} else {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}
