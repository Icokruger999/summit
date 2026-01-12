// Direct connection approach - set tenant context immediately
// Run from server directory where .env is available

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from server directory
dotenv.config({ path: join(__dirname, '.env') });

const fallbackTenantId = '419d85e1-1766-4a42-b5e6-84ef72dca7db';

async function findTenantFunction() {
  const client = new Client({
    host: process.env.DB_HOST || 'codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'Summit',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Stacey1122',
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    console.log('🔌 Connecting to database...\n');
    await client.connect();
    console.log('✅ Connected\n');
    
    // Immediately set tenant context using raw SQL
    // Try multiple methods to ensure one works
    console.log('🔧 Setting tenant context...\n');
    
    const setCommands = [
      `SET app.tenant_id = '${fallbackTenantId}'`,
      `SET tenant_id = '${fallbackTenantId}'`,
      `SELECT set_config('app.tenant_id', '${fallbackTenantId}', false)`,
      `SELECT set_config('tenant_id', '${fallbackTenantId}', false)`
    ];
    
    for (const cmd of setCommands) {
      try {
        await client.query(cmd);
        console.log(`✅ Executed: ${cmd.substring(0, 50)}...`);
      } catch (e) {
        // Continue trying other methods
        console.log(`⚠️  Failed: ${cmd.substring(0, 50)}... (${e.message.substring(0, 30)})`);
      }
    }
    
    console.log('\n🔍 Querying system catalog...\n');
    
    // Query pg_proc directly - get function names and OIDs
    // Use a simple query that shouldn't trigger validation
    const funcList = await client.query(`
      SELECT 
        p.proname AS function_name,
        n.nspname AS schema_name,
        p.oid
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
      ORDER BY p.proname
    `);
    
    console.log(`📋 Found ${funcList.rows.length} functions in public schema\n`);
    
    if (funcList.rows.length === 0) {
      console.log('⚠️  No functions found. The validation might be in a trigger or RLS policy.\n');
      
      // Check for triggers
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
      
      console.log(`Found ${triggers.rows.length} trigger(s). Listing all:\n`);
      triggers.rows.forEach(t => {
        console.log(`  • ${t.trigger_name} on ${t.table_name} (function: ${t.function_name})`);
      });
      
      return;
    }
    
    // Now try to get function definitions
    console.log('Checking function definitions for tenant validation...\n');
    const tenantFunctions = [];
    
    for (const func of funcList.rows) {
      try {
        // Get function source
        const defResult = await client.query('SELECT pg_get_functiondef($1) AS definition', [func.oid]);
        const definition = defResult.rows[0]?.definition || '';
        const lowerDef = definition.toLowerCase();
        
        // Check for tenant validation patterns
        if (lowerDef.includes('tenant') && (
          lowerDef.includes('user not found') ||
          lowerDef.includes('raise') && (lowerDef.includes('exception') || lowerDef.includes('error'))
        )) {
          tenantFunctions.push({
            name: func.function_name,
            schema: func.schema_name,
            definition: definition
          });
          console.log(`✅ Found tenant function: ${func.schema_name}.${func.function_name}`);
        }
      } catch (e) {
        // If we get "Tenant or user not found" error, this function might BE the validation
        if (e.message && e.message.includes('Tenant or user not found')) {
          console.log(`⚠️  ${func.function_name} - Error getting definition (might be the validation function itself)`);
          // Try to get it anyway by querying pg_proc directly
          try {
            const altResult = await client.query(`
              SELECT prosrc AS source_code
              FROM pg_proc
              WHERE oid = $1
            `, [func.oid]);
            const source = altResult.rows[0]?.source_code || '';
            if (source.toLowerCase().includes('tenant')) {
              tenantFunctions.push({
                name: func.function_name,
                schema: func.schema_name,
                definition: `-- Source code from pg_proc.prosrc:\n${source}`
              });
              console.log(`   ✅ Added based on prosrc`);
            }
          } catch (e2) {
            // Skip
          }
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
      console.log('\n⚠️  No tenant validation functions found in function definitions.');
      console.log('   The validation might be:');
      console.log('   - A trigger function');
      console.log('   - An RLS (Row Level Security) policy');
      console.log('   - A database-level setting\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code) console.error('   Code:', error.code);
    if (error.severity) console.error('   Severity:', error.severity);
    
    // If we get the tenant error, try to at least list functions without getting definitions
    if (error.message && error.message.includes('Tenant or user not found')) {
      console.log('\n💡 Got tenant error. Trying alternative approach...\n');
      try {
        // Try querying pg_proc.prosrc directly (source code)
        const altQuery = await client.query(`
          SELECT 
            p.proname AS function_name,
            n.nspname AS schema_name,
            p.prosrc AS source_code
          FROM pg_proc p
          JOIN pg_namespace n ON p.pronamespace = n.oid
          WHERE n.nspname = 'public'
          AND p.prosrc ILIKE '%tenant%'
        `);
        
        if (altQuery.rows.length > 0) {
          console.log(`✅ Found ${altQuery.rows.length} function(s) with 'tenant' in source:\n`);
          altQuery.rows.forEach(func => {
            console.log(`  • ${func.schema_name}.${func.function_name}`);
            console.log(`    Source: ${func.source_code.substring(0, 100)}...\n`);
          });
        }
      } catch (e) {
        console.log('   Alternative approach also failed');
      }
    }
  } finally {
    await client.end();
  }
}

findTenantFunction();

