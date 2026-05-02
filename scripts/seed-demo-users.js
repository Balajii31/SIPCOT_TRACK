const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DEMO_USERS = [
  {
    email:     'industry@sipcot.demo',
    password:  'Demo@1234',
    full_name: 'Ravi Industries (Demo)',
    role:      'industry',
    status:    'active',
    industry_name: 'Ravi Steel Ltd',
    allottee_code: 'SIPCOT-DEMO-001',
  },
  {
    email:     'official@sipcot.demo',
    password:  'Demo@1234',
    full_name: 'Kumar Official (Demo)',
    role:      'official',
    status:    'active',          // pre-approved for demo
    district:  'Chengalpattu',
    department:'Environment Monitoring',
  },
  {
    email:    'admin@sipcot.demo',
    password: 'Demo@1234',
    full_name:'Admin HQ (Demo)',
    role:     'admin',
    status:   'active',
  },
];

async function seed() {
  console.log('\n🌱  Seeding SIPCOT TRACK demo accounts...\n');

  for (const u of DEMO_USERS) {
    // 1. Create auth user (service role bypasses email confirmation)
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email:            u.email,
      password:         u.password,
      email_confirm:    true,
      user_metadata: {
        full_name: u.full_name,
        role:      u.role,
      },
    });

    if (authErr) {
      if (authErr.message.includes('already been registered')) {
        console.log(`⚠  ${u.email} already exists — skipping auth creation`);
        // Still upsert profile below
      } else {
        console.error(`✗  Failed to create ${u.email}: ${authErr.message}`);
        continue;
      }
    }

    const userId = authData?.user?.id;

    // If user already existed, look up their id
    let resolvedId = userId;
    if (!resolvedId) {
      const { data: list } = await supabase.auth.admin.listUsers();
      const existing = list?.users?.find(usr => usr.email === u.email);
      resolvedId = existing?.id;
    }

    if (!resolvedId) {
      console.error(`✗  Could not resolve ID for ${u.email}`);
      continue;
    }

    // 2. Upsert into profiles table
    const { error: profileErr } = await supabase.from('profiles').upsert({
      id:            resolvedId,
      email:         u.email,
      full_name:     u.full_name,
      role:          u.role,
      status:        u.status,
      industry_name: u.industry_name ?? null,
      allottee_code: u.allottee_code ?? null,
      district:      u.district    ?? null,
      department:    u.department  ?? null,
    }, { onConflict: 'id' });

    if (profileErr) {
      console.error(`✗  Profile error for ${u.email}: ${profileErr.message}`);
    } else {
      console.log(`✅  ${u.role.toUpperCase().padEnd(10)} → ${u.email}  (password: Demo@1234)`);
    }
  }

  console.log('\n📋  Demo Account Summary:');
  console.log('─'.repeat(55));
  console.log('  Role       │ Email                    │ Password');
  console.log('─'.repeat(55));
  for (const u of DEMO_USERS) {
    console.log(`  ${u.role.padEnd(10)} │ ${u.email.padEnd(25)} │ Demo@1234`);
  }
  console.log('─'.repeat(55));
  console.log('\n  Login at: http://localhost:3000/login\n');
}

seed().catch(console.error);
