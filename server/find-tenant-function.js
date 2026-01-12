// Quick script to find tenant validation function
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
    
    // Find functions that throw "Tenant or user not found"
    const result = await client.query(`
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
    
    if (result.rows.length === 0) {
      console.log('⚠️  No functions found with "Tenant or user not found"');
      console.log('\n🔍 Checking for triggers...\n');
      
      const triggers = await client.query(`
        SELECT 
          t.tgname AS trigger_name,
          c.relname AS table_name,
          p.proname AS function_name,
          pg_get_functiondef(p.oid) AS function_definition
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_proc p ON t.tgfoid = p.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public'
        AND t.tgname NOT LIKE 'pg_%'
        AND pg_get_functiondef(p.oid) ILIKE '%tenant%'
      `);
      
      if (triggers.rows.length > 0) {
        console.log(`✅ Found ${triggers.rows.length} trigger(s):\n`);
        triggers.rows.forEach(row => {
          console.log(`Trigger: ${row.trigger_name}`);
          console.log(`Table: ${row.table_name}`);
          console.log(`Function: ${row.function_name}`);
          console.log(`\nFunction definition:\n${row.function_definition}`);
          console.log('\n' + '='.repeat(60) + '\n');
        });
      } else {
        console.log('⚠️  No tenant-related triggers found');
      }
    } else {
      console.log(`✅ Found ${result.rows.length} function(s):\n`);
      
      result.rows.forEach((func, index) => {
        console.log(`${index + 1}. Function: ${func.schema_name}.${func.function_name}`);
        console.log('\nDefinition:');
        console.log('─'.repeat(60));
        console.log(func.function_definition);
        console.log('─'.repeat(60));
        console.log(`\n💡 To remove: DROP FUNCTION IF EXISTS ${func.schema_name}.${func.function_name}() CASCADE;\n`);
      });
    }
    
    // Also check for functions using session variables
    const sessionVarResult = await client.query(`
      SELECT 
        p.proname AS function_name,
        n.nspname AS schema_name
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE pg_get_functiondef(p.oid) ILIKE '%current_setting%tenant%'
      OR pg_get_functiondef(p.oid) ILIKE '%app.tenant_id%'
    `);
    
    if (sessionVarResult.rows.length > 0) {
      console.log('\n📋 Functions using tenant session variables:');
      sessionVarResult.rows.forEach(func => {
        console.log(`   • ${func.schema_name}.${func.function_name}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code) console.error('   Code:', error.code);
  } finally {
    client.release();
    await pool.end();
  }
}

findTenantFunction();

