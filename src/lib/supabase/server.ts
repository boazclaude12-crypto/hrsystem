import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

import { requireSupabaseEnv } from "@/lib/env";

/**
 * Supabase client bound to the request's cookies, so RLS runs as the signed-in
 * user. Server components can only read cookies, so writes are swallowed there
 * and refreshed by the middleware instead.
 */
export async function createClient() {
  const { url, anonKey } = requireSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a server component; middleware refreshes the session.
        }
      },
    },
  });
}
