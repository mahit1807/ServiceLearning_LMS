const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const isConfigured = Boolean(supabaseUrl && supabaseServiceKey && !supabaseUrl.includes('placeholder'));

if (!isConfigured) {
  console.warn('⚠️  WARNING: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set.');
  console.warn('   Running backend in demo mock mode.');
}

// Use a placeholder URL so the server can still start (API calls will use mock data when not configured)
const supabase = createClient(
  isConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isConfigured ? supabaseServiceKey : 'placeholder-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

supabase.isConfigured = isConfigured;

module.exports = supabase;
