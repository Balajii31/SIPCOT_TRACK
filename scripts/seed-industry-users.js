const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const INDUSTRIES = [
  { name: 'TVS Motors', email: 'tvs@sipcot.demo', code: 'HOS-001' },
  { name: 'Titan Company', email: 'titan@sipcot.demo', code: 'HOS-002' },
  { name: 'Hyundai India', email: 'hyundai@sipcot.demo', code: 'SPB-010' },
  { name: 'Nokia Solutions', email: 'nokia@sipcot.demo', code: 'SPB-011' },
  { name: 'Daimler Trucks', email: 'daimler@sipcot.demo', code: 'ORG-005' },
  { name: 'Renault Nissan', email: 'renault@sipcot.demo', code: 'ORG-006' },
  { name: 'LMW Textiles', email: 'lmw@sipcot.demo', code: 'CBE-020' },
  { name: 'TVS Srichakra', email: 'srichakra@sipcot.demo', code: 'MDU-015' },
  { name: 'Brakes India', email: 'brakes@sipcot.demo', code: 'RAN-008' },
  { name: 'Asian Paints', email: 'asianpaints@sipcot.demo', code: 'CUD-012' }
];

async function seed() {
  console.log('\n🔐 Generating Industry-Specific Login Accounts...\n');

  for (const ind of INDUSTRIES) {
    // 1. Create Auth User
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: ind.email,
      password: 'Demo@1234',
      email_confirm: true,
      user_metadata: {
        full_name: ind.name,
        role: 'industry'
      }
    });

    let userId;
    if (authErr) {
      if (authErr.message.includes('already been registered')) {
        const { data: list } = await supabase.auth.admin.listUsers();
        userId = list.users.find(u => u.email === ind.email)?.id;
      } else {
        console.error(`✗ Error creating ${ind.email}: ${authErr.message}`);
        continue;
      }
    } else {
      userId = authData.user.id;
    }

    // 2. Sync to public.users (legacy) and public.profiles
    await supabase.from('users').upsert({
      id: userId,
      email: ind.email,
      full_name: ind.name,
      role: 'industry',
      status: 'approved'
    });

    await supabase.from('profiles').upsert({
      id: userId,
      email: ind.email,
      full_name: ind.name,
      role: 'industry',
      status: 'active',
      industry_name: ind.name,
      allottee_code: ind.code
    });

    // 3. Link to industries table
    const { error: linkErr } = await supabase
      .from('industries')
      .update({ user_id: userId })
      .eq('allottee_code', ind.code);

    if (linkErr) {
      console.error(`✗ Error linking ${ind.name}: ${linkErr.message}`);
    } else {
      console.log(`✅  ${ind.name.padEnd(20)} │ Login: ${ind.email} │ Password: Demo@1234`);
    }
  }

  console.log('\n✨ Industry accounts ready. You can now log in as any specific company.');
}

seed().catch(console.error);
