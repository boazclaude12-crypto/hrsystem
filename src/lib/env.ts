/**
 * Reads the public Supabase env vars, failing with a message that names what is
 * missing rather than an opaque fetch error deep inside the client.
 */
export function requireSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const missing = [
    !url && "NEXT_PUBLIC_SUPABASE_URL",
    !anonKey && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ].filter(Boolean);

  if (missing.length) {
    throw new Error(
      `Missing environment variable(s): ${missing.join(", ")}. ` +
        "Copy .env.example to .env.local and fill in your Supabase project values.",
    );
  }

  return { url: url!, anonKey: anonKey! };
}

export function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
}
