// Diagnostic script to find the source of "Tenant or user not found" error
// This will query the database for functions, triggers, and check tenant relationships

const { Client } = require('pg');

const dbConfig = {
  host: process.env.DB_HOST || 'codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'Summit',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Stacey1122',
  ssl: {
    rejectUnauthorized: false
  }
};

async function diagnoseTenantError() {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    
    console.log('='.repeat(60));
    console.log('DIAGNOSING "Tenant or user not found" ERROR');
    console.log('='.repeat(60) + '\n');
    
    // 1. Check if tenants table exists
    console.log('1️⃣  Checking for tenants table...');
    const tenantsTable = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name ILIKE '%tenant%'
    `);
    
    if (tenantsTable.rows.length > 0) {
      console.log('   ✅ Found tenant-related tables:');
      tenantsTable.rows.forEach(row => console.log(`      • ${row.table_name}`));
    } else {
      console.log('   ⚠️  No tenant-related tables found');
    }
    console.log('');
    
    // 2. Check for user_tenants or similar relationship table
    console.log('2️⃣  Checking for user-tenant relationship tables...');
    const userTenantTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name ILIKE '%user%tenant%' OR table_name ILIKE '%tenant%user%')
    `);
    
    if (userTenantTables.rows.length > 0) {
      console.log('   ✅ Found relationship tables:');
      userTenantTables.rows.forEach(row => console.log(`      • ${row.table_name}`));
      
      // Check the structure
      for (const row of userTenantTables.rows) {
        const columns = await client.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = $1
          ORDER BY ordinal_position
        `, [row.table_name]);
        console.log(`      Columns in ${row.table_name}:`);
        columns.rows.forEach(col => console.log(`        - ${col.column_name} (${col.data_type})`));
      }
    } else {
      console.log('   ⚠️  No user-tenant relationship tables found');
    }
    console.log('');
    
    // 3. Check for functions that might throw this error
    console.log('3️⃣  Checking for database functions...');
    const functions = await client.query(`
      SELECT 
        p.proname AS function_name,
        pg_get_functiondef(p.oid) AS function_definition
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
      AND (
        p.proname ILIKE '%tenant%' 
        OR p.proname ILIKE '%validate%' 
        OR p.proname ILIKE '%check%'
        OR pg_get_functiondef(p.oid) ILIKE '%tenant%user%not%found%'
        OR pg_get_functiondef(p.oid) ILIKE '%Tenant or user not found%'
      )
      ORDER BY p.proname
    `);
    
    if (functions.rows.length > 0) {
      console.log('   ✅ Found relevant functions:');
      functions.rows.forEach(row => {
        console.log(`      • ${row.function_name}`);
        // Check if it contains the error message
        if (row.function_definition.includes('Tenant or user not found') || 
            row.function_definition.includes('tenant') && row.function_definition.includes('user') && row.function_definition.includes('not found')) {
          console.log(`        ⚠️  This function might throw the error!`);
          // Show a snippet
          const lines = row.function_definition.split('\n');
          const relevantLines = lines.filter(l => 
            l.toLowerCase().includes('tenant') || 
            l.toLowerCase().includes('raise') || 
            l.toLowerCase().includes('exception')
          );
          if (relevantLines.length > 0) {
            console.log('        Relevant code:');
            relevantLines.slice(0, 5).forEach(l => console.log(`          ${l.trim()}`));
          }
        }
      });
    } else {
      console.log('   ⚠️  No tenant-related functions found');
    }
    console.log('');
    
    // 4. Check for triggers
    console.log('4️⃣  Checking for triggers...');
    const triggers = await client.query(`
      SELECT 
        t.tgname AS trigger_name,
        c.relname AS table_name,
        p.proname AS function_name
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_proc p ON t.tgfoid = p.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'public'
      AND t.tgname NOT LIKE 'pg_%'
      AND (p.proname ILIKE '%tenant%' OR c.relname ILIKE '%tenant%')
    `);
    
    if (triggers.rows.length > 0) {
      console.log('   ✅ Found tenant-related triggers:');
      triggers.rows.forEach(row => {
        console.log(`      • ${row.trigger_name} on ${row.table_name} (calls ${row.function_name})`);
      });
    } else {
      console.log('   ⚠️  No tenant-related triggers found');
    }
    console.log('');
    
    // 5. Check for RLS policies
    console.log('5️⃣  Checking for Row Level Security policies...');
    const policies = await client.query(`
      SELECT 
        tablename,
        policyname,
        cmd,
        qual::text as policy_condition
      FROM pg_policies
      WHERE schemaname = 'public'
      AND (qual::text ILIKE '%tenant%' OR with_check::text ILIKE '%tenant%')
    `);
    
    if (policies.rows.length > 0) {
      console.log('   ✅ Found tenant-related RLS policies:');
      policies.rows.forEach(row => {
        console.log(`      • ${row.policyname} on ${row.tablename} (${row.cmd})`);
        if (row.policy_condition) {
          console.log(`        Condition: ${row.policy_condition.substring(0, 100)}...`);
        }
      });
    } else {
      console.log('   ⚠️  No tenant-related RLS policies found');
    }
    console.log('');
    
    // 6. Check if user and tenant exist and their relationship
    console.log('6️⃣  Checking user-tenant relationship...');
    const userId = '44718f1f-7d91-4506-baa8-9e78ca2a8d68';
    const tenantId = '419d85e1-1766-4a42-b5e6-84ef72dca7db';
    
    // Check if user exists
    const userCheck = await client.query('SELECT id, email FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length > 0) {
      console.log(`   ✅ User exists: ${userCheck.rows[0].email} (${userCheck.rows[0].id})`);
    } else {
      console.log(`   ❌ User NOT found: ${userId}`);
    }
    
    // Check if tenant exists (if tenants table exists)
    if (tenantsTable.rows.length > 0) {
      const tenantCheck = await client.query(`SELECT id FROM ${tenantsTable.rows[0].table_name} WHERE id = $1`, [tenantId]);
      if (tenantCheck.rows.length > 0) {
        console.log(`   ✅ Tenant exists: ${tenantId}`);
      } else {
        console.log(`   ❌ Tenant NOT found: ${tenantId}`);
      }
      
      // Check user-tenant relationship
      if (userTenantTables.rows.length > 0) {
        const relTable = userTenantTables.rows[0].table_name;
        const relCheck = await client.query(`
          SELECT * FROM ${relTable} 
          WHERE user_id = $1 AND tenant_id = $2
        `, [userId, tenantId]);
        
        if (relCheck.rows.length > 0) {
          console.log(`   ✅ User-tenant relationship exists in ${relTable}`);
        } else {
          console.log(`   ❌ User-tenant relationship NOT found in ${relTable}`);
          console.log(`      This might be the issue! The user and tenant exist, but they're not linked.`);
        }
      }
    }
    console.log('');
    
    // 7. Check for session variables or settings
    console.log('7️⃣  Checking for session variables that might be needed...');
    const sessionVars = await client.query(`
      SELECT name, setting 
      FROM pg_settings 
      WHERE name ILIKE '%tenant%' OR name ILIKE '%app%'
    `);
    
    if (sessionVars.rows.length > 0) {
      console.log('   ✅ Found relevant session settings:');
      sessionVars.rows.forEach(row => {
        console.log(`      • ${row.name} = ${row.setting}`);
      });
    } else {
      console.log('   ⚠️  No tenant-related session variables found');
      console.log('      However, functions might use current_setting() to get tenant_id');
    }
    console.log('');
    
    console.log('='.repeat(60));
    console.log('DIAGNOSIS COMPLETE');
    console.log('='.repeat(60));
    console.log('\n💡 Next steps:');
    console.log('   1. If a user-tenant relationship table exists, ensure the user is linked to the tenant');
    console.log('   2. If functions require tenant_id, set it before queries: SET LOCAL app.tenant_id = \'...\'');
    console.log('   3. Check the function definitions above to see what validation they perform\n');
    
  } catch (error) {
    console.error('❌ Error during diagnosis:', error.message);
    if (error.detail) console.error('   Details:', error.detail);
    process.exit(1);
  } finally {
    await client.end();
  }
}

diagnoseTenantError();

