# Supabase Setup Instructions

## Quick Setup

### 1. Get Service Role Key
- Go to: https://app.supabase.com/project/rzxhbqwzpucqwxngkxbr/settings/api
- Find "service_role" key (secret, starts with `eyJ...`)
- Copy it

### 2. Run Database Schema
- Go to: https://app.supabase.com/project/rzxhbqwzpucqwxngkxbr/sql/new
- Copy contents of `database/migrate-to-supabase.sql`
- Paste and click "Run"

### 3. Update Backend
Run: `.\update-backend-supabase-env.ps1`
- Enter service role key when prompted
- This will update backend .env on EC2

### 4. Restart Backend
The backend will automatically use Supabase once .env is updated.

## Your Supabase Details

- **Project URL**: https://rzxhbqwzpucqwxngkxbr.supabase.co
- **Publishable Key**: sb_publishable_pBlFj9RAM9mnmJ5rzBRxYw_jeTpt6ye
- **Service Role Key**: (Get from dashboard)

## Files Created

- `database/migrate-to-supabase.sql` - Database schema
- `server/src/lib/supabase.ts` - Supabase client
- `update-backend-supabase-env.ps1` - Update backend .env
- `run-supabase-schema.ps1` - Run schema (manual step needed)

