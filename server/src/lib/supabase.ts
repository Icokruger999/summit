// Supabase Database Client
// Replaces RDS PostgreSQL connection with Supabase

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Service role key for backend operations

// Don't throw on import - check when actually used
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('⚠️  WARNING: Supabase configuration missing!');
  console.error('   Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file.');
  console.error('   Get these from: https://app.supabase.com/project/_/settings/api');
  // Don't throw - let it fail when actually used so we can see better error messages
}

// Create Supabase client with service role key (bypasses RLS for backend operations)
// Only create if credentials are available
export const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// Helper function to execute raw SQL queries (when needed)
// Note: Supabase uses PostgREST, so prefer using the client methods when possible
export async function query(text: string, params?: any[]) {
  // For complex queries, we can use Supabase's RPC (Remote Procedure Calls)
  // or use the PostgREST client methods
  // This is a fallback for raw SQL if absolutely needed
  
  // Most operations should use supabase.from('table').select() etc.
  // This function is kept for compatibility but should be replaced with Supabase methods
  console.warn('Using raw query - consider migrating to Supabase client methods');
  
  // For now, we'll need to use the Supabase REST API or RPC functions
  // This requires setting up database functions in Supabase
  throw new Error('Raw SQL queries not directly supported. Use Supabase client methods or create RPC functions.');
}

// Helper function to get user by email
export async function getUserByEmail(email: string) {
  if (!supabase) {
    throw new Error(
      'Supabase client not initialized! Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file.'
    );
  }
  
  const normalizedEmail = email.toLowerCase().trim();
  
  const { data, error } = await supabase
    .from('users')
    .select('id, email, password_hash, name, avatar_url, company, job_title, phone, created_at, updated_at')
    .eq('email', normalizedEmail)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    console.error('Error getting user by email:', error);
    throw error;
  }
  
  return data;
}

// Helper function to get user by ID
export async function getUserById(id: string) {
  if (!supabase) {
    throw new Error(
      'Supabase client not initialized! Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file.'
    );
  }
  
  const { data, error } = await supabase
    .from('users')
    .select('id, email, password_hash, name, avatar_url, company, job_title, phone, created_at, updated_at')
    .eq('id', id)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    console.error('Error getting user by ID:', error);
    throw error;
  }
  
  return data;
}

// Helper function to create user
export async function createUser(email: string, passwordHash: string, name?: string) {
  if (!supabase) {
    throw new Error(
      'Supabase client not initialized! Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file.'
    );
  }
  
  const normalizedEmail = email.toLowerCase().trim();
  
  const { data, error } = await supabase
    .from('users')
    .insert({
      email: normalizedEmail,
      password_hash: passwordHash,
      name: name || null
    })
    .select('id, email, name, avatar_url, created_at')
    .single();
  
  if (error) {
    console.error('Error creating user:', error);
    throw error;
  }
  
  return data;
}

// Export supabase client for direct use in routes
export default supabase;

