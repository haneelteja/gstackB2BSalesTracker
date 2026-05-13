/**
 * Project URL + browser-safe Supabase key for SSR / client.
 * Supports legacy anon JWT (NEXT_PUBLIC_SUPABASE_ANON_KEY) or new publishable keys.
 */
export function getSupabaseBrowserConfig(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )?.trim()

  if (!url || !anonKey) {
    const missing: string[] = []
    if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL')
    if (!anonKey) {
      missing.push(
        'NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
      )
    }
    const where =
      process.env.NODE_ENV === 'development'
        ? ' Add them to .env.local next to package.json, then restart the dev server.'
        : ' Add them in Vercel → Project → Settings → Environment Variables (Production + Preview), then Redeploy.'
    throw new Error(`Supabase is misconfigured. Missing: ${missing.join(', ')}.${where}`)
  }

  return { url, anonKey }
}
