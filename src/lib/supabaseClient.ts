import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function build(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const missing = [
    url ? null : 'NEXT_PUBLIC_SUPABASE_URL',
    anonKey ? null : 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ].filter(Boolean)

  if (missing.length > 0) {
    throw new Error(
      `Supabase is not configured: ${missing.join(' and ')} ${missing.length > 1 ? 'are' : 'is'} missing. ` +
      'Set it in .env.local when working locally, or in the Vercel project settings ' +
      'with Production, Preview and Development all ticked, then redeploy.'
    )
  }

  return createClient(url as string, anonKey as string, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true, // handles magic-link redirects
    },
  })
}

let client: SupabaseClient | null = null

function instance(): SupabaseClient {
  if (!client) client = build()
  return client
}

/**
 * The shared browser client, built on first use rather than on import.
 *
 * Next.js prerenders the static pages at build time, and doing so imports
 * this module. Building the client there used to fail the whole build with
 * `supabaseUrl is required` whenever the environment variables were absent
 * on the build machine, even though no prerendered page talks to Supabase.
 * Deferring keeps the build working and moves the failure to the moment
 * something actually needs the client, where the message can name the
 * variable that is missing.
 *
 * The proxy keeps `import { supabase }` working unchanged at every call
 * site. Methods are bound to the real client so `this` stays correct.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const self = instance()
    const value = (self as unknown as Record<string | symbol, unknown>)[prop]
    return typeof value === 'function' ? value.bind(self) : value
  },
  set(_target, prop, value) {
    const self = instance() as unknown as Record<string | symbol, unknown>
    self[prop] = value
    return true
  },
  has(_target, prop) {
    return prop in (instance() as unknown as object)
  },
  getPrototypeOf() {
    return Object.getPrototypeOf(instance())
  },
})
