import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'placeholder-key'



export const supabase = createClient(supabaseUrl, supabaseKey)

// Cache bust: 2025-08-02-23:25 - FORCE RELOAD
window.PFM_VERSION = '1.0.2'