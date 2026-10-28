import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Sin variables configuradas la app sigue abriendo (útil para diseñar
// pantallas), pero no puede leer ni guardar reportes.
export const supabase = url && anonKey ? createClient(url, anonKey) : null
