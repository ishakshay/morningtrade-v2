import { createClient } from '@supabase/supabase-js';

var supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

export default supabase;
