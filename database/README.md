# Summit Database Schema

## Database Connection

- **Host**: codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com
- **Port**: 5432
- **Database**: Summit
- **Username**: postgres
- **Password**: Stacey1122
- **SSL**: Required (enabled in connection)

## Tables Created

### 1. `users`
User accounts and profiles.

**Columns:**
- `id` (UUID, Primary Key) - Auto-generated UUID
- `email` (TEXT, Unique, Not Null) - User email address
- `name` (TEXT) - User's display name
- `avatar_url` (TEXT) - URL to user's avatar image
- `password_hash` (TEXT) - Hashed password (for local auth)
- `created_at` (TIMESTAMP) - Account creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp

**Indexes:**
- `idx_users_email` - Index on email for fast lookups

### 2. `meetings`
Scheduled meetings with optional recurrence.

**Columns:**
- `id` (UUID, Primary Key) - Auto-generated UUID
- `title` (TEXT, Not Null) - Meeting title
- `description` (TEXT) - Meeting description
- `start_time` (TIMESTAMP, Not Null) - Meeting start time
- `end_time` (TIMESTAMP, Not Null) - Meeting end time
- `room_id` (TEXT, Unique, Not Null) - LiveKit room identifier
- `created_by` (UUID, Foreign Key → users.id) - Meeting creator
- `recurrence` (JSONB) - Recurrence rules: `{enabled: boolean, days_of_week: [0-6]}`
  - Example: `{"enabled": true, "days_of_week": [1, 3, 5]}` for Mon, Wed, Fri
- `created_at` (TIMESTAMP) - Meeting creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp

**Indexes:**
- `idx_meetings_created_by` - Index on creator
- `idx_meetings_start_time` - Index on start time for queries
- `idx_meetings_room_id` - Index on room_id for lookups

### 3. `meeting_participants`
Many-to-many relationship between meetings and users.

**Columns:**
- `meeting_id` (UUID, Foreign Key → meetings.id) - Meeting reference
- `user_id` (UUID, Foreign Key → users.id) - User reference
- `status` (TEXT, Default: 'pending') - Participation status: 'pending', 'accepted', 'declined'
- `created_at` (TIMESTAMP) - Invitation timestamp

**Primary Key:** (`meeting_id`, `user_id`)

**Indexes:**
- `idx_meeting_participants_meeting_id` - Index on meeting
- `idx_meeting_participants_user_id` - Index on user

### 4. `meeting_invitations`
Meeting invitations with acceptance tracking.

**Columns:**
- `id` (UUID, Primary Key) - Auto-generated UUID
- `meeting_id` (UUID, Foreign Key → meetings.id) - Meeting reference
- `inviter_id` (UUID, Foreign Key → users.id) - User who sent invitation
- `invitee_id` (UUID, Foreign Key → users.id) - User who received invitation
- `status` (TEXT, Default: 'pending') - Invitation status: 'pending', 'accepted', 'declined'
- `created_at` (TIMESTAMP) - Invitation creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp

**Unique Constraint:** (`meeting_id`, `invitee_id`) - One invitation per meeting per user

**Indexes:**
- `idx_meeting_invitations_meeting_id` - Index on meeting
- `idx_meeting_invitations_invitee_id` - Index on invitee
- `idx_meeting_invitations_status` - Index on status for filtering

### 5. `attachments`
File attachment metadata.

**Columns:**
- `id` (UUID, Primary Key) - Auto-generated UUID
- `user_id` (UUID, Foreign Key → users.id) - User who uploaded file
- `file_name` (TEXT, Not Null) - Original file name
- `file_path` (TEXT, Not Null) - Storage path/URL
- `file_size` (BIGINT, Not Null) - File size in bytes
- `mime_type` (TEXT) - MIME type of file
- `chat_id` (TEXT) - Associated chat ID (if chat attachment)
- `meeting_id` (UUID, Foreign Key → meetings.id) - Associated meeting (if meeting attachment)
- `created_at` (TIMESTAMP) - Upload timestamp

**Indexes:**
- `idx_attachments_user_id` - Index on user
- `idx_attachments_chat_id` - Index on chat
- `idx_attachments_meeting_id` - Index on meeting

## Triggers

Automatic `updated_at` timestamp updates:
- `update_users_updated_at` - Updates `users.updated_at` on row update
- `update_meetings_updated_at` - Updates `meetings.updated_at` on row update
- `update_meeting_invitations_updated_at` - Updates `meeting_invitations.updated_at` on row update

## Setup

To recreate the database schema, run:

```bash
cd database
node setup.cjs
```

Or connect directly with psql:

```bash
psql -h codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com -p 5432 -U postgres -d Summit -f schema.sql
```

## Notes

- All UUIDs are auto-generated using `uuid_generate_v4()`
- Foreign keys use `ON DELETE CASCADE` to maintain referential integrity
- The `recurrence` field in `meetings` uses JSONB for flexible recurrence rules
- Chat messages are handled via LiveKit Data Channels (ephemeral), so no persistent table is needed
- The database uses UTC timestamps (`TIMESTAMP WITH TIME ZONE`)

