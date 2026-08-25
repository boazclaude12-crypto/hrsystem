"use client";

import { createBrowserClient } from "@supabase/ssr";

import { requireSupabaseEnv } from "@/lib/env";

/** Supabase client for use inside client components. */
export function createClient() {
  const { url, anonKey } = requireSupabaseEnv();
  return createBrowserClient(url, anonKey);
}
