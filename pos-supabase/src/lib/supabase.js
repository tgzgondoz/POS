import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('Missing REACT_APP_SUPABASE_URL in .env file')
}

if (!supabaseAnonKey) {
  throw new Error('Missing REACT_APP_SUPABASE_ANON_KEY in .env file')
}

// Remove any trailing slashes
const cleanUrl = supabaseUrl.replace(/\/$/, '')

console.log('Supabase URL:', cleanUrl)
console.log('Supabase Key (first 10 chars):', supabaseAnonKey.substring(0, 10) + '...')

export const supabase = createClient(cleanUrl, supabaseAnonKey)