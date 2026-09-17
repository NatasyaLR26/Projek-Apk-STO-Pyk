require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'placeholder-anon-key';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.warn('[Peringatan] SUPABASE_URL atau SUPABASE_KEY belum diisi di .env. Minta file .env ke penanggung jawab Supabase.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;