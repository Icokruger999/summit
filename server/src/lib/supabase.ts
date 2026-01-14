// Supabase Database Client - DISABLED
// All database connections have been removed

export const supabase = null;

export async function query(text: string, params?: any[]) {
  throw new Error('Database connections have been removed. No database operations are available.');
}

export async function getUserByEmail(email: string) {
  throw new Error('Database connections have been removed. No database operations are available.');
}

export async function getUserById(id: string) {
  throw new Error('Database connections have been removed. No database operations are available.');
}

export async function createUser(email: string, passwordHash: string, name?: string) {
  throw new Error('Database connections have been removed. No database operations are available.');
}

export default null;
