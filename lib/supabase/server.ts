import { createClient } from '@supabase/supabase-js'

export const createServerClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  console.log('Server Supabase URL (from env):', supabaseUrl)
  console.log('Server Supabase Anon Key (from env):', supabaseAnonKey)

  return createClient(
    supabaseUrl,
    supabaseAnonKey
  )
} 