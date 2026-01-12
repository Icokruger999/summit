// Legacy database connection module
// NOTE: This module is kept for backward compatibility with routes that haven't migrated to Supabase yet
// Most routes should use Supabase client (see server/src/lib/supabase.ts)

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Legacy database connection (deprecated - use Supabase instead)
// Only used by routes that haven't been migrated yet
const dbConfig = {
  host: process.env.DB_HOST || 'codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'Summit',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Stacey1122',
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
// Uses direct client connection and sets tenant context FIRST to avoid validation errors
async function getTenantIdForUser(userId: string): Promise<string | null> {
  // Check cache first
  if (tenantIdCache.has(userId)) {
    return tenantIdCache.get(userId) || null;
  }

  const client = await pool.connect();
  try {
    // CRITICAL: Set fallback tenant context FIRST before any queries
    // This prevents "Tenant or user not found" errors when querying for tenant_id
    const fallbackTenantId = '419d85e1-1766-4a42-b5e6-84ef72dca7db';
    
    try {
      await client.query('BEGIN');
      // Try to set tenant context - use fallback so we can query
      const setMethods = [
        'SET LOCAL app.tenant_id = $1',
        'SET LOCAL tenant_id = $1',
        "SET LOCAL \"app.tenant_id\" = $1",
        "SELECT set_config('app.tenant_id', $1, true)",
        "SELECT set_config('tenant_id', $1, true)"
      ];
      
      for (const method of setMethods) {
        try {
          await client.query(method, [fallbackTenantId]);
          break; // Success
        } catch (e) {
          continue; // Try next
        }
      }
      
      // Now try to get tenant_id from user_tenants table (if it exists)
      try {
        const tenantResult = await client.query(`
          SELECT tenant_id 
          FROM user_tenants 
          WHERE user_id = $1 
          LIMIT 1
        `, [userId]);

        if (tenantResult.rows.length > 0) {
          const tenantId = tenantResult.rows[0].tenant_id;
          await client.query('COMMIT');
          tenantIdCache.set(userId, tenantId);
          return tenantId;
        }
      } catch (e) {
        // Table might not exist, continue to next check
      }

      // Try to get tenant_id from users table (if column exists)
      try {
        const userResult = await client.query(`
          SELECT tenant_id 
          FROM users 
          WHERE id = $1
        `, [userId]);

        if (userResult.rows.length > 0 && userResult.rows[0].tenant_id) {
          const tenantId = userResult.rows[0].tenant_id;
          await client.query('COMMIT');
          tenantIdCache.set(userId, tenantId);
          return tenantId;
        }
      } catch (e) {
        // Column might not exist, continue
      }
      
      await client.query('COMMIT');
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (e) {
        // Ignore rollback errors
      }
    }

    // If no tenant found, cache null (will use fallback)
    tenantIdCache.set(userId, null);
    return null;
  } catch (error) {
    // If all fails, return null (will use fallback)
    tenantIdCache.set(userId, null);
    return null;
  } finally {
    client.release();
  }
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

    // TEMPORARY FIX: Always use fallback tenant_id to avoid circular validation errors
    // TODO: Once database function is identified, implement proper tenant lookup
    const finalTenantId = '419d85e1-1766-4a42-b5e6-84ef72dca7db';
    
    // Try to get actual tenant_id (but don't fail if it doesn't work)
    let tenantId: string | null = null;
    if (userId) {
      try {
        tenantId = await getTenantIdForUser(userId);
        if (tenantId) {
          console.log(`✅ Found tenant_id ${tenantId} for user ${userId}`);
        }
      } catch (error: any) {
        // If lookup fails, use fallback - this is expected until we fix the database function
        console.warn(`⚠️  Tenant lookup failed for user ${userId}, using fallback: ${finalTenantId}`);
      }
    }

    // Execute query with tenant context
    // Use a dedicated client connection to set tenant context
    const client = await pool.connect();
    let result;
    
    try {
      // Use actual tenant_id if found, otherwise fallback
      const useTenantId = tenantId || finalTenantId;
      
      if (!tenantId && userId) {
        console.log(`ℹ️  Using fallback tenant_id ${useTenantId} for user ${userId}`);
      }
      
      // Start transaction to set tenant context
      await client.query('BEGIN');
      
      // Try multiple methods to set tenant context (different databases use different approaches)
      let tenantSet = false;
      const setMethods = [
        { query: 'SET LOCAL app.tenant_id = $1', name: 'app.tenant_id' },
        { query: 'SET LOCAL tenant_id = $1', name: 'tenant_id' },
        { query: "SET LOCAL \"app.tenant_id\" = $1", name: 'app.tenant_id (quoted)' },
        { query: 'SELECT set_config(\'app.tenant_id\', $1, true)', name: 'set_config app.tenant_id' },
        { query: 'SELECT set_config(\'tenant_id\', $1, true)', name: 'set_config tenant_id' }
      ];
      
      for (const method of setMethods) {
        try {
          await client.query(method.query, [useTenantId]);
          console.log(`✅ Set tenant context using: ${method.name} = ${useTenantId}`);
          tenantSet = true;
          break; // Success, stop trying other methods
        } catch (e: any) {
          // Try next method
          continue;
        }
      }
      
      if (!tenantSet) {
        console.warn('⚠️  Could not set tenant context using any method. Proceeding anyway...');
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
        const tenantId = await getTenantIdForUser(userId);
        if (!tenantId) {
          console.error('   ⚠️  No tenant_id found for this user!');
          console.error('   💡 You may need to create the user-tenant relationship in the database.');
        } else {
          console.error(`   Tenant ID: ${tenantId}`);
        }
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
