import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const parsedUrl = new URL(supabaseUrl);

  // Passwords are handed directly to Supabase Auth. Refuse an insecure Auth
  // endpoint outside local development so that credentials are always
  // protected in transit by TLS.
  if (
    parsedUrl.protocol !== "https:" &&
    parsedUrl.hostname !== "localhost" &&
    parsedUrl.hostname !== "127.0.0.1"
  ) {
    throw new Error("Supabase Auth must use an HTTPS URL");
  }

  return createBrowserClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
