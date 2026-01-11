// Data Migration Script: RDS to Supabase
// This script migrates data from RDS PostgreSQL to Supabase

const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// RDS Connection (source)
const rdsClient = new Client({
  host: process.env.RDS_HOST || 'summit-db.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com',
  port: parseInt(process.env.RDS_PORT || '5432'),
  database: process.env.RDS_DB_NAME || 'Summit',
  user: process.env.RDS_USER || 'postgres',
  password: process.env.RDS_PASSWORD || 'Stacey1122',
  ssl: { rejectUnauthorized: false }
});

// Supabase Connection (destination)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateTable(tableName, transformFn = null) {
  console.log(`\n📦 Migrating ${tableName}...`);
  
  try {
    // Fetch from RDS
    const result = await rdsClient.query(`SELECT * FROM ${tableName}`);
    const rows = result.rows;
    
    if (rows.length === 0) {
      console.log(`  ⚠️  No data in ${tableName}`);
      return;
    }
    
    console.log(`  Found ${rows.length} rows`);
    
    // Transform if needed
    const data = transformFn ? rows.map(transformFn) : rows;
    
    // Insert into Supabase in batches
    const batchSize = 100;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const { error } = await supabase.from(tableName).insert(batch);
      
      if (error) {
        console.error(`  ❌ Error inserting batch ${i / batchSize + 1}:`, error.message);
        // Try inserting one by one to find the problematic row
        for (const row of batch) {
          const { error: singleError } = await supabase.from(tableName).insert(row);
          if (singleError) {
            console.error(`    Failed row:`, row);
            console.error(`    Error:`, singleError.message);
          }
        }
      } else {
        console.log(`  ✅ Inserted batch ${i / batchSize + 1} (${batch.length} rows)`);
      }
    }
    
    console.log(`  ✅ ${tableName} migration complete`);
  } catch (error) {
    console.error(`  ❌ Error migrating ${tableName}:`, error.message);
  }
}

async function migrate() {
  console.log('🚀 Starting RDS to Supabase data migration...\n');
  
  try {
    // Connect to RDS
    console.log('📡 Connecting to RDS...');
    await rdsClient.connect();
    console.log('✅ Connected to RDS\n');
    
    // Migrate tables in order (respecting foreign keys)
    await migrateTable('users');
    await migrateTable('chats');
    await migrateTable('chat_participants');
    await migrateTable('meetings');
    await migrateTable('meeting_participants');
    await migrateTable('meeting_invitations');
    await migrateTable('chat_requests');
    await migrateTable('messages');
    await migrateTable('message_reads');
    await migrateTable('presence');
    
    console.log('\n✅ Migration completed!');
    console.log('\n⚠️  Next steps:');
    console.log('  1. Verify data in Supabase dashboard');
    console.log('  2. Test all endpoints');
    console.log('  3. Update environment variables');
    console.log('  4. Deploy updated backend');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await rdsClient.end();
  }
}

// Run migration
migrate();

