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
// Uses direct client connection to avoid recursion with query() function
async function getTenantIdForUser(userId: string): Promise<string | null> {
  // Check cache first
  if (tenantIdCache.has(userId)) {
    return tenantIdCache.get(userId) || null;
  }

  const client = await pool.connect();
  try {
    // Try to get tenant_id from user_tenants table (if it exists)
    try {
      const tenantResult = await client.query(`
        SELECT tenant_id 
        FROM user_tenants 
        WHERE user_id = $1 
        LIMIT 1
      `, [userId]);

      if (tenantResult.rows.length > 0) {
        const tenantId = tenantResult.rows[0].tenant_id;
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
        tenantIdCache.set(userId, tenantId);
        return tenantId;
      }
    } catch (e) {
      // Column might not exist, continue
    }

    // If no tenant found, cache null
    tenantIdCache.set(userId, null);
    return null;
  } catch (error) {
    // If tables don't exist, return null
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

    // Get tenant_id if userId is available
    let tenantId: string | null = null;
    if (userId) {
      tenantId = await getTenantIdForUser(userId);
    }

    // Execute query with tenant context if needed
    // For connection pooling, we need to set tenant_id in the same transaction
    let result;
    
    if (tenantId) {
      // Use a transaction to set LOCAL variable and execute query
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // Try different methods to set tenant context
        try {
          await client.query('SET LOCAL app.tenant_id = $1', [tenantId]);
        } catch (e1) {
          try {
            await client.query('SET LOCAL tenant_id = $1', [tenantId]);
          } catch (e2) {
            // If both fail, the database might not support LOCAL variables
            // or might use a different mechanism
          }
        }
        // Execute the actual query
        result = await client.query(text, params);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } else {
      // If no tenant_id found, try using the known tenant_id as fallback
      // This is a temporary workaround - you should fix the user-tenant relationship
      const knownTenantId = '419d85e1-1766-4a42-b5e6-84ef72dca7db';
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        try {
          await client.query('SET LOCAL app.tenant_id = $1', [knownTenantId]);
        } catch (e1) {
          try {
            await client.query('SET LOCAL tenant_id = $1', [knownTenantId]);
          } catch (e2) {
            // Continue without tenant context
          }
        }
        result = await client.query(text, params);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
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
