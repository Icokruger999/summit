// Database connection module
// Connects to PostgreSQL through PgBouncer (port 6432)

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Database connection configuration
// Connects through PgBouncer (port 6432) for connection pooling
const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '6432'), // PgBouncer port (NOT 5432 - direct Postgres)
  database: process.env.DB_NAME || 'summit',
  user: process.env.DB_USER || 'summit_user',
  password: process.env.DB_PASSWORD,
  max: 20, // Max connections in pool (should be <= PgBouncer default_pool_size)
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 10000,
  // Keep-alive settings to prevent EC2 network layer from killing connections
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000, // Send keep-alive after 10s of inactivity
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
  subscription_id?: string;
  trial_started_at?: Date;
  subscription_status?: 'trial' | 'active' | 'expired' | 'locked';
}

export interface Subscription {
  id: string;
  owner_id: string;
  tier: 'basic' | 'pack' | 'enterprise';
  status: 'active' | 'expired' | 'cancelled';
  max_users: number;
  created_at: Date;
  expires_at?: Date;
  payment_reference?: string;
}

// Get user by email (case-insensitive)
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    // Normalize email to lowercase for case-insensitive lookup
    const normalizedEmail = email.toLowerCase().trim();
    
    const result = await query(
      `SELECT id, email, name, avatar_url, password_hash, temp_password_hash, 
              requires_password_change, account_created_at, created_at, 
              company, job_title, phone, updated_at, subscription_id, 
              trial_started_at, subscription_status
       FROM users 
       WHERE LOWER(email) = $1`,
      [normalizedEmail]
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
              company, job_title, phone, updated_at, subscription_id, 
              trial_started_at, subscription_status
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
    // Normalize email to lowercase for case-insensitive storage
    const normalizedEmail = email.toLowerCase().trim();
    
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
      [normalizedEmail, name, tempPasswordHash, normalizedJobTitle, normalizedPhone, normalizedCompany]
    );
    
    return result.rows[0] as User;
  } catch (error: any) {
    console.error('Error creating user with temp password:', error);
    // Check if it's a unique constraint violation (duplicate email)
    if (error.code === '23505' || error.constraint === 'idx_users_email_lower' || error.constraint === 'users_email_key' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
      const duplicateError: any = new Error('User already exists');
      duplicateError.code = 'DUPLICATE_USER';
      throw duplicateError;
    }
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

// Reset temporary password for a user (for resending email)
export async function resetTempPassword(email: string, tempPasswordHash: string): Promise<{ id: string; email: string; name: string }> {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    
    const result = await query(
      `UPDATE users 
       SET temp_password_hash = $1, 
           requires_password_change = true,
           password_hash = NULL,
           updated_at = NOW()
       WHERE LOWER(email) = $2
       RETURNING id, email, name`,
      [tempPasswordHash, normalizedEmail]
    );
    
    if (result.rows.length === 0) {
      throw new Error('User not found');
    }
    
    return result.rows[0];
  } catch (error: any) {
    console.error('Error resetting temp password:', error);
    throw error;
  }
}

// Start trial when user changes password
export async function startTrial(userId: string): Promise<void> {
  try {
    await query(
      `UPDATE users 
       SET trial_started_at = NOW(),
           subscription_status = 'trial'
       WHERE id = $1 AND trial_started_at IS NULL`,
      [userId]
    );
    console.log(`✅ Trial started for user ${userId}`);
  } catch (error: any) {
    console.error('Error starting trial:', error);
    throw error;
  }
}

// Get subscription status for user
export interface SubscriptionStatus {
  status: 'trial' | 'active' | 'expired' | 'locked';
  trial_started_at?: Date;
  hours_remaining?: number;
  subscription?: Subscription;
  is_owner?: boolean;
  current_users?: number;
  max_users?: number;
}

export async function getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  try {
    const userResult = await query(
      `SELECT subscription_id, trial_started_at, subscription_status
       FROM users 
       WHERE id = $1`,
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }
    
    const user = userResult.rows[0];
    const status = user.subscription_status || 'trial';
    
    // If user has a subscription, get subscription details
    if (user.subscription_id) {
      const subResult = await query(
        `SELECT s.*, 
                (SELECT COUNT(*) FROM users WHERE subscription_id = s.id) as current_users
         FROM subscriptions s
         WHERE s.id = $1`,
        [user.subscription_id]
      );
      
      if (subResult.rows.length > 0) {
        const sub = subResult.rows[0];
        return {
          status: sub.status === 'active' ? 'active' : 'expired',
          subscription: {
            id: sub.id,
            owner_id: sub.owner_id,
            tier: sub.tier,
            status: sub.status,
            max_users: sub.max_users,
            created_at: sub.created_at,
            expires_at: sub.expires_at,
            payment_reference: sub.payment_reference,
          },
          is_owner: sub.owner_id === userId,
          current_users: parseInt(sub.current_users) || 0,
          max_users: sub.max_users,
        };
      }
    }
    
    // Calculate trial hours remaining
    let hours_remaining: number | undefined;
    if (user.trial_started_at && status === 'trial') {
      const trialResult = await query(
        `SELECT EXTRACT(EPOCH FROM (NOW() - trial_started_at)) / 3600 as hours_elapsed
         FROM users
         WHERE id = $1`,
        [userId]
      );
      
      const hoursElapsed = parseFloat(trialResult.rows[0].hours_elapsed) || 0;
      hours_remaining = Math.max(0, 72 - hoursElapsed);
      
      // If trial expired, update status
      if (hours_remaining <= 0) {
        await query(
          `UPDATE users SET subscription_status = 'locked' WHERE id = $1`,
          [userId]
        );
        return {
          status: 'locked',
          trial_started_at: user.trial_started_at,
          hours_remaining: 0,
        };
      }
    }
    
    return {
      status: status as 'trial' | 'active' | 'expired' | 'locked',
      trial_started_at: user.trial_started_at,
      hours_remaining,
    };
  } catch (error: any) {
    console.error('Error getting subscription status:', error);
    throw error;
  }
}

// Check if trial has expired
export async function checkTrialExpired(userId: string): Promise<boolean> {
  try {
    const result = await query(
      `SELECT 
        CASE 
          WHEN trial_started_at IS NULL THEN false
          WHEN NOW() >= trial_started_at + INTERVAL '72 hours' THEN true
          ELSE false
        END as expired,
        subscription_status
       FROM users 
       WHERE id = $1`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      return true; // User not found, consider expired
    }
    
    const row = result.rows[0];
    
    // If already locked or expired, return true
    if (row.subscription_status === 'locked' || row.subscription_status === 'expired') {
      return true;
    }
    
    // If trial expired, update status
    if (row.expired && row.subscription_status === 'trial') {
      await query(
        `UPDATE users SET subscription_status = 'locked' WHERE id = $1`,
        [userId]
      );
      return true;
    }
    
    return row.expired;
  } catch (error: any) {
    console.error('Error checking trial expiration:', error);
    return true; // On error, assume expired for safety
  }
}

// Create subscription
export async function createSubscription(
  ownerId: string,
  tier: 'basic' | 'pack' | 'enterprise'
): Promise<Subscription> {
  try {
    const maxUsers = tier === 'basic' ? 1 : tier === 'pack' ? 5 : -1; // -1 for enterprise (unlimited)
    
    const result = await query(
      `INSERT INTO subscriptions (owner_id, tier, status, max_users)
       VALUES ($1, $2, 'active', $3)
       RETURNING *`,
      [ownerId, tier, maxUsers]
    );
    
    const sub = result.rows[0];
    
    // Link owner to subscription
    await query(
      `UPDATE users 
       SET subscription_id = $1, 
           subscription_status = 'active'
       WHERE id = $2`,
      [sub.id, ownerId]
    );
    
    return {
      id: sub.id,
      owner_id: sub.owner_id,
      tier: sub.tier,
      status: sub.status,
      max_users: sub.max_users,
      created_at: sub.created_at,
      expires_at: sub.expires_at,
      payment_reference: sub.payment_reference,
    };
  } catch (error: any) {
    console.error('Error creating subscription:', error);
    throw error;
  }
}

// Add user to subscription (for pack subscriptions)
export async function addUserToSubscription(
  subscriptionId: string,
  userId: string
): Promise<void> {
  try {
    // Check subscription exists and has space
    const subResult = await query(
      `SELECT s.*, 
              (SELECT COUNT(*) FROM users WHERE subscription_id = s.id) as current_users
       FROM subscriptions s
       WHERE s.id = $1 AND s.status = 'active'`,
      [subscriptionId]
    );
    
    if (subResult.rows.length === 0) {
      throw new Error('Subscription not found or inactive');
    }
    
    const sub = subResult.rows[0];
    const currentUsers = parseInt(sub.current_users) || 0;
    
    // Check if user limit reached (skip check for enterprise with max_users = -1)
    if (sub.max_users > 0 && currentUsers >= sub.max_users) {
      throw new Error(`Subscription limit reached (${sub.max_users} users)`);
    }
    
    // Check if user already in a subscription
    const userCheck = await query(
      `SELECT subscription_id FROM users WHERE id = $1`,
      [userId]
    );
    
    if (userCheck.rows.length > 0 && userCheck.rows[0].subscription_id) {
      throw new Error('User is already part of a subscription');
    }
    
    // Add user to subscription
    await query(
      `UPDATE users 
       SET subscription_id = $1, 
           subscription_status = 'active'
       WHERE id = $2`,
      [subscriptionId, userId]
    );
    
    console.log(`✅ Added user ${userId} to subscription ${subscriptionId}`);
  } catch (error: any) {
    console.error('Error adding user to subscription:', error);
    throw error;
  }
}

// Remove user from subscription
export async function removeUserFromSubscription(
  subscriptionId: string,
  userId: string
): Promise<void> {
  try {
    // Don't allow removing the owner
    const ownerCheck = await query(
      `SELECT owner_id FROM subscriptions WHERE id = $1`,
      [subscriptionId]
    );
    
    if (ownerCheck.rows.length > 0 && ownerCheck.rows[0].owner_id === userId) {
      throw new Error('Cannot remove subscription owner');
    }
    
    // Remove user from subscription
    await query(
      `UPDATE users 
       SET subscription_id = NULL, 
           subscription_status = 'locked'
       WHERE id = $1 AND subscription_id = $2`,
      [userId, subscriptionId]
    );
    
    console.log(`✅ Removed user ${userId} from subscription ${subscriptionId}`);
  } catch (error: any) {
    console.error('Error removing user from subscription:', error);
    throw error;
  }
}

// Get all users in a subscription
export async function getSubscriptionUsers(subscriptionId: string): Promise<User[]> {
  try {
    const result = await query(
      `SELECT id, email, name, avatar_url, company, job_title, phone, created_at
       FROM users 
       WHERE subscription_id = $1
       ORDER BY created_at ASC`,
      [subscriptionId]
    );
    
    return result.rows.map(row => ({
      id: row.id,
      email: row.email,
      name: row.name,
      avatar_url: row.avatar_url,
      company: row.company,
      job_title: row.job_title,
      phone: row.phone,
      created_at: row.created_at,
    }));
  } catch (error: any) {
    console.error('Error getting subscription users:', error);
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
