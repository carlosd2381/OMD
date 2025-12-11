
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jtvsadywmqjkcaxvtarz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0dnNhZHl3bXFqa2NheHZ0YXJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NzIzMDcsImV4cCI6MjA4MDU0ODMwN30.rVCpagaz-WVdybzb5gm-OsASiNtFJD3eywhGOdPh2_g';

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
