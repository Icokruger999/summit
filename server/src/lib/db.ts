import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'Summit',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Stacey1122',
  ssl: {
    rejectUnauthorized: false
  },
  // Connection pool configuration for better performance
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection cannot be established
};

// Use connection pool instead of single client for better performance
const pool = new Pool(dbConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.log('Slow query detected:', { text: text.substring(0, 100), duration });
    }
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Get pool for advanced usage if needed
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
