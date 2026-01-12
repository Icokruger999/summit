// Script to find and remove the tenant validation function
// This will identify what's causing "Tenant or user not found" errors

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

async function findAndRemoveTenantValidation() {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    
    console.log('='.repeat(60));
    console.log('FINDING TENANT VALIDATION FUNCTION');
    console.log('='.repeat(60) + '\n');
    
    // Find functions that throw "Tenant or user not found"
    const functions = await client.query(`
      SELECT 
        p.proname AS function_name,
        n.nspname AS schema_name,
        pg_get_functiondef(p.oid) AS function_definition
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE (
        pg_get_functiondef(p.oid) ILIKE '%Tenant or user not found%'
        OR pg_get_functiondef(p.oid) ILIKE '%tenant%user%not%found%'
        OR (pg_get_functiondef(p.oid) ILIKE '%RAISE%' AND pg_get_functiondef(p.oid) ILIKE '%tenant%')
      )
      ORDER BY p.proname
    `);
    
    if (functions.rows.length === 0) {
      console.log('⚠️  No functions found with "Tenant or user not found" message');
      console.log('   Checking for triggers instead...\n');
      
      // Check triggers
      const triggers = await client.query(`
        SELECT 
          t.tgname AS trigger_name,
          c.relname AS table_name,
          p.proname AS function_name,
          pg_get_triggerdef(t.oid) AS trigger_definition,
          pg_get_functiondef(p.oid) AS function_definition
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_proc p ON t.tgfoid = p.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public'
        AND t.tgname NOT LIKE 'pg_%'
        AND (
          pg_get_functiondef(p.oid) ILIKE '%tenant%'
          OR pg_get_triggerdef(t.oid) ILIKE '%tenant%'
        )
      `);
      
      if (triggers.rows.length > 0) {
        console.log('✅ Found triggers with tenant validation:');
        triggers.rows.forEach(row => {
          console.log(`\n   Trigger: ${row.trigger_name}`);
          console.log(`   Table: ${row.table_name}`);
          console.log(`   Function: ${row.function_name}`);
        });
      } else {
        console.log('⚠️  No tenant-related triggers found');
        console.log('\n💡 The validation might be in a different location.');
        console.log('   Try checking for functions that use current_setting() or session variables.\n');
      }
    } else {
      console.log(`✅ Found ${functions.rows.length} function(s) with tenant validation:\n`);
      
      for (const func of functions.rows) {
        console.log(`📋 Function: ${func.function_name}`);
        console.log(`   Schema: ${func.schema_name}`);
        console.log(`\n   Full definition:`);
        console.log('   ' + '─'.repeat(56));
        
        // Show the function definition
        const lines = func.function_definition.split('\n');
        lines.forEach(line => {
          if (line.trim()) {
            console.log('   ' + line);
          }
        });
        console.log('   ' + '─'.repeat(56));
        console.log('');
        
        // Ask if we should remove it
        console.log(`❓ Do you want to remove this function?`);
        console.log(`   Run: DROP FUNCTION IF EXISTS ${func.schema_name}.${func.function_name}() CASCADE;`);
        console.log('');
      }
    }
    
    // Also check for any functions that use app.tenant_id or tenant_id session variables
    console.log('\n' + '='.repeat(60));
    console.log('CHECKING FOR SESSION VARIABLE USAGE');
    console.log('='.repeat(60) + '\n');
    
    const sessionVarFunctions = await client.query(`
      SELECT 
        p.proname AS function_name,
        n.nspname AS schema_name,
        pg_get_functiondef(p.oid) AS function_definition
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE (
        pg_get_functiondef(p.oid) ILIKE '%current_setting%tenant%'
        OR pg_get_functiondef(p.oid) ILIKE '%app.tenant_id%'
        OR pg_get_functiondef(p.oid) ILIKE '%tenant_id%'
      )
      AND pg_get_functiondef(p.oid) NOT ILIKE '%CREATE%FUNCTION%'
      ORDER BY p.proname
    `);
    
    if (sessionVarFunctions.rows.length > 0) {
      console.log(`✅ Found ${sessionVarFunctions.rows.length} function(s) using tenant session variables:\n`);
      sessionVarFunctions.rows.forEach(func => {
        console.log(`   • ${func.schema_name}.${func.function_name}`);
      });
    } else {
      console.log('⚠️  No functions found using tenant session variables');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('RECOMMENDATION');
    console.log('='.repeat(60));
    console.log('\nSince you don\'t need multi-tenancy:');
    console.log('1. Remove or modify the function(s) found above');
    console.log('2. Remove any triggers that call tenant validation');
    console.log('3. Simplify your code to remove tenant_id logic\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

findAndRemoveTenantValidation();

