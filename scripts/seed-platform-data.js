const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const INDUSTRIES = [
  { name: 'TVS Motors', sector: 'Automobile', allottee: 'HOS-001', park_name: 'Hosur Industrial Estate I' },
  { name: 'Titan Company', sector: 'Watches & Jewelry', allottee: 'HOS-002', park_name: 'Hosur Industrial Estate II' },
  { name: 'Hyundai India', sector: 'Automobile', allottee: 'SPB-010', park_name: 'Sriperumbudur Industrial Park' },
  { name: 'Nokia Solutions', sector: 'Electronics', allottee: 'SPB-011', park_name: 'Sriperumbudur Industrial Park' },
  { name: 'Daimler Trucks', sector: 'Automobile', allottee: 'ORG-005', park_name: 'Oragadam Industrial Corridor' },
  { name: 'Renault Nissan', sector: 'Automobile', allottee: 'ORG-006', park_name: 'Oragadam Industrial Corridor' },
  { name: 'LMW Textiles', sector: 'Textiles', allottee: 'CBE-020', park_name: 'Coimbatore SIDCO Estate' },
  { name: 'TVS Srichakra', sector: 'Rubber', allottee: 'MDU-015', park_name: 'Madurai Industrial Estate' },
  { name: 'Brakes India', sector: 'Foundry', allottee: 'RAN-008', park_name: 'Ranipet Industrial Park' },
  { name: 'Asian Paints', sector: 'Chemicals', allottee: 'CUD-012', park_name: 'Cuddalore SIPCOT Complex' },
  { name: 'Ravi Steel Ltd', sector: 'Steel', allottee: 'SIPCOT-DEMO-001', park_name: 'Hosur Industrial Estate I' }
];

async function seed() {
  console.log('\n🚀 Seeding SIPCOT TRACK Platform Data (10 Major Industries)...\n');

  // 1. Fetch Parks to map names to IDs
  const { data: parks } = await supabase.from('parks').select('id, name');
  if (!parks || parks.length === 0) {
    console.error('✗ No parks found in database. Run init schema first.');
    return;
  }
  const parkMap = Object.fromEntries(parks.map(p => [p.name, p.id]));

  for (const ind of INDUSTRIES) {
    const parkId = parkMap[ind.park_name];
    if (!parkId) {
      console.warn(`⚠ Skipping ${ind.name}: Park "${ind.park_name}" not found.`);
      continue;
    }

    // 2. Insert Industry
    const { data: indData, error: indErr } = await supabase
      .from('industries')
      .upsert({
        name: ind.name,
        sector: ind.sector,
        allottee_code: ind.allottee,
        park_id: parkId,
        contact_person: 'Facility Manager',
        contact_email: `contact@${ind.name.toLowerCase().replace(/\s+/g, '')}.com`,
        is_active: true
      }, { onConflict: 'allottee_code' })
      .select('id')
      .single();

    if (indErr) {
      console.error(`✗ Failed to seed industry ${ind.name}: ${indErr.message}`);
      continue;
    }

    const industryId = indData.id;

    // 3. Seed 3 months of reports for each industry
    const months = [1, 2, 3]; // Jan, Feb, Mar
    for (const month of months) {
      const { error: repErr } = await supabase
        .from('monthly_reports')
        .upsert({
          industry_id: industryId,
          month,
          year: 2024,
          investment_cr: (Math.random() * 50 + 10).toFixed(2),
          turnover_cr: (Math.random() * 100 + 20).toFixed(2),
          emp_male: Math.floor(Math.random() * 500 + 100),
          emp_female: Math.floor(Math.random() * 300 + 50),
          emp_contractual: Math.floor(Math.random() * 200 + 20),
          water_kld: (Math.random() * 1200 + 50).toFixed(2), // Some will trigger alert
          power_kwh: (Math.random() * 50000 + 10000).toFixed(2),
          csr_spend_lakhs: (Math.random() * 10).toFixed(2),
          csr_activity: 'Local community development and school support.',
          status: 'approved',
          submitted_at: new Date(2024, month - 1, 15).toISOString(),
          verified_at: new Date(2024, month - 1, 20).toISOString()
        }, { onConflict: 'industry_id,month,year' });

      if (repErr) {
        console.error(`  ✗ Report error for ${ind.name} (M${month}): ${repErr.message}`);
      }
    }

    console.log(`✅ Seeded ${ind.name} in ${ind.park_name}`);
  }

  console.log('\n✨ Platform seeding complete. All 10 SIPCOT parks now have active industries and reporting data.');
}

seed().catch(console.error);
