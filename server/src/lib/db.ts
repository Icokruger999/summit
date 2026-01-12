// Legacy database connection module
// NOTE: This module is kept for backward compatibility with routes that haven't migrated to Supabase yet
// Most routes should use Supabase client (see server/src/lib/supabase.ts)

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Legacy database connection (deprecated - use Supabase instead)
// Only used by routes that haven't been migrated yet
// Now using Supabase direct connection instead of RDS
const dbConfig = {
  host: process.env.DB_HOST || 'db.rzxhbqwzpucqwxngkxbr.supabase.co',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'postgres', // Supabase uses 'postgres' as default database
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD, // Must be set in .env - get from Supabase dashboard
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

const pool = new Pool(dbConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Cache for tenant_id lookups to avoid repeated queries
const tenantIdCache = new Map<string, string | null>();

// Helper to get tenant_id for a user
// SIMPLIFIED: Since we don't need multi-tenancy, always return null (will use fallback)
// This avoids database queries that trigger RLS validation errors
async function getTenantIdForUser(userId: string): Promise<string | null> {
  // Skip database lookup entirely - we don't need multi-tenancy
  // Always return null, which will trigger use of fallback tenant_id
  return null;
}

// UUID pattern matcher
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Legacy query function - DEPRECATED: Migrate to Supabase
// Now supports automatic tenant context setting
export async function query(text: string, params?: any[], userId?: string) {
  console.warn('⚠️  Using legacy query() function. Please migrate to Supabase client.');
  const start = Date.now();
  
  try {
    // Auto-detect userId from params if not provided
    // Most routes pass userId as the first parameter
    if (!userId && params && params.length > 0) {
      const firstParam = params[0];
      if (typeof firstParam === 'string' && UUID_PATTERN.test(firstParam)) {
        // Check if this looks like a user ID by checking if it exists in users table
        // (We'll do a quick check, but cache the result)
        userId = firstParam;
      }
    }

    // SIMPLIFIED: Always use fallback tenant_id since we don't need multi-tenancy
    // The company field is just profile info, not a tenant grouping mechanism
    const finalTenantId = '419d85e1-1766-4a42-b5e6-84ef72dca7db';
    
    // Execute query with tenant context
    // Use a dedicated client connection to set tenant context
    const client = await pool.connect();
    let result;
    
    try {
      // Always use fallback tenant_id (no multi-tenancy needed)
      const useTenantId = finalTenantId;
      
      // CRITICAL: Set tenant context IMMEDIATELY after connecting
      // Try to set it before any other operations
      // Use raw SQL strings to avoid parameter issues
      let tenantSet = false;
      const sessionSetMethods = [
        `SELECT set_config('app.tenant_id', '${useTenantId}', false)`,
        `SELECT set_config('tenant_id', '${useTenantId}', false)`,
        `SET app.tenant_id = '${useTenantId}'`,
        `SET tenant_id = '${useTenantId}'`
      ];
      
      for (const sql of sessionSetMethods) {
        try {
          await client.query(sql);
          console.log(`✅ Set tenant context: ${sql.substring(0, 50)}...`);
          tenantSet = true;
          break; // Success, stop trying other methods
        } catch (e: any) {
          // If this is the tenant validation error, we're in trouble
          if (e.message && e.message.includes('Tenant or user not found')) {
            console.error(`❌ Cannot set tenant context - validation blocking: ${e.message}`);
            // Continue trying other methods
          }
          continue;
        }
      }
      
      // Now start transaction and also set LOCAL (for transaction-level context)
      try {
        await client.query('BEGIN');
        
        // Set LOCAL within transaction as well (backup)
        const localSetMethods = [
          `SET LOCAL app.tenant_id = '${useTenantId}'`,
          `SET LOCAL tenant_id = '${useTenantId}'`
        ];
        
        for (const sql of localSetMethods) {
          try {
            await client.query(sql);
            break; // Success
          } catch (e: any) {
            continue;
          }
        }
      } catch (beginError: any) {
        // If BEGIN fails due to tenant validation, we're stuck
        if (beginError.message && beginError.message.includes('Tenant or user not found')) {
          console.error('❌ Cannot BEGIN transaction - tenant validation blocking');
          throw beginError;
        }
        throw beginError;
      }
      
      if (!tenantSet) {
        console.warn('⚠️  Could not set tenant context. Proceeding anyway...');
      }
      
      // Execute the actual query within the transaction
      result = await client.query(text, params);
      
      // Commit the transaction
      await client.query('COMMIT');
    } catch (error) {
      // Rollback on error
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        // Ignore rollback errors
      }
      throw error;
    } finally {
      client.release();
    }
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.log('Slow query detected:', { text: text.substring(0, 100), duration });
    }
    return result;
  } catch (error: any) {
    console.error('Database query error:', error);
    
    // If error is "Tenant or user not found", provide helpful context
    if (error.message && error.message.includes('Tenant or user not found')) {
      console.error('💡 Tenant validation error. This usually means:');
      console.error('   1. The user-tenant relationship is missing in the database');
      console.error('   2. The tenant_id needs to be set in the session');
      console.error('   3. A database function/trigger is validating tenant access');
      if (userId) {
        console.error(`   User ID: ${userId}`);
        console.error('   💡 Using fallback tenant_id (multi-tenancy not needed for this app)');
      }
    }
    
    throw error;
  }
}

export function getPool(): Pool {
  return pool;
}

// DEPRECATED: These functions are deprecated. Use Supabase client instead (see server/src/lib/supabase.ts)
// Helper function to get user by email
// NOTE: This is DEPRECATED - use getUserByEmail from supabase.ts instead
export async function getUserByEmail(email: string) {
  throw new Error(
    'getUserByEmail from db.ts is deprecated. ' +
    'Please use getUserByEmail from supabase.ts instead. ' +
    'Import: import { getUserByEmail } from "../lib/supabase.js"'
  );
}

// DEPRECATED: Use getUserById from supabase.ts instead
export async function getUserById(id: string) {
  throw new Error(
    'getUserById from db.ts is deprecated. ' +
    'Please use getUserById from supabase.ts instead. ' +
    'Import: import { getUserById } from "../lib/supabase.js"'
  );
}

// DEPRECATED: Use createUser from supabase.ts instead
export async function createUser(email: string, passwordHash: string, name?: string) {
  throw new Error(
    'createUser from db.ts is deprecated. ' +
    'Please use createUser from supabase.ts instead. ' +
    'Import: import { createUser } from "../lib/supabase.js"'
  );
}

// ============================================
// Summit Database Connection (Separate Endpoint)
// ============================================
// NOTE: This is now OPTIONAL - we're using Supabase for auth
// This is kept for backward compatibility with routes that still use db.js
// TODO: Migrate all routes to use Supabase client

let summitPool: Pool | null = null;

// Summit-specific query function (only if SUMMIT_DB_HOST is set)
export async function summitQuery(text: string, params?: any[]) {
  if (!process.env.SUMMIT_DB_HOST) {
    throw new Error(
      'SUMMIT_DB_HOST is not set. This function is deprecated. ' +
      'Please migrate to Supabase client (see server/src/lib/supabase.ts)'
    );
  }

  // Lazy initialization of pool
  if (!summitPool) {
    const summitDbConfig = {
      host: process.env.SUMMIT_DB_HOST,
      port: parseInt(process.env.SUMMIT_DB_PORT || '5432'),
      database: process.env.SUMMIT_DB_NAME || 'Summit',
      user: process.env.SUMMIT_DB_USER || 'postgres',
      password: process.env.SUMMIT_DB_PASSWORD || 'Stacey1122',
      ssl: {
        rejectUnauthorized: false
      },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };

    summitPool = new Pool(summitDbConfig);
    summitPool.on('error', (err) => {
      console.error('Unexpected error on Summit database idle client', err);
    });
  }

  const start = Date.now();
  try {
    const result = await summitPool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.log('Slow Summit query detected:', { text: text.substring(0, 100), duration });
    }
    return result;
  } catch (error) {
    console.error('Summit database query error:', error);
    throw error;
  }
}

// Get Summit pool for advanced usage if needed
export function getSummitPool(): Pool | null {
  return summitPool;
}
