// Simple script to find tenant validation - uses direct SQL queries
// Run from server directory where .env is available

import { Pool } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from server directory
dotenv.config({ path: join(__dirname, '.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'Summit',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Stacey1122',
  ssl: {
    rejectUnauthorized: false
  }
});

async function findTenantFunction() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Searching for tenant validation function...\n');
    
    // Set tenant context using set_config (works at session level, not just transaction)
    const fallbackTenantId = '419d85e1-1766-4a42-b5e6-84ef72dca7db';
    
    try {
      await client.query("SELECT set_config('app.tenant_id', $1, false)", [fallbackTenantId]);
      console.log('✅ Set app.tenant_id session variable\n');
    } catch (e) {
      console.log('⚠️  Could not set app.tenant_id:', e.message);
    }
    
    try {
      await client.query("SELECT set_config('tenant_id', $1, false)", [fallbackTenantId]);
      console.log('✅ Set tenant_id session variable\n');
    } catch (e) {
      console.log('⚠️  Could not set tenant_id:', e.message);
    }
    
    // Query system catalog directly - this should bypass any user triggers
    // Get function names and OIDs first
    console.log('📋 Querying system catalog for functions...\n');
    
    const functions = await client.query(`
      SELECT 
        p.proname AS function_name,
        n.nspname AS schema_name,
        p.oid
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
      ORDER BY p.proname
    `);
    
    console.log(`Found ${functions.rows.length} functions in public schema\n`);
    console.log('Checking function definitions...\n');
    
    const tenantFunctions = [];
    
    for (const func of functions.rows) {
      try {
        // Get function source code
        const defResult = await client.query(`
          SELECT pg_get_functiondef($1) AS definition
        `, [func.oid]);
        
        const definition = defResult.rows[0]?.definition || '';
        const lowerDef = definition.toLowerCase();
        
        // Check if it contains tenant validation
        if (lowerDef.includes('tenant') && (
          lowerDef.includes('user not found') ||
          lowerDef.includes('raise') && lowerDef.includes('exception')
        )) {
          tenantFunctions.push({
            name: func.function_name,
            schema: func.schema_name,
            definition: definition
          });
          console.log(`✅ Found: ${func.schema_name}.${func.function_name}`);
        }
      } catch (e) {
        // Skip functions that error
        if (!e.message.includes('Tenant or user not found')) {
          // Only log non-tenant errors
          console.log(`⚠️  Error checking ${func.function_name}: ${e.message.substring(0, 50)}`);
        }
      }
    }
    
    if (tenantFunctions.length > 0) {
      console.log(`\n✅ Found ${tenantFunctions.length} tenant validation function(s):\n`);
      tenantFunctions.forEach((func, i) => {
        console.log(`${i + 1}. ${func.schema}.${func.name}`);
        console.log('\nDefinition:');
        console.log('─'.repeat(60));
        console.log(func.definition);
        console.log('─'.repeat(60));
        console.log(`\n💡 To remove: DROP FUNCTION IF EXISTS ${func.schema}.${func.name} CASCADE;\n`);
      });
    } else {
      console.log('\n⚠️  No tenant validation functions found in public schema');
      console.log('   The validation might be in a trigger or RLS policy.\n');
      
      // Check triggers
      console.log('Checking triggers...\n');
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
      `);
      
      if (triggers.rows.length > 0) {
        console.log(`Found ${triggers.rows.length} trigger(s). Checking for tenant-related...\n`);
        for (const trigger of triggers.rows) {
          try {
            const funcResult = await client.query(`
              SELECT pg_get_functiondef(p.oid) AS definition
              FROM pg_proc p
              WHERE p.proname = $1
            `, [trigger.function_name]);
            
            const def = funcResult.rows[0]?.definition || '';
            if (def.toLowerCase().includes('tenant')) {
              console.log(`✅ Found tenant trigger: ${trigger.trigger_name} on ${trigger.table_name}`);
              console.log(`   Function: ${trigger.function_name}\n`);
            }
          } catch (e) {
            // Skip
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code) console.error('   Code:', error.code);
    if (error.severity) console.error('   Severity:', error.severity);
  } finally {
    client.release();
    await pool.end();
  }
}

findTenantFunction();

