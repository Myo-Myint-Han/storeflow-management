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
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  // ⚡ KEY FIX: Start with loading=FALSE so page loads immediately
  const [loading, setLoading] = useState(false);
  const supabaseRef = useRef(createClient());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const supabase = supabaseRef.current;

    // ⚡ Load auth in background WITHOUT blocking
    const initAuth = async () => {
      try {
        console.log("🔵 Auth: Starting background check...");

        // Get session (let it take as long as needed)
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("❌ Auth: Session error:", error);
          return;
        }

        if (!mountedRef.current) return;

        console.log("✅ Auth: Session loaded", !!session);
        setUser(session?.user ?? null);

        // Fetch profile if user exists
        if (session?.user) {
          try {
            const { data, error: profileError } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", session.user.id)
              .single();

            if (profileError) {
              console.error("❌ Auth: Profile error:", profileError);
              return;
            }

            if (mountedRef.current) {
              console.log("✅ Auth: Profile loaded");
              setProfile(data);
            }
          } catch (error) {
            console.error("❌ Auth: Profile fetch failed:", error);
          }
        }
      } catch (error) {
        console.error("❌ Auth: Init failed:", error);
      }
    };

    // Start in background - doesn't block rendering
    initAuth();

    // Auth state subscription
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔵 Auth: State changed:", event);

      if (!mountedRef.current) return;

      setUser(session?.user ?? null);

      if (session?.user) {
        try {
          const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();

          if (mountedRef.current) {
            setProfile(data);
          }
        } catch (error) {
          console.error("❌ Auth: Profile update failed:", error);
        }
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

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
