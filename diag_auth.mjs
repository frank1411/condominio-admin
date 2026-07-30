import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

console.log('--- Supabase Auth Diagnostic ---');

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing credentials in .env');
  process.exit(1);
}

console.log(`URL Length: ${SUPABASE_URL.length}`);
console.log(`Key Length: ${SUPABASE_SERVICE_KEY.length}`);
console.log(`Key starts with: ${SUPABASE_SERVICE_KEY.slice(0, 10)}`);
console.log(`Key ends with: ${SUPABASE_SERVICE_KEY.slice(-10)}`);

// Check for trailing/leading spaces
if (SUPABASE_SERVICE_KEY !== SUPABASE_SERVICE_KEY.trim()) {
  console.warn('⚠️ WARNING: SUPABASE_SERVICE_KEY has leading or trailing whitespace!');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testAdminAccess() {
  try {
    console.log('Testing administrative access (listing users)...');
    const { data, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error(`❌ Admin access failed: ${error.message}`);
    } else {
      console.log(`✅ Admin access SUCCESS! Found ${data.users.length} users.`);
    }
  } catch (err) {
    console.error(`❌ Unexpected error: ${err.message}`);
  }
}

testAdminAccess();
