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

// Helper function to get user by email (optimized with indexed lookup)
// Note: Uses Summit database (SUMMIT_DB_HOST) for authentication
// This assumes email column has a unique index. If using case-insensitive, 
// consider creating a functional index: CREATE UNIQUE INDEX users_email_lower_idx ON users (LOWER(email));
export async function getUserByEmail(email: string) {
  const normalizedEmail = email.toLowerCase().trim();
  // Optimized: Use indexed column directly if email is stored lowercase, or use functional index
  // Select only needed columns instead of SELECT *
  const result = await summitQuery(
    'SELECT id, email, password_hash, name, avatar_url, company, job_title, phone, created_at, updated_at FROM users WHERE LOWER(email) = $1',
    [normalizedEmail]
  );
  return result.rows[0] || null;
}

// Helper function to get user by ID (optimized - select only needed columns)
// Note: Uses Summit database (SUMMIT_DB_HOST) for authentication
export async function getUserById(id: string) {
  const result = await summitQuery(
    'SELECT id, email, password_hash, name, avatar_url, company, job_title, phone, created_at, updated_at FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

// Helper function to create user
// Note: Uses Summit database (SUMMIT_DB_HOST) for authentication
export async function createUser(email: string, passwordHash: string, name?: string) {
  const normalizedEmail = email.toLowerCase().trim();
  const result = await summitQuery(
    'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, avatar_url, created_at',
    [normalizedEmail, passwordHash, name || null]
  );
  return result.rows[0];
}

// ============================================
// Summit Database Connection (Separate Endpoint)
// ============================================
// Summit uses its own database endpoint configuration
// This allows Summit to have a separate RDS instance/database
// REQUIRED: Set SUMMIT_DB_HOST environment variable with the new Summit database endpoint

if (!process.env.SUMMIT_DB_HOST) {
  throw new Error(
    'SUMMIT_DB_HOST environment variable is required. ' +
    'Please set SUMMIT_DB_HOST to your new Summit database endpoint. ' +
    'Example: SUMMIT_DB_HOST=your-new-summit-endpoint.rds.amazonaws.com'
  );
}

const summitDbConfig = {
  host: process.env.SUMMIT_DB_HOST,
  port: parseInt(process.env.SUMMIT_DB_PORT || '5432'),
  database: process.env.SUMMIT_DB_NAME || 'Summit',
  user: process.env.SUMMIT_DB_USER || 'postgres',
  password: process.env.SUMMIT_DB_PASSWORD || 'Stacey1122',
  ssl: {
    rejectUnauthorized: false
  },
  // Connection pool configuration for better performance
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection cannot be established
};

// Separate connection pool for Summit
const summitPool = new Pool(summitDbConfig);

summitPool.on('error', (err) => {
  console.error('Unexpected error on Summit database idle client', err);
});

// Summit-specific query function
export async function summitQuery(text: string, params?: any[]) {
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
export function getSummitPool(): Pool {
  return summitPool;
}
