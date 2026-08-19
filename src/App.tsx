import React from "react";
import { HashRouter, Route, Routes, useLocation } from "react-router-dom";
import { StoreProvider } from "./lib/store";
import { CartDrawer, Footer, Header, ScrollToTop, ToastHost } from "./components/chrome";
import Home from "./pages/Home";
import Winery from "./pages/Winery";
import Trade from "./pages/Trade";
import Weddings from "./pages/Weddings";
import Events from "./pages/Events";
import Admin from "./pages/admin/Admin";

function Shell() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

  if (isAdmin) {
    return (
      <>
        <ScrollToTop />
        <Admin />
        <ToastHost />
      </>
    );
  }

  return (
    <div className="min-h-svh flex flex-col">
      <ScrollToTop />
      <Header />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        {/* Keyed on the path so each page settles in rather than snapping. */}
        <div key={location.pathname} className="page-in">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/winery" element={<Winery />} />
            <Route path="/winery/trade" element={<Trade />} />
            <Route path="/weddings" element={<Weddings />} />
            <Route path="/events" element={<Events />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </main>
      <Footer />
      <CartDrawer />
      <ToastHost />
    </div>
  );
}

function NotFound() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-28 text-center">
      <p className="num-ghost text-[6rem]">404</p>
      <h1 className="font-display text-4xl font-medium mt-2">Wrong turn in the rows.</h1>
      <p className="text-granite-700 mt-4">This path doesn't exist — the cellar door, however, does.</p>
      <a href="#/" className="btn btn-primary mt-8 inline-flex">
        Back to the valley
      </a>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <HashRouter>
        <Shell />
      </HashRouter>
    </StoreProvider>
  );
}
