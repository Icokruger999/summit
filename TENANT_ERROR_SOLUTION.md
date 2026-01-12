# "Tenant or user not found" Error - Solution Guide

## Problem
You're getting a 500 Internal Server Error with message "Tenant or user not found" (PostgreSQL error code XX000). The error occurs in `server/src/lib/db.ts` during query execution, even though you've verified the user and tenant exist in the database.

## Root Cause
This error is **NOT in your codebase** - it's coming from a **database-level function, trigger, or RLS policy** that validates tenant/user relationships. The error code XX000 indicates a PostgreSQL internal exception.

## Diagnosis Steps

### Step 1: Run the Diagnostic Script
```bash
cd database
node diagnose-tenant-error.cjs
```

This will:
- Check for tenant-related tables
- Find database functions that might throw this error
- Check for triggers and RLS policies
- Verify user-tenant relationships
- Identify what's missing

### Step 2: Query Database Directly
Run this SQL in your database to find the source:

```sql
-- Find functions that might throw the error
SELECT 
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND pg_get_functiondef(p.oid) ILIKE '%Tenant or user not found%'
OR pg_get_functiondef(p.oid) ILIKE '%tenant%user%not%found%';
```

Or use the SQL file:
```bash
# Run in your database
psql -h your-host -U postgres -d Summit -f database/find-tenant-error.sql
```

## Common Solutions

### Solution 1: Set Tenant Context in Session
If your database functions expect `app.tenant_id` to be set, modify `server/src/lib/db.ts`:

```typescript
export async function query(text: string, params?: any[], tenantId?: string) {
  console.warn('⚠️  Using legacy query() function. Please migrate to Supabase client.');
  const start = Date.now();
  try {
    // Set tenant context if provided
    if (tenantId) {
      await pool.query('SET LOCAL app.tenant_id = $1', [tenantId]);
    }
    
    const result = await pool.query(text, params);
    // ... rest of function
  } catch (error) {
    // ... error handling
  }
}
```

### Solution 2: Ensure User-Tenant Relationship Exists
If there's a `user_tenants` or similar table, ensure the relationship exists:

```sql
-- Check if relationship exists
SELECT * FROM user_tenants 
WHERE user_id = '44718f1f-7d91-4506-baa8-9e78ca2a8d68' 
AND tenant_id = '419d85e1-1766-4a42-b5e6-84ef72dca7db';

-- If missing, create it:
INSERT INTO user_tenants (user_id, tenant_id) 
VALUES ('44718f1f-7d91-4506-baa8-9e78ca2a8d68', '419d85e1-1766-4a42-b5e6-84ef72dca7db');
```

### Solution 3: Get Tenant ID from User
If users have a `tenant_id` column, fetch it and pass it to queries:

```typescript
// In middleware/auth.ts or routes
const user = await getUserById(decoded.id);
const tenantId = user.tenant_id; // If this column exists

// Then pass tenantId to queries
await query('SELECT * FROM meetings WHERE ...', [params], tenantId);
```

### Solution 4: Modify Database Function
If you find the function throwing the error, you may need to:
1. Check its validation logic
2. Ensure it's checking the correct relationship
3. Update it to handle your use case

## Next Steps

1. **Run the diagnostic script** to identify the exact source
2. **Check your database schema** for:
   - `tenants` table
   - `user_tenants` or similar relationship table
   - Functions that validate tenant/user relationships
   - Triggers that run before queries
3. **Check PM2 logs** for the exact query that triggers the error
4. **Verify the user-tenant relationship** exists in the database

## Quick Fix (If You Know the Tenant ID)

If you know the tenant_id should be `419d85e1-1766-4a42-b5e6-84ef72dca7db`, you can temporarily modify `db.ts` to set it:

```typescript
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    // TEMPORARY: Set tenant context
    await pool.query("SET LOCAL app.tenant_id = '419d85e1-1766-4a42-b5e6-84ef72dca7db'");
    
    const result = await pool.query(text, params);
    // ... rest
  } catch (error) {
    // ... error handling
  }
}
```

**⚠️ This is a temporary workaround. You should find the root cause and fix it properly.**

## Files Created

- `database/diagnose-tenant-error.cjs` - Diagnostic script
- `database/find-tenant-error.sql` - SQL queries to find the error source
- This guide

Run the diagnostic script first to get specific information about your database setup!

