import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "./supabase";

interface AuthValue {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  isAdmin: boolean;
  sendMagicLink: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthValue | null>(null);

/*
 * Runs at the app root (always mounted, regardless of route) because a
 * clicked magic-link lands wherever emailRedirectTo points — currently the
 * site root — not necessarily on /admin, so the "?code=..." exchange can't
 * live inside the Admin page component.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(supabaseConfigured);

  const checkAdmin = useCallback(async (email: string | undefined) => {
    if (!supabase || !email) {
      setIsAdmin(false);
      return;
    }
    const { data, error } = await supabase.from("admins").select("email").eq("email", email).maybeSingle();
    setIsAdmin(!error && !!data);
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const init = async () => {
      const params = new URLSearchParams(window.location.search);
      if (params.has("code")) {
        const { error } = await client.auth.exchangeCodeForSession(window.location.href);
        // Strip the auth query params so they don't linger in the URL or
        // get re-processed on a later reload.
        const cleanUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, "", cleanUrl);
        if (!error) {
          // A magic link is only ever requested from the admin sign-in
          // screen, so it's safe to land the visitor there afterwards.
          window.location.hash = "/admin";
        }
      }

      const { data } = await client.auth.getSession();
      if (cancelled) return;
      setSession(data.session);
      await checkAdmin(data.session?.user.email);
      if (!cancelled) setLoading(false);
    };

    void init();

    const { data: sub } = client.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      void checkAdmin(newSession?.user.email);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [checkAdmin]);

  const sendMagicLink = useCallback(async (email: string): Promise<{ error: string | null }> => {
    if (!supabase) return { error: "Supabase isn't configured." };
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + "/" },
    });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  const value: AuthValue = { configured: supabaseConfigured, loading, session, isAdmin, sendMagicLink, signOut };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
