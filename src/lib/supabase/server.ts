import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseBrowserConfig } from '@/lib/supabase/public-env'

export async function createClient() {
  const cookieStore = await cookies()
  const { url, anonKey } = getSupabaseBrowserConfig()
  return createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

export async function createServiceClient() {
  const cookieStore = await cookies()
  const { url } = getSupabaseBrowserConfig()
  return createServerClient(
    url,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
