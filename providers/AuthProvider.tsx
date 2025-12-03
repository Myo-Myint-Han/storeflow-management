"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/types/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  // 🚀 CRITICAL FIX: Start with loading=false to render immediately
  const [loading, setLoading] = useState(false);
  const supabaseRef = useRef(createClient());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const supabase = supabaseRef.current;

    const initAuth = async () => {
      try {
        // 🚀 Don't block UI - load in background
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error || !session) {
          return;
        }

        if (!mountedRef.current) return;

        setUser(session.user);

        // 🚀 Load profile in background (non-blocking)
        if (session.user) {
          const fetchProfile = async () => {
            try {
              const { data } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", session.user.id)
                .single();

              if (mountedRef.current && data) {
                setProfile(data);
              }
            } catch (error) {
              console.error("Profile fetch failed:", error);
            }
          };

          fetchProfile();
        }
      } catch (error) {
        console.error("Auth init failed:", error);
      }
    };

    // 🚀 Run in background, don't await
    initAuth();

    // Auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mountedRef.current) return;

      setUser(session?.user ?? null);

      if (session?.user) {
        // Load profile in background
        const fetchProfile = async () => {
          try {
            const { data } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", session.user.id)
              .single();

            if (mountedRef.current && data) {
              setProfile(data);
            }
          } catch (error) {
            console.error("Profile update failed:", error);
          }
        };

        fetchProfile();
      } else {
        setProfile(null);
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const supabase = supabaseRef.current;
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        setUser(data.user);

        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single();

        setProfile(profileData);
      }
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    const supabase = supabaseRef.current;
    setLoading(true);

    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    profile,
    loading,
    isAuthenticated: !!user && !!profile,
    signIn,
    signOut,
  };

  // 🚀 CRITICAL: Always render children immediately
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
