import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

console.log(`🔍 Debug: SUPABASE_URL ends with: ${SUPABASE_URL?.slice(-10)}`);
console.log(`🔍 Debug: SUPABASE_SERVICE_KEY starts with: ${SUPABASE_SERVICE_KEY?.slice(0, 10)}`);

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoConfirm: true,
  },
});

async function createTestUser(email, password, name, role, apartmentId = null) {
  try {
    console.log(`👤 Creating ${role} user: ${email}...`);

    // 1. Create user in Supabase Auth (auth.users)
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) throw authError;

    const userId = authUser.user.id;

    // 2. Create profile in public.users table
    const { error: dbError } = await supabase
      .from('users')
      .insert({
        openId: userId,
        name: name,
        email: email,
        loginMethod: 'email',
        role: role,
        apartmentId: apartmentId,
        approvalStatus: 'approved',
      });

    if (dbError) throw dbError;

    console.log(`✅ User ${name} created successfully! ID: ${userId}`);
    return { email, password, role, name };
  } catch (error) {
    console.error(`❌ Error creating user ${email}:`, error.message);
    return null;
  }
}

async function main() {
  const usersToCreate = [
    { email: 'admin@test.com', password: 'AdminPassword123!', name: 'Admin Test', role: 'admin' },
    { email: 'residente1@test.com', password: 'ResidentPassword123!', name: 'Residente Uno', role: 'user', apartmentId: 1 },
    { email: 'residente2@test.com', password: 'ResidentPassword123!', name: 'Residente Dos', role: 'user', apartmentId: 2 },
  ];

  console.log('🚀 Starting test user creation...\n');
  const results = [];

  for (const user of usersToCreate) {
    const result = await createTestUser(user.email, user.password, user.name, user.role, user.apartmentId);
    if (result) results.push(result);
  }

  console.log('\n=========================================');
  console.log('📋 CREDENCIALES DE PRUEBA');
  console.log('=========================================');
  results.forEach(u => {
    console.log(`Nombre: ${u.name} (${u.role})`);
    console.log(`Email: ${u.email}`);
    console.log(`Pass:  ${u.password}`);
    console.log('-----------------------------------------');
  });
  console.log('=========================================\n');
}

main().catch(console.error);
