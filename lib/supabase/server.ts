import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Built lazily, on first actual use, rather than at module import time.
// Every API route imports this module, so an eager createClient() call here
// would throw as soon as the module loads if the env vars aren't present in
// a given deployment's scope — which fails the whole Next.js build during
// "Collecting page data" (it imports every route to analyze it, even though
// these are all force-dynamic and never invoked at build time). Deferring
// construction until a request handler actually calls e.g. `.from(...)`
// means a missing env var only breaks the specific request that needs it,
// not the build.
let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    }
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

export const supabaseServer = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver);
  },
});
