
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTokens() {
  console.log('Checking tokens table...');
  const { data, error } = await supabase.from('tokens').select('*').limit(5);

  if (error) {
    console.error('Error fetching tokens:', error);
  } else {
    console.log('Tokens found:', data);
  }
}

checkTokens();
