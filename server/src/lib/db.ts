// Database connection module
// Connects to PostgreSQL through PgBouncer (port 6432)

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Database connection configuration
// Connects through PgBouncer (port 6432) for connection pooling
const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '6432'), // PgBouncer port
  database: process.env.DB_NAME || 'summit',
  user: process.env.DB_USER || 'summit_user',
  password: process.env.DB_PASSWORD,
  max: 20, // Max connections in pool (should be <= PgBouncer default_pool_size)
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

// Create connection pool
const pool = new Pool(dbConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
});

// Query function - executes SQL queries through the connection pool
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.log('Slow query detected:', { text: text.substring(0, 100), duration });
    }
    return result;
  } catch (error: any) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Get the connection pool (for advanced usage if needed)
export function getPool(): Pool {
  return pool;
}

// Legacy function for backward compatibility
// DEPRECATED: This function is kept for compatibility but should not be used
export async function summitQuery(text: string, params?: any[]) {
  console.warn('⚠️  summitQuery() is deprecated. Use query() instead.');
  return query(text, params);
}

// Get Summit pool (alias for getPool for backward compatibility)
export function getSummitPool(): Pool {
  return pool;
}

// User database functions
export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  password_hash?: string;
  temp_password_hash?: string;
  requires_password_change?: boolean;
  account_created_at?: Date;
  company?: string;
  job_title?: string;
  phone?: string;
  created_at?: Date;
  updated_at?: Date;
}

// Get user by email
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const result = await query(
      `SELECT id, email, name, avatar_url, password_hash, temp_password_hash, 
              requires_password_change, account_created_at, created_at, 
              company, job_title, phone, updated_at
       FROM users 
       WHERE email = $1`,
      [email]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0] as User;
  } catch (error: any) {
    console.error('Error getting user by email:', error);
    throw error;
  }
}

// Get user by ID
export async function getUserById(id: string): Promise<User | null> {
  try {
    const result = await query(
      `SELECT id, email, name, avatar_url, password_hash, temp_password_hash, 
              requires_password_change, account_created_at, created_at, 
              company, job_title, phone, updated_at
       FROM users 
       WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0] as User;
  } catch (error: any) {
    console.error('Error getting user by id:', error);
    throw error;
  }
}

// Create user with temporary password
export async function createUserWithTempPassword(
  email: string,
  name: string,
  tempPasswordHash: string,
  jobTitle?: string,
  phone?: string,
  company?: string
): Promise<User> {
  try {
    // Normalize optional fields - allow "N/A" as valid input
    const normalizedJobTitle = (!jobTitle || jobTitle.trim() === '' || jobTitle.trim().toUpperCase() === 'N/A') 
      ? null 
      : jobTitle.trim();
    const normalizedPhone = (!phone || phone.trim() === '' || phone.trim().toUpperCase() === 'N/A') 
      ? null 
      : phone.trim();
    const normalizedCompany = (!company || company.trim() === '' || company.trim().toUpperCase() === 'N/A') 
      ? null 
      : company.trim();
    
    const result = await query(
      `INSERT INTO users (email, name, temp_password_hash, requires_password_change, 
                         account_created_at, job_title, phone, company)
       VALUES ($1, $2, $3, true, NOW(), $4, $5, $6)
       RETURNING id, email, name, avatar_url, password_hash, temp_password_hash, 
                 requires_password_change, account_created_at, created_at, 
                 company, job_title, phone, updated_at`,
      [email, name, tempPasswordHash, normalizedJobTitle, normalizedPhone, normalizedCompany]
    );
    
    return result.rows[0] as User;
  } catch (error: any) {
    console.error('Error creating user with temp password:', error);
    throw error;
  }
}

// Update user password (clear temp password and set permanent password)
export async function updateUserPassword(
  userId: string,
  newPasswordHash: string
): Promise<void> {
  try {
    await query(
      `UPDATE users 
       SET password_hash = $1, 
           temp_password_hash = NULL, 
           requires_password_change = false,
           updated_at = NOW()
       WHERE id = $2`,
      [newPasswordHash, userId]
    );
  } catch (error: any) {
    console.error('Error updating user password:', error);
    throw error;
  }
}

// Delete expired accounts (older than 24 hours with requires_password_change=true)
export async function deleteExpiredAccounts(): Promise<number> {
  try {
    const result = await query(
      `DELETE FROM users 
       WHERE requires_password_change = true 
       AND account_created_at < NOW() - INTERVAL '24 hours'
       RETURNING id`
    );
    
    const deletedCount = result.rows.length;
    if (deletedCount > 0) {
      console.log(`Deleted ${deletedCount} expired account(s)`);
    }
    
    return deletedCount;
  } catch (error: any) {
    console.error('Error deleting expired accounts:', error);
    throw error;
  }
}
