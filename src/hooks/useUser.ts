"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

// Exposes the current Supabase auth user client-side.
//
// OFFLINE SAFE: supabase.auth.getUser() asks the server to validate the token,
// which fails without internet and used to make the whole UI render nothing.
// So we (1) show the last known user from local storage immediately,
// (2) read the session stored on the device (no network), and (3) only when
// online, confirm with the server and update/clear the cached user.
const CACHED_USER_KEY = "um-cached-user";

function readCachedUser(): User | null {
  try {
    const raw = localStorage.getItem(CACHED_USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function writeCachedUser(user: User | null) {
  try {
    if (user) localStorage.setItem(CACHED_USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(CACHED_USER_KEY);
  } catch {
    // storage unavailable: ignore
  }
}

export function clearCachedUser() {
  writeCachedUser(null);
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const cached = readCachedUser();
    if (cached) {
      setUser(cached);
      setLoading(false);
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled) return;
        const sessionUser = data.session?.user ?? null;
        if (sessionUser) {
          setUser(sessionUser);
          writeCachedUser(sessionUser);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    if (navigator.onLine) {
      supabase.auth
        .getUser()
        .then(({ data, error }) => {
          if (cancelled) return;
          if (data.user) {
            setUser(data.user);
            writeCachedUser(data.user);
            return;
          }
          const status = (error as { status?: number } | null)?.status;
          if (error?.name === "AuthSessionMissingError" || status === 401 || status === 403) {
            setUser(null);
            writeCachedUser(null);
          }
        })
        .catch(() => undefined);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        writeCachedUser(session.user);
      } else if (event === "SIGNED_OUT" && navigator.onLine) {
        setUser(null);
        writeCachedUser(null);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
